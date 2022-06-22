import { HelixBridge } from "./protobridge";
import { AxiosInstance } from "axios";
import { Result, IBtcTxMaterial, IFetchBtcUtxoResponse } from "./interfaces";
import { IClientResponse } from "../interfaces";
import { SATOSHIS_PER_BTC } from "./constants";
import { PrivateKey, Address, PublicKey, Transaction } from 'bitcore-lib';

/**
 * Helix bridge for trades on the BitCoin network
 * 
 * @param {number} freshTestResponseTimeout - The timeout for the fresh test response, in hours. Defaults to 12
 */
export class HelixBridgeBTC extends HelixBridge {
    bitcoinEndpoint: string;
    netenv: string;

    constructor(bitcoinEndpoint: string, netenv: string, freshTestResponseTimeout = 12) {
        super("BTC", freshTestResponseTimeout);
        this.bitcoinEndpoint = bitcoinEndpoint;
        this.netenv = netenv;
    }

    /**
     * Constructs the material needed to create a transaction
     * 
     * @param ourPrivateKey - Our private key
     * @param theirAddress - The address of the other party
     * @param amount - Amount of BTC to send
     * @returns 
     */
    constructTxMaterial(ourPrivateKey: PrivateKey, theirAddress: Address, amount: number): IBtcTxMaterial {
        const publicKey = PublicKey.fromPrivateKey(ourPrivateKey);
        const address = new Address(publicKey);

        return {
            ourAddress: address,
            theirAddress,
            privateKey: ourPrivateKey,
            satoshiAmount: amount * SATOSHIS_PER_BTC,
            fee: 0,
            inputCount: 0
        };
    }

    /**
     * Constructs a BTC transaction ready to be sent
     */
    async constructTransaction(axiosClient: AxiosInstance, ourAddress: string): Result<any> {
        const transaction = new Transaction();
        const utxoFetchResult = await this.fetchInputsFromUtxo(axiosClient, ourAddress);

        // Checks on the result of the fetch
        if (utxoFetchResult instanceof Error) { return utxoFetchResult; }
        if (
            !utxoFetchResult.inputs ||
            !utxoFetchResult.inputs.length
        ) { return new Error('No UTXO entries found'); }


        const inputs = utxoFetchResult.inputs;
        transaction.from(inputs);
    }

    /**
     * Fetches UTXO entries from the endpoint and filters them by our address. 
     * Assumes a fetch with SoChain at the moment
     * 
     * @param axiosClient - The axios client to use for the request
     * @param address - The address to filter the available outputs by
     */
    public async fetchInputsFromUtxo(axiosClient: AxiosInstance, address: string): Result<IFetchBtcUtxoResponse> {
        return await axiosClient.get(
            `${this.bitcoinEndpoint}/${this.netenv}/${address}`
        ).then((response: any) => {
            let totalAmountAvailable = 0;
            let inputs: any[] = [];
            let address = response.data.data.address;

            response.data.data.txs.forEach(async (element: any) => {
                let utxo: any = {
                    address,
                    satoshis: Math.floor(Number(element.value) * 100000000),
                    script: element.script_hex,
                    txId: element.txid,
                    outputIndex: element.output_no
                };

                totalAmountAvailable += utxo.satoshis;
                inputs.push(utxo);
            });

            return {
                inputs,
                totalAmountAvailable
            };
        })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    public async sendTxStage1(axiosClient: AxiosInstance): Result<IClientResponse> {
        // 1. Construct the other party's transaction with their's and Zenotta's public keys
        if (!this.mempoolKey) {
            await this.getMempoolKey(axiosClient);
        }


        // 2. Send the transaction to the chain network
        // 3. Send the transaction to the intercom
        // 4. Update the progress for this trade partner to 3
    }
}
