/* -------------------------------------------------------------------------- */
/*                            Transaction Utilities                           */
/* -------------------------------------------------------------------------- */

import { err, Ok, ok } from 'neverthrow';

import {
    IAssetReceipt,
    IAssetToken,
    ICreateTransaction,
    ICreateTxIn,
    ICreateTxPayload,
    IDdeValues,
    IErrorInternal,
    IFetchBalanceResponse,
    IKeypair,
    IResult,
    ITxOut,
} from '../interfaces';
import {
    addLhsAssetToRhsAsset,
    assetsAreCompatible,
    getStringBytes,
    initIAssetReceipt,
    initIAssetToken,
    isOfType,
    lhsAssetIsGreaterThanRhsAsset,
    lhsAssetIsLessThanRhsAsset,
    subRhsAssetFromLhsAsset,
} from '../utils';
import { ZNP_NETWORK_VERSION } from './constants';
import { getAddressVersion } from './key.mgmt';
import { constructSignature, constructTxInSignableData } from './script.mgmt';

/* -------------------------------------------------------------------------- */
/*                          Transaction Construction                          */
/* -------------------------------------------------------------------------- */

export type IGetInputsResult = {
    inputs: ICreateTxIn[];
    totalAmountGathered: IAssetToken | IAssetReceipt;
    usedAddresses: string[];
    depletedAddresses: string[];
};

/**
 * Gather `TxIn` (input) values for a transaction
 *
 * @export
 * @param {(IAssetToken | IAssetReceipt)} paymentAsset - Required payment asset to gather inputs for
 * @param {IFetchBalanceResponse} fetchBalanceResponse - Balance as received from the network
 * @param {Map<string, IKeypair>} allKeypairs - A map of all existing key-pairs owned by the sender
 * @return {*}  {(IResult<[string[], IAssetToken | IAssetReceipt, ICreateTxIn[]]>)}
 */
export function getInputsForTx(
    paymentAsset: IAssetToken | IAssetReceipt,
    fetchBalanceResponse: IFetchBalanceResponse,
    allKeypairs: Map<string, IKeypair>,
): IResult<IGetInputsResult> {
    // Check to see if there's enough funds
    const isOfTypeAssetToken = isOfType<IAssetToken>(paymentAsset, initIAssetToken());
    const enoughRunningTotal = isOfTypeAssetToken
        ? paymentAsset.Token <= fetchBalanceResponse.total.tokens
        : paymentAsset.Receipt.amount <=
          fetchBalanceResponse.total.receipts[paymentAsset.Receipt.drs_tx_hash];

    if (enoughRunningTotal) {
        // Initialize the total amount gathered; apply DRS transaction hash where required
        let totalAmountGathered: IAssetToken | IAssetReceipt = isOfTypeAssetToken
            ? initIAssetToken()
            : initIAssetReceipt({
                  Receipt: { amount: 0, drs_tx_hash: paymentAsset.Receipt.drs_tx_hash },
              });
        // A list of all addresses used to gather inputs
        const usedAddresses: string[] = [];
        // A list of all addresses which no longer contain usable assets after this transaction is created
        const depletedAddresses: string[] = [];
        const inputs = Object.entries(fetchBalanceResponse.address_list).map(
            ([address, outPoints]) => {
                const ICreateTxIn: ICreateTxIn[] = [];
                const keyPair = allKeypairs.get(address);
                if (!keyPair) return err(IErrorInternal.UnableToGetKeypair);
                // Total amount of outpoints we've used that belong to this address
                let usedOutpointsCount = 0;
                outPoints.forEach(({ out_point, value }) => {
                    const lhsAssetIsLess = lhsAssetIsLessThanRhsAsset(
                        totalAmountGathered,
                        paymentAsset,
                    );
                    if (lhsAssetIsLess.isErr()) return err(lhsAssetIsLess.error);
                    // Ensure that the assets are compatible
                    const assetsCompatible = assetsAreCompatible(paymentAsset, value);
                    if (lhsAssetIsLess.value && assetsCompatible) {
                        // Construct signature data
                        const signableData = constructTxInSignableData(out_point);
                        if (signableData === null)
                            return err(IErrorInternal.UnableToConstructSignature);

                        // Check correct signature
                        const signature = constructSignature(
                            getStringBytes(signableData),
                            keyPair.secretKey,
                        );
                        if (signature.isErr()) return err(signature.error);

                        // Check for correct address version
                        const addressVersion = getAddressVersion(keyPair.publicKey, address);
                        if (addressVersion.isErr()) return err(addressVersion.error);

                        // Create script value for outpoint
                        const ICreateTxInScript = {
                            Pay2PkH: {
                                signable_data: signableData || '',
                                signature: signature.value,
                                public_key: Buffer.from(keyPair.publicKey).toString('hex'),
                                address_version: addressVersion.value,
                            },
                        };

                        // Push the used outpoint and its corresponding script
                        ICreateTxIn.push({
                            previous_out: out_point,
                            script_signature: ICreateTxInScript,
                        });

                        // Update the amount gathered and used addresses
                        const assetAddition = addLhsAssetToRhsAsset(value, totalAmountGathered);
                        if (assetAddition.isErr()) return err(assetAddition.error);
                        totalAmountGathered = assetAddition.value;

                        // Update addresses that have been used to gather inputs
                        if (!usedAddresses.includes(address)) usedAddresses.push(address);

                        usedOutpointsCount++;
                        if (outPoints.length == usedOutpointsCount) {
                            // We have used all of the inputs this address has to offer,
                            // so we can add this address to the used addresses list
                            depletedAddresses.push(address);
                        }
                    }
                    return ok([]);
                });
                return ok(ICreateTxIn);
            },
        );

        if (inputs.every((input) => input.isOk())) {
            const filteredInputs = inputs
                .filter((input): input is Ok<ICreateTxIn[], never> => !!input) /* Filter array */
                .reduce(
                    (accumulator: ICreateTxIn[], val) => accumulator.concat(val.value),
                    [],
                ) /* Flatten array */
                .filter((input): input is ICreateTxIn => !!input); /* Filter array */
            return ok({
                inputs: filteredInputs,
                totalAmountGathered,
                usedAddresses,
                depletedAddresses,
            } as IGetInputsResult);
        } else {
            //TODO: Change this to return an array of the errors that occured
            return err(IErrorInternal.InvalidInputs);
        }
    } else {
        return err(IErrorInternal.InsufficientFunds);
    }
}

/**
 * Base function used to create a transaction suitable for processing by a compute node
 *
 * @export
 * @param {string} paymentAddress - Address to make the payment to
 * @param {(IAssetToken | IAssetReceipt)} paymentAsset - The asset to send
 * @param {string} excessAddress - The address to send excess funds/assets to
 * @param {(IDdeValues | null)} druidInfo - DRUID information associated with this transaction
 * @param {([string[], IAssetToken | IAssetReceipt, ICreateTxIn[]])} txIns - `TxIn` values used in this transaction
 * @return {*}  {IResult<ICreateTxPayload>}
 */
export function createTx(
    paymentAddress: string,
    paymentAsset: IAssetToken | IAssetReceipt,
    excessAddress: string,
    druidInfo: IDdeValues | null,
    txIns: IGetInputsResult,
): IResult<ICreateTxPayload> {
    // Inputs obtained for payment from fetching the balance from the network
    // TODO: Do something with `depletedAddresses`
    const { usedAddresses, totalAmountGathered, inputs } = txIns;

    // If there are no inputs, then we can't create a transaction
    if (inputs.length === 0) {
        return err(IErrorInternal.NoInputs);
    }

    // TxOut to payment address
    const outputs: ITxOut[] = [
        {
            value: paymentAsset,
            locktime: 0,
            drs_block_hash: null,
            script_public_key: paymentAddress,
        },
    ];

    // If the total amount gathered is more than the amount requested,
    // then we need to create a change/excess `TxOut`
    const hasExcess = lhsAssetIsGreaterThanRhsAsset(totalAmountGathered, paymentAsset);
    if (hasExcess.isErr()) return err(hasExcess.error);
    else if (hasExcess.value) {
        const excessAmount = subRhsAssetFromLhsAsset(totalAmountGathered, paymentAsset);
        if (excessAmount.isErr()) return err(excessAmount.error);
        outputs.push({
            value: excessAmount.value,
            locktime: 0,
            drs_block_hash: null,
            script_public_key: excessAddress,
        });
    }

    // Create the transaction
    const createTransaction: ICreateTransaction = {
        inputs: inputs,
        outputs: outputs,
        version: ZNP_NETWORK_VERSION /* Always keep up to date with ZNP! */,
        druid_info: druidInfo,
    };

    // Value returned from function
    const returnValue: ICreateTxPayload = {
        createTx: createTransaction,
        excessAddressUsed: hasExcess.value,
        usedAddresses,
    };

    return ok(returnValue);
}

/**
 * Create a payment transaction
 *
 * @export
 * @param {string} paymentAddress - Address to make the payment to
 * @param {(IAssetToken | IAssetReceipt)} paymentAsset - The asset(s) to pay
 * @param {string} excessAddress - Address to assign excess asset(s) to
 * @param {IFetchBalanceResponse} fetchBalanceResponse - Balance as fetched from the network
 * @param {Map<string, IKeypair>} allKeypairs - A list of all existing key-pairs (encrypted)
 * @return {*}
 */
export function createPaymentTx(
    paymentAddress: string,
    paymentAsset: IAssetToken | IAssetReceipt,
    excessAddress: string,
    fetchBalanceResponse: IFetchBalanceResponse,
    allKeypairs: Map<string, IKeypair>,
): IResult<ICreateTxPayload> {
    // Gather inputs for the transaction
    const txIns = getInputsForTx(paymentAsset, fetchBalanceResponse, allKeypairs);
    if (txIns.isErr()) return err(txIns.error);

    // Create the transaction
    return createTx(paymentAddress, paymentAsset, excessAddress, null, txIns.value);
}
