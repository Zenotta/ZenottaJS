import { sha3_256 } from 'js-sha3';
import { err, ok } from 'neverthrow';
import nacl from 'tweetnacl';
import { v4 as uuidv4 } from 'uuid';

import {
    IAssetReceipt,
    IAssetToken,
    ICreateTxIn,
    IErrorInternal,
    IOutPoint,
    IResult,
    Script,
    StackEntry,
} from '../interfaces';
import { getHexStringBytes, getStringBytes, truncateByBytesUTF8 } from '../utils';
import { constructAddress } from './key.mgmt';
import { initIAssetToken, isOfType } from '../utils/interface.utils';

/* -------------------------------------------------------------------------- */
/*                            Transaction Utilities                           */
/* -------------------------------------------------------------------------- */

/**
 * Constructs a signature used in P2PKH script
 *
 * @export
 * @param {Uint8Array} signableData
 * @param {Uint8Array} secretKey
 * @return {*}  {string}
 */
export function constructSignature(
    signableData: Uint8Array,
    secretKey: Uint8Array,
): IResult<string> {
    try {
        const signature = nacl.sign.detached(signableData, secretKey);
        return ok(Buffer.from(signature).toString('hex'));
    } catch {
        return err(IErrorInternal.UnableToConstructSignature);
    }
}

/**
 * Constructs signable data from previous OutPoint for P2PKH script
 *
 * @export
 * @param {IOutPoint} outPoint - Previous `OutPoint`
 * @return {*}  {string}
 */
export function constructTxInSignableData(outPoint: IOutPoint | null): string | null {
    return sha3_256(
        getFormattedOutPointString(outPoint),
    ); /* Assume that outPoint cannot be null here */
}

/**
 * Gets OutPoint formatted as a string
 *
 * @export
 * @param {(IOutPoint | null)} outPoint
 * @return {*}  {(string | null)}
 */
export function getFormattedOutPointString(outPoint: IOutPoint | null): string | null {
    if (!outPoint) {
        return null;
    }
    return `${outPoint.n}-${outPoint.t_hash}`;
}

/**
 * Generates a new 32 byte DRUID
 *
 * @returns {string}
 */
export function generateDRUID(): IResult<string> {
    try {
        let newDRUID = uuidv4().replace(/-/gi, '');
        // TODO: Change DRUID character length to 64?
        newDRUID = truncateByBytesUTF8(sha3_256(newDRUID), 32);

        return ok(`DRUID0x${newDRUID}`);
    } catch {
        return err(IErrorInternal.UnableToGenerateDruid);
    }
}

/**
 * Formats script data for "from" address creation
 *
 * @export
 * @return {*}  {string}
 * @param script - `Script` value
 */
export function getFormattedScriptString(script: Script): string {
    return Object.values(script.stack)
        .map((stackEntry) => stackEntry.toString())
        .join('-');
}

/**
 * Gets "from" address used in DDEValues
 *
 * @export
 * @param {ICreateTxIn[]} txIns - Transaction inputs
 * @return {*}  {string}
 */
export function constructTxInsAddress(txIns: ICreateTxIn[]): IResult<string> {
    const signableTxIns = txIns
        .map((txIn) => {
            const script_sig = txIn.script_signature;
            if (script_sig) {
                const previousOutPoint = txIn.previous_out;
                const script = p2pkh(
                    script_sig.Pay2PkH.signable_data,
                    script_sig.Pay2PkH.signature,
                    script_sig.Pay2PkH.public_key,
                    script_sig.Pay2PkH.address_version,
                );
                if (script.isErr()) return err(script.error);
                return previousOutPoint !== null
                    ? `${getFormattedOutPointString(previousOutPoint)}-${getFormattedScriptString(
                          script.value,
                      )}`
                    : `null-${getFormattedScriptString(script.value)}`;
            } else {
                return err(IErrorInternal.UnableToConstructTxIns);
            }
        })
        .join('-');

    const bytesToHash = getStringBytes(signableTxIns);
    return ok(sha3_256(bytesToHash));
}

//TODO: Add data asset type
//TODO: Use DRS transaction hash as part of the signable data?
export function constructTxInSignableAssetHash(asset: IAssetToken | IAssetReceipt): string {
    if (isOfType<IAssetToken>(asset, initIAssetToken())) {
        return sha3_256(
            getStringBytes(`Token:${asset.Token}`),
        ); /* Actual token amount, not formatted for display */
    } else {
        return sha3_256(getStringBytes(`Receipt:${asset.Receipt.amount}`));
    }
}

/**
 * Construct a Pay-to-Public-Key-Hash script
 *
 * @export
 * @param {string} checkData - Data to check
 * @param {string} signatureData - Signature
 * @param {string} publicKeyData - Public key
 * @param {(number | null)} addressVersion - Address version
 * @return {*}  {IResult<Script>}
 */
export function p2pkh(
    checkData: string,
    signatureData: string,
    publicKeyData: string,
    addressVersion: number | null,
): IResult<Script> {
    const stackEntries: StackEntry[] = [];
    stackEntries.push(new StackEntry('Bytes', checkData));
    stackEntries.push(new StackEntry('Signature', signatureData));
    stackEntries.push(new StackEntry('PubKey', publicKeyData));
    stackEntries.push(new StackEntry('Op', 'OP_DUP'));
    stackEntries.push(
        new StackEntry(
            'Op',
            addressVersion == 1 || addressVersion == null ? 'OP_HASH256' : 'OP_HASH256_TEMP',
        ),
    );
    const addr = constructAddress(getHexStringBytes(publicKeyData), addressVersion);
    if (addr.isErr()) return err(addr.error);
    stackEntries.push(new StackEntry('PubKeyHash', addr.value));
    stackEntries.push(new StackEntry('Op', 'OP_EQUALVERIFY'));
    stackEntries.push(new StackEntry('Op', 'OP_CHECKSIG'));
    return ok({
        stack: stackEntries,
    });
}
