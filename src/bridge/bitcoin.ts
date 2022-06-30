import { HelixBridge } from './protobridge';
import axios, { AxiosInstance } from 'axios';
import {
    Result,
    IFetchBtcUtxoResponse,
    ITxStage1ScriptInput,
    IBtcExpectations,
} from './interfaces';
import { IClientResponse, IKeypair, IAPIRoute } from '../interfaces';
import { BTC_BLOCKTIME_SECS, INPUT_SIZE, OUTPUT_SIZE, SATOSHI_PER_BYTE_PAYMENT } from './constants';
import { PrivateKey, Address, PublicKey, Transaction, Script, crypto } from 'bitcore-lib';
import { generateIntercomSetBody } from '../utils/intercomUtils';

/**
 * Helix bridge for trades on the BitCoin network
 *
 * @param {number} freshTestResponseTimeout - The timeout for the fresh test response, in hours. Defaults to 12
 */
export class HelixBridgeBTC extends HelixBridge {
    bitcoinEndpoint: string;
    netenv: string;
    txStage2: Transaction | null;

    constructor(bitcoinEndpoint: string, netenv: string, freshTestResponseTimeout = 12) {
        super('BTC', freshTestResponseTimeout);
        this.bitcoinEndpoint = bitcoinEndpoint;
        this.netenv = netenv;
        this.txStage2 = null;
    }

    /**
     * Converts BitCoin block time to days
     *
     * @param {number} lockTime - The lock time for the transaction
     * @returns
     */
    getLockTimeInDays(lockTime: number): number {
        return (lockTime * BTC_BLOCKTIME_SECS) / 60 / 60 / 24;
    }

    /**
     * Converts the number of days to lock up into a block time
     *
     * @param {number} days - The number of days to lock the transaction for
     * @param {number} startBlockHeight - The block height to start the lock time from
     * @returns
     */
    getLockTimeFromDays(days: number, startBlockHeight: number): number {
        return Math.floor((days * 24 * 60 * 60) / BTC_BLOCKTIME_SECS) + startBlockHeight;
    }

    /**
     * Calculates the fee for a transaction
     *
     * @param {number} satoshisPerByte - The number of satoshis per byte you want to pay
     * @param {number} inputCount - The number of inputs in the transaction
     * @param {number} satoshisToSend - The number of satoshis to send from the inputs
     * @param {number} totalAmountAvailable - The total amount available in these inputs
     */
    calculateFee(
        satoshisPerByte: number,
        inputCount: number,
        satoshisToSend: number,
        totalAmountAvailable: number,
    ): number | null {
        const txSize = inputCount * INPUT_SIZE + OUTPUT_SIZE + 10 - inputCount;
        const satoshiFee = satoshisPerByte * txSize;

        if (totalAmountAvailable - satoshisToSend - satoshiFee < 0) {
            return null;
        }
        return satoshiFee;
    }

    /**
     * Predicate to check whether a transaction meets the trade expectations
     *
     * @param transaction - The transaction to check
     * @param expectations - The expectations for the trade
     */
    expectationsAreMetBtcTx(transaction: Transaction, expectations: IBtcExpectations): boolean {
        const outputs = transaction.outputs;

        // Check filters
        const amount = outputs.reduce((acc, current) => acc + current.satoshis, 0);
        const ourAddressFilter = outputs.filter(
            (o) => o.script.toString().indexOf(expectations.ourAddress) != -1,
        );
        const zenottasAddressFilter = outputs.filter(
            (o) => o.script.toString().indexOf(expectations.zenottasAddress) != -1,
        );

        if (
            amount != expectations.amount ||
            ourAddressFilter.length != 1 ||
            zenottasAddressFilter.length != 1
        ) {
            return false;
        }

        return true;
    }

    /**
     * Constructs the custom first transaction stage locking script with
     * Zenotta's public key for the given network
     */
    constructTxStage1Script(inputs: ITxStage1ScriptInput): Script {
        const locktime = this.getLockTimeFromDays(inputs.daysToLock, inputs.startBlockHeight);

        return new Script('OP_IF')
            .add('OP_0')
            .add('OP_2')
            .add(inputs.theirAddress)
            .add(inputs.zenottasAddress)
            .add('OP_2')
            .add('OP_CHECKMULTISIG')
            .add('OP_ELSE')
            .add(locktime)
            .add('OP_CHECKLOCKTIMEVERIFY')
            .add('OP_DROP')
            .add('OP_DUP')
            .add('OP_HASH160')
            .add(inputs.ourReturnAddress)
            .add('OP_EQUALVERIFY')
            .add('OP_CHECKSIG')
            .add('OP_ENDIF');
    }

    /**
     * Constructs the partial second transaction stage (TxB') for the trade
     *
     * NOTE: This stage does not include Zenotta's signature, which must be added
     * after the third transaction stage is completed
     *
     * @param axiosClient - The axios client to use for the API calls
     * @param ourSig - Our signature to unlock the input transaction
     * @param amount - The amount to spend on
     * @param ourPrivateKey - The private key to use for the transaction
     * @returns
     */
    async constructTxStage2Partial(
        axiosClient: AxiosInstance,
        ourSig: string,
        amount: number,
        ourPrivateKey: PrivateKey,
    ): Result<Transaction> {
        const transaction = await this.constructTransaction(
            axiosClient,
            ourPrivateKey,
            ourPrivateKey.toAddress().toString(),
            amount,
        );
        if (transaction instanceof Error) {
            return transaction;
        }
        transaction.applySignature(crypto.Signature.fromString(ourSig));
        return transaction;
    }

    /**
     * Constructs the first transaction stage (TxA) for the trade
     *
     * @param axiosClient - The axios client to use for the API calls
     * @param inputs - The inputs to use for the transaction script
     * @param amount - Amount to send
     * @param ourPrivateKey - The private key to use for the transaction
     */
    async constructTxStage1(
        axiosClient: AxiosInstance,
        inputs: ITxStage1ScriptInput,
        amount: number,
        ourPrivateKey: PrivateKey,
    ): Result<Transaction> {
        const transaction = await this.constructTransaction(
            axiosClient,
            ourPrivateKey,
            inputs.theirAddress,
            amount,
        );
        if (transaction instanceof Error) {
            return transaction;
        }

        const script = this.constructTxStage1Script(inputs);
        transaction.outputs[0].setScript(script);

        return transaction;
    }

    /**
     * Constructs a BTC transaction ready to be sent
     */
    async constructTransaction(
        axiosClient: AxiosInstance,
        ourPrivateKey: PrivateKey,
        theirAddress: string,
        amount: number,
    ): Result<Transaction> {
        const publicKey = PublicKey.fromPrivateKey(ourPrivateKey);
        const ourAddress = new Address(publicKey);
        const transaction = new Transaction();
        const utxoFetchResult = await this.fetchInputsFromUtxo(axiosClient, ourAddress.toString());

        // Checks on the result of the fetch
        if (utxoFetchResult instanceof Error) {
            return utxoFetchResult;
        }
        if (!utxoFetchResult.inputs || !utxoFetchResult.inputs.length) {
            return new Error('No UTXO entries found');
        }

        // Handle inputs & fee
        const inputs = utxoFetchResult.inputs;
        const fee = this.calculateFee(
            SATOSHI_PER_BYTE_PAYMENT,
            inputs.length,
            amount,
            utxoFetchResult.totalAmountAvailable,
        );
        if (!fee) {
            return new Error('Not enough funds');
        }

        // Fill the transaction
        transaction.from(inputs);
        transaction.to(theirAddress, amount);
        transaction.fee(fee ? fee * 20 : 0);
        transaction.change(ourAddress);
        transaction.sign(ourPrivateKey);

        return transaction;
    }

    /**
     * Fetches UTXO entries from the endpoint and filters them by our address.
     * Assumes a fetch with SoChain at the moment
     *
     * @param axiosClient - The axios client to use for the request
     * @param address - The address to filter the available outputs by
     */
    public async fetchInputsFromUtxo(
        axiosClient: AxiosInstance,
        address: string,
    ): Result<IFetchBtcUtxoResponse> {
        return await axiosClient
            .get(`${this.bitcoinEndpoint}/${this.netenv}/${address}`)
            .then((response: any) => {
                let totalAmountAvailable = 0;
                const inputs: any[] = [];
                const address = response.data.data.address;

                response.data.data.txs.forEach(async (element: any) => {
                    const utxo: any = {
                        address,
                        satoshis: Math.floor(Number(element.value) * 100000000),
                        script: element.script_hex,
                        txId: element.txid,
                        outputIndex: element.output_no,
                    };

                    totalAmountAvailable += utxo.satoshis;
                    inputs.push(utxo);
                });

                return {
                    inputs,
                    totalAmountAvailable,
                };
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    /* -------------------------------------------------------------------------- */
    /*                       Shared Methods from ProtoBridge                      */
    /* -------------------------------------------------------------------------- */

    /**
     * Constructs and sends the first transaction stage (TxA)
     *
     * @param {string} intercomHost - The hostname of the intercom server
     * @param {string} theirAddress - The address to send the funds to
     * @param {IKeypair} ourKeypair - Our keypair to use for the transaction
     * @param {Transaction} transaction - Transaction to send
     */
    public async sendTxStage1(
        intercomHost: string,
        theirAddress: string,
        ourKeypair: IKeypair,
        transaction: Transaction,
    ): Result<IClientResponse> {
        const sendBody = generateIntercomSetBody<Transaction>(
            theirAddress,
            ourKeypair.address,
            ourKeypair,
            transaction,
        );

        return await axios
            .post(`${intercomHost}${IAPIRoute.IntercomSet}`, sendBody)
            .then(() => {
                // Update the progress on our trade with this person
                this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
                    status: 3,
                    lastEvent: new Date(),
                });

                // Fresh test has been sent
                return {
                    status: 'success',
                    reason: 'Sent first transaction stage',
                    content: {},
                } as IClientResponse;
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    /**
     * Gets TxA from the intercom server and ensures it matches our
     * expectations for this trade
     *
     * @param intercomHost - The hostname of the intercom server
     * @param ourKeypair - Our keypair to unlock the intercom server response
     * @param theirAddress - Address of the counter party
     * @param expectations - The expectations for this trade
     */
    public async getTxStage1(
        intercomHost: string,
        ourKeypair: IKeypair,
        theirAddress: string,
        expectations: IBtcExpectations,
    ): Result<IClientResponse> {
        const intercomData = await this.getIntercomData(
            intercomHost,
            ourKeypair.address,
            ourKeypair,
        );
        if (intercomData instanceof Error) {
            return intercomData;
        }
        if (!intercomData[theirAddress]) {
            return this.markedErrorInProgress(theirAddress, `No data for counter party found`);
        }

        // Grab transaction
        const transaction = intercomData[theirAddress] as Transaction;
        if (!transaction) {
            return this.markedErrorInProgress(
                theirAddress,
                `No first transaction stage (TxA) found for ${theirAddress}`,
            );
        }

        // Validate
        const inputScript = transaction.inputs[0].script;
        const outputScript = transaction.outputs[0].script;
        if (!inputScript || !outputScript) {
            return this.markedErrorInProgress(
                theirAddress,
                `No input or output script found for ${theirAddress}`,
            );
        }
        if (!Script.Interpreter().verify(inputScript, outputScript)) {
            return this.markedErrorInProgress(theirAddress, `Invalid transaction TxA`);
        }

        // Check the expectations
        if (!this.expectationsAreMetBtcTx(transaction, expectations)) {
            return this.markedErrorInProgress(
                theirAddress,
                `Expectations not met for ${theirAddress}`,
            );
        }

        this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
            status: 4,
            lastEvent: new Date(),
        });

        return {
            status: 'success',
            reason: 'Received first transaction stage',
            content: {
                transaction,
            },
        } as IClientResponse;
    }

    public async sendTxStage2Partial(
        intercomHost: string,
        theirAddress: string,
        ourKeypair: IKeypair,
        txStage2Partial: Transaction,
    ): Result<IClientResponse> {
        const sendBody = generateIntercomSetBody<Transaction>(
            theirAddress,
            ourKeypair.address,
            ourKeypair,
            txStage2Partial,
        );

        return await axios
            .post(`${intercomHost}${IAPIRoute.IntercomSet}`, sendBody)
            .then(() => {
                // Update the progress on our trade with this person
                this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
                    status: 5,
                    lastEvent: new Date(),
                });

                // Fresh test has been sent
                return {
                    status: 'success',
                    reason: 'Sent first transaction stage',
                    content: {},
                } as IClientResponse;
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    public async getTxStage2Partial(
        intercomHost: string,
        theirAddress: string,
        ourKeypair: IKeypair,
        ourSig: string,
    ): Result<IClientResponse> {
        const intercomData = await this.getIntercomData(
            intercomHost,
            ourKeypair.address,
            ourKeypair,
        );
        if (intercomData instanceof Error) {
            return intercomData;
        }
        if (!intercomData[theirAddress]) {
            return this.markedErrorInProgress(theirAddress, `No data for counter party found`);
        }

        // Grab transaction
        const transaction = intercomData[theirAddress] as Transaction;
        if (!transaction) {
            return this.markedErrorInProgress(
                theirAddress,
                `No first transaction stage (TxA) found for ${theirAddress}`,
            );
        }

        // Verify
        const inputScript = transaction.inputs[0].script;
        if (inputScript.toString().indexOf(ourSig) == -1) {
            return this.markedErrorInProgress(theirAddress, `Invalid transaction TxB partial`);
        }
        
        this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
            status: 6,
            lastEvent: new Date(),
        });

        this.txStage2 = transaction;
        return {
            status: 'success',
            reason: 'Received second transaction stage',
            content: {}
        } as IClientResponse;
    }
}
