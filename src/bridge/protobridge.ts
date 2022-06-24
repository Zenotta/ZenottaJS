import { generateIntercomSetBody, generateIntercomGetBody } from '../utils/intercomUtils';
import { IFreshTest } from './interfaces';
import axios, { AxiosInstance } from 'axios';
import uuidv4 from 'uuid';
import nacl from 'tweetnacl';
import { createSignature } from '../mgmt';
import {
    IAPIRoute,
    IKeypair,
    INetworkResponse,
    IClientResponse,
    IGetMempoolKeyResponse,
    IGetMempoolSignatureResponse,
} from '../interfaces';
import { Result, ITradeProgress } from './interfaces';

/**
 * Helix bridge for trading with another trader on another blockchain/network
 *
 * @param {string} chain - The other blockchain/network to trade on with this bridge
 * @param {number} freshTestResponseTimeout - How long to wait for a fresh test response, in hours. Defaults to 12
 */
export class HelixBridge {
    chain: string;
    mempoolKey: string | null;
    freshTestResponseTimeout: number; // in hours
    progress: { [address: string]: ITradeProgress };

    constructor(chain: 'BTC', freshTestResponseTimeout = 12) {
        this.chain = chain;
        this.progress = {};
        this.mempoolKey = null;
        this.freshTestResponseTimeout = freshTestResponseTimeout;
    }

    /**
     * Utility function to sign a message
     *
     * @param secretKey - The secret key to sign the transaction with
     * @param message - The message to sign
     * @returns
     */
    sign(secretKey: Uint8Array, message: string): string {
        return Buffer.from(
            createSignature(secretKey, Uint8Array.from(Buffer.from(message, 'hex'))),
        ).toString('hex');
    }

    /**
     * Utility function to verify a signature
     *
     * @param signature - The signature to verify
     * @param message - The message to verify
     * @param publicKey - The public key to verify the signature with
     */
    verify(signature: string, message: string, publicKey: string): boolean {
        const sigBuffer = Uint8Array.from(Buffer.from(signature, 'hex'));
        const messageBuffer = Uint8Array.from(Buffer.from(message, 'hex'));
        const pubKeyBuffer = Uint8Array.from(Buffer.from(publicKey, 'hex'));

        return nacl.sign.detached.verify(messageBuffer, sigBuffer, pubKeyBuffer);
    }

    /**
     * Converts milliseconds to hours
     *
     * @param {number} ms - Milliseconds to convert
     */
    formatMillisecondsToHours(ms: number): number {
        return ms / 1000 / 60 / 60;
    }

    /**
     * Marks an error or failure in the trade within this instance, and returns
     * the error for further handling
     *
     * @param theirAddress - The address of the trade partner
     * @param reason - Reason for failure
     */
    markedErrorInProgress(theirAddress: string, reason: string): Error {
        this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
            status: null,
            lastEvent: new Date(),
            reasonForFailure: reason,
        });

        return new Error(reason);
    }

    /**
     * Utility function to fetch the current data for our address in intercom
     *
     * @param intercomHost - Intercom host to send the requests to
     * @param ourAddress - Our address to fetch for
     * @param ourKeypair - Our keypair to sign for the response
     * @returns
     */
    async getIntercomData(
        intercomHost: string,
        ourAddress: string,
        ourKeypair: IKeypair,
    ): Result<any> {
        const getBody = generateIntercomGetBody(ourAddress, ourKeypair);

        return await axios
            .post(`${intercomHost}${IAPIRoute.IntercomGet}`, getBody)
            .then((response) => {
                return response.data;
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    /**
     * Sends a test to the intercom for the receiver to sign. This serves as
     * proof of public key freshness
     *
     * @param {string} intercomHost - Intercom host to send the request to
     * @param {string} theirAddress - The address of the receiver
     * @param {IKeypair} ourKeypair - Our keypair for sending the test
     */
    public async sendFreshTest(
        intercomHost: string,
        theirAddress: string,
        ourKeypair: IKeypair,
    ): Result<IClientResponse> {
        // Messages are randomly generated strings
        const valuePayload = {
            publicKey: theirAddress,
            message: uuidv4(),
            signature: null,
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
                    lastEvent: new Date(),
                    ourAddress: ourKeypair.address,
                    reasonForFailure: null,
                };

                // Fresh test has been sent
                return {
                    status: 'success',
                    reason: 'Fresh test sent',
                    content: {},
                } as IClientResponse;
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    /**
     * Gets a third party public key from the Zenotta mempool. Sets the mempool key
     * internally as well.
     *
     * @param {AxiosInstance} axiosClient - Client connected to the mempool
     * @param {boolean} force - Force a request for a new key, rather than using an existing one. Defaults to false
     */
    public async getMempoolKey(axiosClient: AxiosInstance, force = false): Result<IClientResponse> {
        if (!this.mempoolKey || force) {
            return await axiosClient
                .post<INetworkResponse>(IAPIRoute.GetMempoolKey, {
                    network: this.chain.toLowerCase(),
                })
                .then((response) => {
                    const responseData = response.data as INetworkResponse;

                    if (responseData.content) {
                        const content = responseData.content as IGetMempoolKeyResponse;
                        this.mempoolKey = content.public_key;

                        return {
                            status: 'success',
                            reason: 'Mempool key retrieved',
                            content: {
                                publicKey: content.public_key,
                            },
                        } as IClientResponse;
                    }

                    return new Error(`${responseData.reason}`);
                })
                .catch(async (error) => {
                    if (error instanceof Error) return new Error(error.message);
                    else return new Error(`${error}`);
                });
        }

        return {
            status: 'success',
            reason: 'Existing mempool key retrieved',
            content: {
                publicKey: this.mempoolKey,
            },
        } as IClientResponse;
    }

    /**
     * Signs the fresh test and returns the signature to the sender
     *
     * @param {string} intercomHost - Intercom host to send the requests to
     * @param {string} ourAddress - Our address to fetch for
     * @param {IKeypair} ourKeypair - Our keypair to sign for data
     * @param {string} theirAddress - Their address to send the data back to
     */
    public async signFreshTest(
        intercomHost: string,
        ourKeypair: IKeypair,
        theirAddress: string,
    ): Result<IClientResponse> {
        const ourAddress = this.progress[theirAddress].ourAddress;

        if (Uint8Array.from(Buffer.from(ourAddress, 'hex')) != ourKeypair.publicKey) {
            return this.markedErrorInProgress(
                theirAddress,
                'Our address does not match our public key',
            );
        }

        // 1. Get the test from the intercom
        const intercomData = await this.getIntercomData(intercomHost, ourAddress, ourKeypair);
        if (!intercomData[theirAddress]) {
            return new Error('Data not found for trade partner!');
        }
        const freshTest = intercomData[theirAddress] as IFreshTest;

        // 2. Sign the fresh test
        const signature = this.sign(ourKeypair.secretKey, freshTest.message);
        freshTest.signature = signature;

        // 3. Send the signed fresh test back to the intercom
        const sendBody = generateIntercomSetBody<IFreshTest>(
            theirAddress,
            ourAddress,
            ourKeypair,
            freshTest,
        );

        return await axios
            .post(`${intercomHost}${IAPIRoute.IntercomSet}`, sendBody)
            .then(() => {
                // 4. Update the progress for this trade partner to 1
                this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
                    status: 1,
                    lastEvent: new Date(),
                });

                // Fresh test has been sent
                return {
                    status: 'success',
                    reason: 'Fresh test sent',
                    content: {},
                } as IClientResponse;
            })
            .catch(async (error) => {
                if (error instanceof Error)
                    return this.markedErrorInProgress(theirAddress, error.message);
                else return this.markedErrorInProgress(theirAddress, `${error}`);
            });
    }

    /**
     * Gets the pending fresh test response
     *
     * @param {string} intercomHost - Intercom host to send the requests to
     * @param {string} ourAddress - Our address to fetch for
     * @param {IKeypair} ourKeypair - Our keypair to sign for the response
     * @param {string} theirAddress - Their address to get the signature for
     */
    public async getFreshTestResponse(
        intercomHost: string,
        ourAddress: string,
        ourKeypair: IKeypair,
        theirAddress: string,
    ): Result<IClientResponse> {
        // 1. Get the fresh test from the intercom
        const intercomData = await this.getIntercomData(intercomHost, ourAddress, ourKeypair);
        if (!intercomData[theirAddress]) {
            return new Error('Data not found for trade partner!');
        }
        const freshTest = intercomData[theirAddress] as IFreshTest;

        // 2. Check that the time of receipt is not too old compared to the last time we checked
        const now = new Date();
        const lastEvent = this.progress[theirAddress].lastEvent;
        const timeDiff = this.formatMillisecondsToHours(now.getTime() - lastEvent.getTime());
        if (timeDiff > this.freshTestResponseTimeout) {
            return this.markedErrorInProgress(theirAddress, 'Fresh test response timed out');
        }

        // 3. Verify the fresh test signature
        if (freshTest.signature) {
            if (this.verify(freshTest.signature, freshTest.message, freshTest.publicKey)) {
                // 4. Update the progress for this trade partner to 2
                this.progress[theirAddress] = Object.assign(this.progress[theirAddress], {
                    status: 2,
                    lastEvent: new Date(),
                });

                return {
                    status: 'success',
                    reason: 'Fresh test signed by other party successfully',
                    content: {},
                } as IClientResponse;
            }

            return this.markedErrorInProgress(theirAddress, 'Signature verification failed');
        }

        return this.markedErrorInProgress(theirAddress, 'Fresh test signature not found');
    }

    /**
     * Gets the mempool signature for a given message and public key
     *
     * @param {AxiosInstance} axiosClient - Axios client to use for the request
     * @param {string} message - The message to sign
     * @param {string} publicKey - The public key to sign with
     */
    public async getMempoolSignature(
        axiosClient: AxiosInstance,
        message: string,
        publicKey: string,
    ): Result<IClientResponse> {
        const sendBody = {
            message,
            publicKey,
            network: this.chain.toLowerCase(),
        };

        return await axiosClient
            .post<INetworkResponse>(IAPIRoute.GetMempoolSignature, sendBody)
            .then((response) => {
                const responseData = response.data as INetworkResponse;

                if (responseData.content) {
                    const content = responseData.content as IGetMempoolSignatureResponse;

                    if (this.mempoolKey != content.public_key) {
                        return new Error('Mempool public key mismatch with signature');
                    }

                    return {
                        status: 'success',
                        reason: 'Mempool signature received',
                        content: {
                            publicKey: content.public_key,
                            signature: content.signature,
                        },
                    } as IClientResponse;
                }

                return new Error(`${responseData.reason}`);
            })
            .catch(async (error) => {
                if (error instanceof Error) return new Error(error.message);
                else return new Error(`${error}`);
            });
    }

    /**
     * Sends the other party's second transaction stage to the intercom. This is a partial,
     * without the Zenotta mempool signature
     */
    public async sendTxStage2Partial(): Result<IClientResponse> {
        // 1. Construct the other party's on-spend transaction, without the mempool signature
        // 2. Send the transaction to the other party's intercom
        // 3. Update the progress for this trade partner to 3

        return {
            status: 'error',
            reason: 'Not implemented. Please use a network specific bridge (eg. HelixBridgeBTC)',
            content: {},
        };
    }

    /**
     * Get our second transaction stage from the intercom
     */
    public async getTxStage2Partial(): Result<IClientResponse> {
        // 1. Get the second transaction from the intercom
        // 2. Check it's valid
        // 3. Update the progress for this trade partner to 3

        return {
            status: 'error',
            reason: 'Not implemented. Please use a network specific bridge (eg. HelixBridgeBTC)',
            content: {},
        };
    }

    /**
     * Sends our third transaction stage as a DDE to the intercom
     */
    public async sendTxStage3(): Result<IClientResponse> {
        // 1. Construct the third transaction
        // 2. Undergo RBP process
        // 3. Update the progress for this trade partner to 4

        return {
            status: 'error',
            reason: 'Not implemented. Please use a network specific bridge (eg. HelixBridgeBTC)',
            content: {},
        };
    }

    /**
     * Submits the final second transaction stage to the chain network
     */
    public async submitTxStage2(): Result<IClientResponse> {
        // 1. Add the Zenotta signature to the second stage transaction
        // 2. Submit the second stage transaction to the chain network

        return {
            status: 'error',
            reason: 'Not implemented. Please use a network specific bridge (eg. HelixBridgeBTC)',
            content: {},
        };
    }

    /**
     * Fallback method for when the other party doesn't claim their second stage transaction
     */
    public async submitTxStage4(): Result<IClientResponse> {
        return {
            status: 'error',
            reason: 'Not implemented. Please use a network specific bridge (eg. HelixBridgeBTC)',
            content: {},
        };
    }
}
