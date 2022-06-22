import axios from 'axios';
import { mgmtClient } from './mgmtClient';
import {
    constructTxInsAddress,
    createPaymentTx,
    createRbTxHalf,
    createReceiptPayload,
    DEFAULT_HEADERS,
    RECEIPT_DEFAULT,
    SEED_REGEN_THRES,
} from '../mgmt';
import {
    castAPIStatus,
    createIdAndNonceHeaders,
    filterIntercomDataForPredicates,
    filterValidIntercomData,
    formatSingleCustomKeyValuePair,
    generateIntercomDelBody,
    generateIntercomGetBody,
    generateIntercomSetBody,
    initIAssetReceipt,
    initIAssetToken,
    throwIfErr,
} from '../utils';
import {
    IAPIRoute,
    IAssetReceipt,
    IAssetToken,
    IClientConfig,
    IClientResponse,
    ICreateTransaction,
    ICreateTransactionEncrypted,
    IDruidExpectation,
    IErrorInternal,
    IKeypairEncrypted,
    IMasterKeyEncrypted,
    INetworkResponse,
    IPendingRbTxDetails,
    IRequestIntercomDelBody,
    IRequestIntercomGetBody,
    IResponseIntercom,
} from '../interfaces';

export class ZenottaInstance {
    /* -------------------------------------------------------------------------- */
    /*                              Member Variables                              */
    /* -------------------------------------------------------------------------- */
    private intercomHost: string | undefined;
    private computeHost: string | undefined;
    private keyMgmt: mgmtClient | undefined;
    private routesPoW: Map<string, number> | undefined;

    /* -------------------------------------------------------------------------- */
    /*                                 Constructor                                */

    /* -------------------------------------------------------------------------- */
    constructor() {
        this.intercomHost = undefined;
        this.computeHost = undefined;
        this.keyMgmt = undefined;
        this.routesPoW = undefined;
    }

    /**
     * Initialize a new instance of the client without providing a master key or seed phrase
     *
     * @param {IClientConfig} config - Additional configuration parameters
     * @param initOffline - Optionally initialize the client without initializing network settings
     * @return {*}  {IClientResponse}
     * @memberof ZenottaInstance
     */
    public async initNew(config: IClientConfig, initOffline = false): Promise<IClientResponse> {
        this.keyMgmt = new mgmtClient();
        const initIResult = this.keyMgmt.initNew(config.passPhrase);
        if (!initOffline) {
            const initNetworkIResult = await this.initNetwork(config);
            if (initNetworkIResult.status === 'error') {
                return initNetworkIResult; // Return network error
            }
        }
        if (initIResult.isErr()) {
            return {
                status: 'error',
                reason: initIResult.error, // Return initialization error
            } as IClientResponse;
        } else {
            return {
                status: 'success',
                reason: 'ZNP client initialized',
                content: {
                    initNewResponse: initIResult.value,
                },
            } as IClientResponse;
        }
    }

    /**
     * Initialize an instance of the client with a provided master key
     *
     * @param {IClientConfig} config - Additional configuration parameters
     * @param {IMasterKeyEncrypted} masterKey - Master key
     * @param initOffline - Optionally initialize the client without initializing network settings
     *
     * @return {*}  {IClientResponse}
     * @memberof ZenottaInstance
     */
    public async initFromMasterKey(
        config: IClientConfig,
        masterKey: IMasterKeyEncrypted,
        initOffline = false,
    ): Promise<IClientResponse> {
        this.keyMgmt = new mgmtClient();
        const initIResult = this.keyMgmt.initFromMasterKey(config.passPhrase, masterKey);
        if (!initOffline) {
            const initNetworkIResult = await this.initNetwork(config);
            if (initNetworkIResult.status === 'error') {
                return initNetworkIResult; // Return network error
            }
        }

        if (initIResult.isErr()) {
            return {
                status: 'error',
                reason: initIResult.error, // Return initialization error
            } as IClientResponse;
        } else {
            return {
                status: 'success',
                reason: 'ZNP client initialized',
            } as IClientResponse;
        }
    }

    /**
     * Initialize an instance of the wallet with a provided seed phrase
     *
     * @param {IClientConfig} config - Additional configuration parameters
     * @param {string} seedPhrase - Seed phrase
     * @return {*}  {IClientResponse}
     * @param initOffline - Optionally initialize the client without initializing network settings
     *
     * @memberof ZenottaInstance
     */
    public async initFromSeed(
        config: IClientConfig,
        seedPhrase: string,
        initOffline = false,
    ): Promise<IClientResponse> {
        this.keyMgmt = new mgmtClient();
        const initIResult = this.keyMgmt.initFromSeed(config.passPhrase, seedPhrase);
        if (!initOffline) {
            const initNetworkIResult = await this.initNetwork(config);
            if (initNetworkIResult.status === 'error') {
                return initNetworkIResult; // Return network error
            }
        }
        if (initIResult.isErr()) {
            return {
                status: 'error',
                reason: initIResult.error, // Return initialization error
            } as IClientResponse;
        } else {
            return {
                status: 'success',
                reason: 'ZNP client initialized',
                content: {
                    initFromSeedResponse: initIResult.value,
                },
            } as IClientResponse;
        }
    }

    /**
     * Common network initialization (retrieval of PoW list)
     *
     * @private
     * @param {IClientConfig} config - Additional configuration parameters
     * @memberof ZenottaInstance
     */
    public async initNetwork(config: IClientConfig): Promise<IClientResponse> {
        // TODO: Add check for IPv4 and IPv6 IP address validity
        this.routesPoW = new Map();
        this.intercomHost = config.intercomHost;
        this.computeHost = config.computeHost;
        // Set routes proof-of-work requirements
        const debugData = await this.getDebugData();
        if (debugData.status === 'error')
            return {
                status: 'error',
                reason: debugData.reason,
            } as IClientResponse;
        else if (debugData.status === 'success' && debugData.content?.debugDataResponse)
            for (const route in debugData.content.debugDataResponse.routes_pow) {
                this.routesPoW.set(route, debugData.content.debugDataResponse.routes_pow[route]);
            }
        return {
            status: 'success',
        } as IClientResponse;
    }

    /**
     * @deprecated due to instability.
     *
     * Get all the addresses present on the ZNP UTXO set
     *
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async getUtxoAddressList(): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.GetUtxoAddressList);
            return await axios
                .get<INetworkResponse>(
                    `${this.computeHost}${IAPIRoute.GetUtxoAddressList}`,
                    headers,
                )
                .then((response) => {
                    return {
                        status: castAPIStatus(response.data.status),
                        reason: response.data.reason,
                        content: {
                            fetchUtxoAddressesResponse: response.data.content,
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Fetch balance for an address list from the UTXO set
     *
     * @param {string[]} addressList - A list of public addresses
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    async fetchBalance(addressList: string[]): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const fetchBalanceBody = {
                address_list: addressList,
            };
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.FetchBalance);
            return await axios
                .post<INetworkResponse>(
                    `${this.computeHost}${IAPIRoute.FetchBalance}`,
                    fetchBalanceBody,
                    headers,
                )
                .then((response) => {
                    return {
                        status: castAPIStatus(response.data.status),
                        reason: response.data.reason,
                        content: {
                            fetchBalanceResponse: response.data.content,
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Fetch pending DDE transaction from the compute node
     *
     * @deprecated due to security concerns.
     *
     * @param {string[]} druids - A list of DRUID values
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async fetchPendingDDETransactions(druids: string[]): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const fetchPendingBody = {
                druid_list: druids,
            };
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.FetchPending);
            return await axios
                .post<INetworkResponse>(
                    `${this.computeHost}${IAPIRoute.FetchPending}`,
                    fetchPendingBody,
                    headers,
                )
                .then((response) => {
                    return {
                        status: castAPIStatus(response.data.status),
                        reason: response.data.reason,
                        content: {
                            fetchPendingDDEResponse: response.data.content,
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     *  Create receipt-assets for a provided address/key-pair
     *
     * @param {IKeypairEncrypted} address - Key-pair to use for the creation of the receipt-assets
     * @param {boolean} [defaultDrsTxHash=true] - Whether to create `Receipt` assets that contain the default DRS identifier
     * @param {number} [amount=RECEIPT_DEFAULT] - The amount of `Receipt` assets to create
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async createReceipts(
        address: IKeypairEncrypted,
        defaultDrsTxHash = true,
        amount: number = RECEIPT_DEFAULT,
    ): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const keyPair = throwIfErr(this.keyMgmt.decryptKeypair(address));
            // Create receipt-creation transaction
            const createReceiptBody = throwIfErr(
                createReceiptPayload(
                    keyPair.secretKey,
                    keyPair.publicKey,
                    keyPair.version,
                    amount,
                    defaultDrsTxHash,
                ),
            );
            // Generate needed headers
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.CreateReceiptAsset);
            return await axios
                .post<INetworkResponse>(
                    `${this.computeHost}${IAPIRoute.CreateReceiptAsset}`,
                    createReceiptBody,
                    headers,
                )
                .then((response) => {
                    return {
                        status: castAPIStatus(response.data.status),
                        reason: response.data.reason,
                        content: {
                            createReceiptResponse: response.data.content,
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Make a payment of a specified token amount to a payment address
     *
     * @param {string} paymentAddress - Address to make the payment to
     * @param {number} paymentAmount - The amount of `Token` assets to pay
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @param {IKeypairEncrypted} excessKeypair - A key-pair provided to assign excess `Token` assets to (encrypted)
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    async makeTokenPayment(
        paymentAddress: string,
        paymentAmount: number,
        allKeypairs: IKeypairEncrypted[],
        excessKeypair: IKeypairEncrypted,
    ): Promise<IClientResponse> {
        const paymentAsset = initIAssetToken({ Token: paymentAmount });
        return this.makePayment(paymentAddress, paymentAsset, allKeypairs, excessKeypair);
    }

    /**
     * Make a `Receipt` payment of a specified amount and `drs_tx_hash`
     *
     * @param {string} paymentAddress - Address to make the payment to
     * @param {number} paymentAmount - Payment amount
     * @param {string} drsTxHash - DRS transaction hash
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @param {IKeypairEncrypted} excessKeypair - Key-pair (encrypted) to assign excess funds to
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    async makeReceiptPayment(
        paymentAddress: string,
        paymentAmount: number,
        drsTxHash: string,
        allKeypairs: IKeypairEncrypted[],
        excessKeypair: IKeypairEncrypted,
    ): Promise<IClientResponse> {
        const paymentAsset = initIAssetReceipt({
            Receipt: { amount: paymentAmount, drs_tx_hash: drsTxHash },
        });
        return this.makePayment(paymentAddress, paymentAsset, allKeypairs, excessKeypair);
    }

    /**
     * Make a receipt-based payment to a specified address
     *
     * @param {string} paymentAddress - Address to make the payment to
     * @param {(IAssetReceipt | IAssetToken)} sendingAsset - The asset to pay
     * @param {(IAssetReceipt | IAssetToken)} receivingAsset - The asset to receive
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @param {IKeypairEncrypted} receiveAddress - A key-pair to assign the "receiving" asset to
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async makeRbPayment(
        paymentAddress: string,
        sendingAsset: IAssetReceipt | IAssetToken,
        receivingAsset: IAssetReceipt | IAssetToken,
        allKeypairs: IKeypairEncrypted[],
        receiveAddress: IKeypairEncrypted,
    ): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const senderKeypair = throwIfErr(this.keyMgmt.decryptKeypair(receiveAddress));
            const [allAddresses, keyPairMap] = throwIfErr(
                this.keyMgmt.getAllAddressesAndKeypairMap(allKeypairs),
            );

            // Update balance
            const balance = await this.fetchBalance(allAddresses);
            if (balance.status !== 'success' || !balance.content?.fetchBalanceResponse)
                throw new Error(balance.reason);

            if (allAddresses.length === 0) throw new Error('No existing key-pairs provided');

            // Generate a DRUID value for this transaction
            const druid = throwIfErr(this.keyMgmt.getNewDRUID());

            const senderExpectation: IDruidExpectation = {
                from: '', // This field needs to be calculated by the other party and populated by us upon acceptance
                to: senderKeypair.address,
                asset: receivingAsset,
            };

            const receiverExpectation: IDruidExpectation = {
                from: '', // This is calculated by us after the transaction is created and then sent to the intercom server
                to: paymentAddress,
                asset: sendingAsset,
            };

            // Create "sender" half transaction with some missing data in DruidExpectations objects (`from`)
            const sendRbTxHalf = throwIfErr(
                createRbTxHalf(
                    balance.content.fetchBalanceResponse,
                    druid,
                    senderExpectation,
                    receiverExpectation,
                    senderKeypair.address,
                    keyPairMap,
                ),
            );

            // Create transaction struct has successfully been created
            // now we encrypt the created transaction for storage
            const encryptedTx = throwIfErr(this.keyMgmt.encryptTransaction(sendRbTxHalf.createTx));

            // Create "sender" details and expectations for intercom server
            receiverExpectation.from = throwIfErr(
                constructTxInsAddress(sendRbTxHalf.createTx.inputs),
            );
            if (sendRbTxHalf.createTx.druid_info === null)
                throw new Error(IErrorInternal.NoDRUIDValues);

            // Generate the values to be placed on the intercom server for the receiving party
            const valuePayload: IPendingRbTxDetails = {
                druid,
                senderExpectation,
                receiverExpectation,
                status: 'pending', // Status of the DDE transaction
                computeHost: this.computeHost,
            };
            const sendBody = [
                generateIntercomSetBody(
                    paymentAddress,
                    senderKeypair.address,
                    senderKeypair,
                    valuePayload,
                ),
            ];

            // Send the transaction details to the intercom server for the receiving party to inspect
            return await axios
                .post(`${this.intercomHost}${IAPIRoute.IntercomSet}`, sendBody)
                .then(() => {
                    // Payment now getting processed
                    return {
                        status: 'success',
                        reason: 'Receipt-based payment processing',
                        content: {
                            makeRbPaymentResponse: {
                                druid,
                                encryptedTx: encryptedTx,
                            },
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Accept a receipt-based payment
     *
     * @param {string} druid - Unique DRUID value associated with a receipt-based payment
     * @param {IResponseIntercom<IPendingRbTxDetails>} pendingResponse - Receipt-based transaction(s) information as received from the intercom server
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async acceptRbTx(
        druid: string,
        pendingResponse: IResponseIntercom<IPendingRbTxDetails>,
        allKeypairs: IKeypairEncrypted[],
    ): Promise<IClientResponse> {
        return this.handleRbTxResponse(druid, pendingResponse, 'accepted', allKeypairs);
    }

    /**
     * Reject a receipt-based payment
     *
     * @param {string} druid - Unique DRUID value associated with a receipt-based payment
     * @param {IResponseIntercom<IPendingRbTxDetails>} pendingResponse - Receipt-based transaction(s) information as received from the intercom server
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */

    public async rejectRbTx(
        druid: string,
        pendingResponse: IResponseIntercom<IPendingRbTxDetails>,
        allKeypairs: IKeypairEncrypted[],
    ): Promise<IClientResponse> {
        return this.handleRbTxResponse(druid, pendingResponse, 'rejected', allKeypairs);
    }

    /**
     * Fetch pending receipt-based payments from the Zenotta Intercom server
     *
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @param {ICreateTransactionEncrypted[]} allEncryptedTxs - A list of all existing saved transactions (encrypted)
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    public async fetchPendingRbTransactions(
        allKeypairs: IKeypairEncrypted[],
        allEncryptedTxs: ICreateTransactionEncrypted[],
    ): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);

            // Generate a key-pair map
            const [allAddresses, keyPairMap] = throwIfErr(
                this.keyMgmt.getAllAddressesAndKeypairMap(allKeypairs),
            );

            // DRUID - Encrypted Transaction Mapping
            const encryptedTxMap = new Map<string, ICreateTransactionEncrypted>();
            allEncryptedTxs.forEach((tx) => encryptedTxMap.set(tx.druid, tx));

            const pendingIntercom: IRequestIntercomGetBody[] = allAddresses
                .map((address) => {
                    if (!this.keyMgmt) return null;
                    const keyPair = keyPairMap.get(address);
                    if (!keyPair) return null;
                    return generateIntercomGetBody(address, keyPair);
                })
                .filter((input): input is IRequestIntercomGetBody => !!input); /* Filter array */

            // Get all pending RB transactions
            let responseData = await axios
                .post<IResponseIntercom<IPendingRbTxDetails>>(
                    `${this.intercomHost}${IAPIRoute.IntercomGet}`,
                    pendingIntercom,
                )
                .then((response) => {
                    return response.data;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });

            // NB: Validate receipt-based data and remove garbage entries
            responseData = filterValidIntercomData(responseData);

            // Get accepted and rejected receipt-based transactions
            const rbDataToDelete: IRequestIntercomDelBody[] = [];
            const [acceptedRbTxs, rejectedRbTxs] = [
                throwIfErr(
                    filterIntercomDataForPredicates(responseData, { status: 'accepted' }, true),
                ),
                throwIfErr(
                    filterIntercomDataForPredicates(responseData, { status: 'rejected' }, true),
                ),
            ];

            // We have accepted receipt-based payments to send to compute
            if (Object.entries(acceptedRbTxs).length > 0) {
                const transactionsToSend: ICreateTransaction[] = [];
                for (const acceptedTx of Object.values(acceptedRbTxs)) {
                    // Decrypt transaction stored along with DRUID value
                    const encryptedTx = encryptedTxMap.get(acceptedTx.value.druid);
                    if (!encryptedTx) throw new Error(IErrorInternal.InvalidDRUIDProvided);
                    const decryptedTransaction = throwIfErr(
                        this.keyMgmt.decryptTransaction(encryptedTx),
                    );

                    // Ensure this transaction is actually a DDE transaction
                    if (!decryptedTransaction.druid_info)
                        throw new Error(IErrorInternal.NoDRUIDValues);

                    // Set `from` address value from recipient by setting the entire expectation to the one received from the intercom server
                    decryptedTransaction.druid_info.expectations[0] =
                        acceptedTx.value.senderExpectation; /* There should be only one expectation in a receipt-based payment */

                    // Add to list of transactions to send to compute node
                    transactionsToSend.push(decryptedTransaction);
                    const keyPair = keyPairMap.get(acceptedTx.value.senderExpectation.to);
                    if (!keyPair) throw new Error(IErrorInternal.UnableToGetKeypair);

                    rbDataToDelete.push(
                        generateIntercomDelBody(
                            acceptedTx.value.senderExpectation.to,
                            acceptedTx.value.receiverExpectation.to,
                            keyPair,
                        ),
                    );
                }

                // Generate the required headers
                const headers = this.getRequestIdAndNonceHeadersForRoute(
                    IAPIRoute.CreateTransactions,
                );

                // Send transactions to compute for processing
                await axios
                    .post<INetworkResponse>(
                        // NB: Make sure we use the same compute host when initializing all receipt-based payments
                        `${this.computeHost}${IAPIRoute.CreateTransactions}`,
                        transactionsToSend,
                        headers,
                    )
                    .then(async (response) => {
                        if (castAPIStatus(response.data.status) === 'error')
                            throw new Error(response.data.reason);
                    })
                    .catch(async (error) => {
                        if (error instanceof Error) throw new Error(error.message);
                        else throw new Error(`${error}`);
                    });
            }

            // Add rejected receipt-based transactions to delete list as well
            if (Object.entries(rejectedRbTxs).length > 0) {
                for (const rejectedTx of Object.values(rejectedRbTxs)) {
                    const keyPair = keyPairMap.get(rejectedTx.value.senderExpectation.to);
                    if (!keyPair) throw new Error(IErrorInternal.UnableToGetKeypair);

                    rbDataToDelete.push(
                        generateIntercomDelBody(
                            rejectedTx.value.senderExpectation.to,
                            rejectedTx.value.receiverExpectation.to,
                            keyPair,
                        ),
                    );
                }
            }

            // Delete receipt-based data from intercom since the information is no longer relevant (accepted and rejected txs)
            if (rbDataToDelete.length > 0)
                await axios
                    .post(`${this.intercomHost}${IAPIRoute.IntercomDel}`, rbDataToDelete)
                    .catch(async (error) => {
                        if (error instanceof Error) throw new Error(error.message);
                        else throw new Error(`${error}`);
                    });

            return {
                status: 'success',
                reason: 'Succesfully fetched pending receipt-based transactions',
                content: {
                    fetchPendingRbResponse: responseData,
                },
            } as IClientResponse;
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Regenerates the addresses for a newly imported wallet (from seed phrase)
     *
     * @param seedPhrase
     * @param {string[]} addressList - A list of addresses to regenerate
     * @param {number} [seedRegenThreshold=SEED_REGEN_THRES] - Regeneration threshold
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    async regenAddresses(
        seedPhrase: string,
        addressList: string[],
        seedRegenThreshold: number = SEED_REGEN_THRES,
    ): Promise<IClientResponse> {
        try {
            if (!this.keyMgmt) throw new Error(IErrorInternal.ClientNotInitialized);
            const foundAddr = throwIfErr(
                this.keyMgmt.regenAddresses(seedPhrase, addressList, seedRegenThreshold),
            );
            if (foundAddr.length !== 0) {
                const encryptedKeypairs: IKeypairEncrypted[] = [];
                for (const addr of foundAddr) {
                    const encryptedKeypair = throwIfErr(this.keyMgmt.encryptKeypair(addr));
                    encryptedKeypairs.push(encryptedKeypair);
                }
                return {
                    status: 'success',
                    reason: 'Addresses have successfully been reconstructed',
                    content: {
                        regenWalletResponse: encryptedKeypairs,
                    },
                } as IClientResponse;
            } else throw new Error(IErrorInternal.UnableToFindNonEmptyAddresses);
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Generates a new key-pair
     *
     * @param {string[]} allAddresses - A list of all public addresses (used to avoid re-generating the same key-pair)
     * @return {*}  {IClientResponse}
     * @memberof ZenottaInstance
     */
    getNewKeypair(allAddresses: string[]): IClientResponse {
        try {
            if (!this.keyMgmt) throw new Error(IErrorInternal.ClientNotInitialized);
            return {
                status: 'success',
                reason: 'Successfully generated new address',
                content: {
                    newKeypairResponse: throwIfErr(this.keyMgmt.getNewKeypair(allAddresses)),
                },
            } as IClientResponse;
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            };
        }
    }

    /**
     * Get the existing seed phrase, or generate a new one
     *
     * @return {*}  {IClientResponse}
     * @memberof ZenottaInstance
     */
    getSeedPhrase(): IClientResponse {
        try {
            if (!this.keyMgmt) throw new Error(IErrorInternal.ClientNotInitialized);
            return {
                status: 'success',
                reason: 'Successfully obtained seed phrase',
                content: {
                    getSeedPhraseResponse: throwIfErr(this.keyMgmt.getSeedPhrase()),
                },
            };
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            };
        }
    }

    /**
     * Get the existing master key in an encrypted format
     *
     * @return {*}  {IClientResponse}
     * @memberof ZenottaInstance
     */
    getMasterKey(): IClientResponse {
        try {
            if (!this.keyMgmt) throw new Error(IErrorInternal.ClientNotInitialized);
            return {
                status: 'success',
                reason: 'Successfully obtained master key',
                content: {
                    getMasterKeyResponse: throwIfErr(this.keyMgmt.getMasterKey()),
                },
            };
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            };
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Utils                                   */

    /* -------------------------------------------------------------------------- */

    /**
     * Make a payment of a certain asset to a specified destination
     *
     * @private
     * @param {string} paymentAddress - Address to make the payment to
     * @param {(IAssetToken | IAssetReceipt)} paymentAsset - The asset to send
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @param {IKeypairEncrypted} excessKeypair - A key-pair (encrypted) to assign excess funds to
     * @return {*}
     * @memberof ZenottaInstance
     */
    private async makePayment(
        paymentAddress: string,
        paymentAsset: IAssetToken | IAssetReceipt,
        allKeypairs: IKeypairEncrypted[],
        excessKeypair: IKeypairEncrypted,
    ) {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const [allAddresses, keyPairMap] = throwIfErr(
                this.keyMgmt.getAllAddressesAndKeypairMap(allKeypairs),
            );

            // First update balance
            const balance = await this.fetchBalance(allAddresses);
            if (balance.status !== 'success' || !balance.content?.fetchBalanceResponse)
                throw new Error(balance.reason);

            // Get all existing addresses
            if (allKeypairs.length === 0) throw new Error('No existing key-pairs provided');

            // Create transaction
            const paymentBody = throwIfErr(
                createPaymentTx(
                    paymentAddress,
                    paymentAsset,
                    excessKeypair.address,
                    balance.content.fetchBalanceResponse,
                    keyPairMap,
                ),
            );

            // Generate the needed headers
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.CreateTransactions);

            // Send transaction to compute for processing
            return await axios
                .post<INetworkResponse>(
                    `${this.computeHost}${IAPIRoute.CreateTransactions}`,
                    [paymentBody.createTx],
                    headers,
                )
                .then((response) => {
                    const responseData = response.data as INetworkResponse;
                    return {
                        status: castAPIStatus(responseData.status),
                        reason: responseData.reason,
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Handle a receipt-based payment by either accepting or rejecting the payment
     *
     * @private
     * @param {string} druid - Unique DRUID value associated with this payment
     * @param {IResponseIntercom<IPendingRbTxDetails>} pendingResponse - Pending receipt-based payments response as received from the intercom server
     * @param {('accepted' | 'rejected')} status - Status to se the payment to
     * @param {IKeypairEncrypted[]} allKeypairs - A list of all existing key-pairs (encrypted)
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    private async handleRbTxResponse(
        druid: string,
        pendingResponse: IResponseIntercom<IPendingRbTxDetails>,
        status: 'accepted' | 'rejected',
        allKeypairs: IKeypairEncrypted[],
    ): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const [allAddresses, keyPairMap] = throwIfErr(
                this.keyMgmt.getAllAddressesAndKeypairMap(allKeypairs),
            );

            // Update balance
            const balance = await this.fetchBalance(allAddresses);
            if (balance.status !== 'success' || !balance.content?.fetchBalanceResponse)
                throw new Error(balance.reason);

            // Find specified DRUID value and entry that is still marked as 'pending'
            const rbDataForDruid = throwIfErr(
                filterIntercomDataForPredicates<IPendingRbTxDetails>(pendingResponse, {
                    druid: druid /* Filter for specific DRUID value */,
                    status: 'pending' /* Filter for status which is still 'pending' */,
                }),
            );

            // We assume that the filtered data should contain a single key-value pair since DRUID values are unique
            const txInfo = throwIfErr(formatSingleCustomKeyValuePair(rbDataForDruid)).value.value;

            // Get the key-pair assigned to this receiver address
            const receiverKeypair = keyPairMap.get(txInfo.receiverExpectation.to);
            if (!receiverKeypair) throw new Error('Unable to retrieve key-pair from map');

            // Set the status of the pending request
            txInfo.status = status;

            // Handle case for 'accepted'; create and send transaction to compute node
            if (status === 'accepted') {
                const sendRbTxHalf = throwIfErr(
                    // Sender expectation and receiver expectation context is switched
                    // in comparison to `makeRbPayment` since we are the receiving party
                    createRbTxHalf(
                        balance.content.fetchBalanceResponse,
                        druid,
                        txInfo.receiverExpectation, // What we expect from the other party
                        txInfo.senderExpectation, // What the other party can expect from us
                        receiverKeypair.address,
                        keyPairMap,
                    ),
                );

                // Construct our 'from` address using our transaction inputs
                txInfo.senderExpectation.from = throwIfErr(
                    constructTxInsAddress(sendRbTxHalf.createTx.inputs),
                );

                // Generate the required headers
                const headers = this.getRequestIdAndNonceHeadersForRoute(
                    IAPIRoute.CreateTransactions,
                );

                // Send transaction to compute to be added to the current DRUID pool
                await axios
                    .post<INetworkResponse>(
                        // We send this transaction to the compute node specified by the sending party
                        `${txInfo.computeHost}${IAPIRoute.CreateTransactions}`,
                        [sendRbTxHalf.createTx],
                        headers,
                    )
                    .then((response) => {
                        const responseData = response.data as INetworkResponse;
                        if (castAPIStatus(responseData.status) !== 'success')
                            throw new Error(responseData.reason);
                    })
                    .catch(async (error) => {
                        if (error instanceof Error) throw new Error(error.message);
                        else throw new Error(`${error}`);
                    });
            }

            // Send the updated status of the transaction on the intercom server
            const setBody = [
                generateIntercomSetBody<IPendingRbTxDetails>(
                    txInfo.senderExpectation.to,
                    txInfo.receiverExpectation.to,
                    receiverKeypair,
                    txInfo,
                ),
            ];

            // Update the transaction details on the intercom server
            await axios
                .post(`${this.intercomHost}${IAPIRoute.IntercomSet}`, setBody)
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });

            return {
                status: 'success',
                reason: 'Successfully responded to receipt-based payment',
            } as IClientResponse;
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            };
        }
    }

    /**
     * Get information regarding the PoW required for all routes
     *
     * @private
     * @return {*}  {Promise<IClientResponse>}
     * @memberof ZenottaInstance
     */
    private async getDebugData(): Promise<IClientResponse> {
        try {
            if (!this.computeHost || !this.intercomHost || !this.keyMgmt || !this.routesPoW)
                throw new Error(IErrorInternal.ClientNotInitialized);
            const headers = this.getRequestIdAndNonceHeadersForRoute(IAPIRoute.DebugData);
            return await axios
                .get<INetworkResponse>(`${this.computeHost}${IAPIRoute.DebugData}`, headers)
                .then(async (response) => {
                    return {
                        status: castAPIStatus(response.data.status),
                        reason: response.data.reason,
                        content: {
                            debugDataResponse: response.data.content,
                        },
                    } as IClientResponse;
                })
                .catch(async (error) => {
                    if (error instanceof Error) throw new Error(error.message);
                    else throw new Error(`${error}`);
                });
        } catch (error) {
            return {
                status: 'error',
                reason: `${error}`,
            } as IClientResponse;
        }
    }

    /**
     * Generate a unique request ID as well as the corresponding
     * nonce required for a route
     *
     * @private
     * @param {string} route
     * @return {*}  {{
     *         headers: {
     *             'x-request-id': string;
     *             'x-nonce': number;
     *         };
     *     }}
     * @memberof ZenottaInstance
     */
    private getRequestIdAndNonceHeadersForRoute(route: string): {
        headers: {
            'x-request-id': string;
            'x-nonce': number;
        };
    } {
        if (!this.routesPoW) throw new Error(IErrorInternal.ClientNotInitialized);
        const routeDifficulty = this.routesPoW.get(route.slice(1)); // Slice removes the '/' prefix
        return { ...DEFAULT_HEADERS, ...createIdAndNonceHeaders(routeDifficulty) };
    }
}
