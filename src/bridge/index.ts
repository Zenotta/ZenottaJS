import { generateIntercomSetBody, generateIntercomGetBody } from "../utils/intercomUtils";
import { IFreshTest } from "./interfaces";
import axios, { AxiosInstance } from 'axios';
import uuidv4 from 'uuid';
import {
    IAPIRoute,
    IKeypair,
    INetworkResponse,
    IClientResponse,
    IGetMempoolKeyResponse
} from "../interfaces";

interface ITradeProgress {
    status: number;
    lastEvent: Date;
}

export class HelixBridge {
    chain: string;
    mempoolKey: string | null;
    progress: { [address: string]: ITradeProgress };

    constructor(chain: 'BTC') {
        this.chain = chain;
        this.progress = {};
        this.mempoolKey = null;
    }

    /** 
     * Sends a test to the intercom for the receiver to sign. This serves as 
     * proof of public key freshness
     * 
     * @param {string} intercomHost - Intercom host to send the request to
     * @param {string} theirAddress - The address of the receiver
     * @param {IKeypair} ourKeypair - Our keypair for sending the test
     */
    public async sendFreshTest(intercomHost: string, theirAddress: string, ourKeypair: IKeypair): Promise<IClientResponse> {
        // Messages are randomly generated strings
        const valuePayload = {
            publicKey: theirAddress,
            message: uuidv4(),
            signature: null
        };

        const sendBody = generateIntercomSetBody<IFreshTest>(
            theirAddress,
            ourKeypair.address,
            ourKeypair,
            valuePayload,
        );

        return await axios
            .post(`${intercomHost}${IAPIRoute.IntercomSet}`, sendBody)
            .then(() => {
                // Update the progress on our trade with this person
                this.progress[theirAddress] = {
                    status: 0,
                    lastEvent: new Date() 
                };

                // Fresh test has been sent
                return {
                    status: 'success',
                    reason: 'Fresh test sent',
                    content: {},
                } as IClientResponse;
            })
            .catch(async (error) => {
                if (error instanceof Error) throw new Error(error.message);
                else throw new Error(`${error}`);
            });
    }

    /**
     * Gets a third party public key from the Zenotta mempool. Sets the mempool key 
     * internally as well.
     * 
     * @param {AxiosInstance} axiosClient - Client connected to the mempool
     * @param {boolean} force - Force a request for a new key, rather than using an existing one
     */
    public async getMempoolKey(axiosClient: AxiosInstance, force: boolean = false): Promise<IClientResponse> {
        if (!this.mempoolKey || force) {
            return await axiosClient
                .post<INetworkResponse>(IAPIRoute.GetMempoolKey, { network: this.chain.toLowerCase() })
                .then((response) => {
                    const responseData = response.data as INetworkResponse;

                    if (responseData.content) {
                        let content = responseData.content as IGetMempoolKeyResponse;
                        this.mempoolKey = content.public_key;

                        return {
                            status: 'success',
                            reason: 'Mempool key retrieved',
                            content: {
                                publicKey: content.public_key,
                            },
                        } as IClientResponse;
                    }

                    throw new Error(`${responseData.reason}`);
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        }

        return {
            status: 'success',
            reason: 'Existing mempool key retrieved',
            content: {
                publicKey: this.mempoolKey,
            }
        } as IClientResponse;
    }

    /**
     * Signs the fresh test and returns the signature to the sender
     * 
     * @param {string} ourAddress - Our address to fetch for
     * @param {IKeypair} ourKeypair - Our keypair to sign for data
     * @param {string} theirAddress - Their address to send the data back to
     */
    public async signFreshTest(ourAddress: string, ourKeypair: IKeypair, theirAddress: string) {
        // 1. Get the fresh test from the intercom
        // 2. Sign the fresh test
        // 3. Send the signed fresh test back to the intercom
        // 4. Update the progress for this trade partner to 1
    }

    /**
     * Gets the pending fresh test response
     * 
     * @param {string} ourAddress - Our address to fetch for
     * @param {IKeypair} ourKeypair - Our keypair to sign for the response
     * @param {string} theirAddress - Their address to get the signature for
     */
    public async getFreshTestResponse(ourAddress: string, ourKeypair: IKeypair, theirAddress: string) {
        // 1. Get the fresh test from the intercom
        // 2. Check that the time of receipt is not too old compared to the last time we checked
        // 3. Verify the fresh test signature
        // 4. Update the progress for this trade partner to 1
    }

    /**
     * Sends the other party's transaction to the chain network, along with Zenotta's public key in the multisig. 
     * Also sends this transaction to the intercom so they can verify
     */
    public async sendTxStage1() {
        // 1. Construct the other party's transaction with their's and Zenotta's public keys
        // 2. Send the transaction to the chain network
        // 3. Send the transaction to the intercom
        // 4. Update the progress for this trade partner to 2
    }

    /**
     * Checks the chain network for the first transaction stage's status
     */
    public async checkTxStage1() {
        // 1. Get the transaction from the intercom
        // 2. Check that the transaction is in the chain network
        // 3. Ensure the 2 transactions match
        // 4. Update the progress for this trade partner to 2
    }

    /**
     * Sends the other party's second transaction stage to the intercom. This is a partial, 
     * without the Zenotta mempool signature
     */
    public async sendTxStage2Partial() {
        // 1. Construct the other party's on-spend transaction, without the mempool signature
        // 2. Send the transaction to the other party's intercom
        // 3. Update the progress for this trade partner to 3
    }

    /**
     * Get our second transaction stage from the intercom
     */
    public async getTxStage2Partial() {
        // 1. Get the second transaction from the intercom
        // 2. Check it's valid
        // 3. Update the progress for this trade partner to 3
    }

    /**
     * Sends our third transaction stage as a DDE to the intercom
     */
    public async sendTxStage3() {
        // 1. Construct the third transaction
        // 2. Undergo RBP process
        // 3. Update the progress for this trade partner to 4
    }

    /**
     * Gets the mempool signature for a given message and public key
     * 
     * @param {string} message - The message to sign
     * @param {string} publicKey - The public key to sign with
     */
    public async getMempoolSignature(message: string, publicKey: string) { }

    /**
     * Submits the final second transaction stage to the chain network
     */
    public async submitTxStage2() {
        // 1. Add the Zenotta signature to the second stage transaction
        // 2. Submit the second stage transaction to the chain network
    }

    public async submitTxStage4() { }
}