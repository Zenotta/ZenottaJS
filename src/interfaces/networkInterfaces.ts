/* -------------------------------------------------------------------------- */
/*                                 API Routes                                 */
/* -------------------------------------------------------------------------- */

import {
    IGenericKeyPair,
    IOutPoint,
    IAssetReceipt,
    IAssetToken,
    IDruidDroplet,
    IDruidExpectation,
    IApiContentType,
    ICreateTransaction,
} from '.';

export enum IAPIRoute {
    /* ------------------------------- ZNP Routes ------------------------------- */
    DebugData = '/debug_data',
    FetchBalance = '/fetch_balance',
    SignableTransactions = '/signable_transactions' /* NOTE: No implementation */,
    CreateTransactions = '/create_transactions',
    CheckUpdate = '/check_update',
    AddressConstruction = '/address_construction' /* NOTE: No implementation */,
    GetUtxoAddressList = '/utxo_addresses',
    CreateReceiptAsset = '/create_receipt_asset',
    FetchPending = '/fetch_pending' /* NOTE: Currently not available */,
    /* ----------------------------- Intercom Routes ---------------------------- */
    IntercomSet = '/set_data',
    IntercomGet = '/get_data',
    IntercomDel = '/del_data',
    /* ------------------------------ Helix Routes ------------------------------ */
    GetMempoolKey = '/get_mempool_key',
    GetMempoolSignature = '/get_mempool_signature',
}

/* -------------------------------------------------------------------------- */
/*                               ZNP Interfaces                               */
/* -------------------------------------------------------------------------- */

/* --------------------------- Response Structures -------------------------- */

// Response structure received from compute API endpoints
export type INetworkResponse = {
    id?: string;
    status: 'Success' | 'Error' | 'InProgress' | 'Unknown';
    reason?: string;
    route?: string;
    content?: IApiContentType;
};

// `/debug_data` endpoint response
export type IDebugDataResponse = {
    node_type: string;
    node_api: string[];
    node_peers: string[];
    routes_pow: IGenericKeyPair<number>;
};

// `/fetch_balance` endpoint response
export type IFetchBalanceResponse = {
    total: {
        tokens: number;
        receipts: IGenericKeyPair<number>;
    };
    address_list: IGenericKeyPair<{ out_point: IOutPoint; value: IAssetReceipt | IAssetToken }[]>;
};

// `/utxo_addresses` endpoint response
export type IFetchUtxoAddressesResponse = string[];

// `/create_receipt_asset` endpoint response
export type ICreateReceiptResponse = {
    asset: {
        asset: IAssetReceipt;
        metadata: number[] | null;
    };
    to_address: string;
    tx_hash: string;
};

// `/fetch_pending` endpoint response
export type IFetchPendingDDEResponse = {
    pending_transactions: { [key: string]: IDruidDroplet[] };
};

export type IGetMempoolKeyResponse = {
    public_key: string;
};

export type IGetMempoolSignatureResponse = {
    public_key: string;
    signature: string;
};

/* --------------------------- Payload Structures --------------------------- */

export enum IDrsTxHashSpecification {
    Create = 'Create',
    Default = 'Default',
}

// `/create_receipt_asset` payload structure
export type IReceiptCreationAPIPayload = {
    receipt_amount: number;
    script_public_key: string;
    public_key: string;
    signature: string;
    version: number | null;
    drs_tx_hash_spec: IDrsTxHashSpecification;
};
// `/create_transactions` payload structure
export type ICreateTxPayload = {
    createTx: ICreateTransaction;
    excessAddressUsed: boolean;
    usedAddresses: string[];
};

/* -------------------------------------------------------------------------- */
/*                         Zenotta Intercom Interfaces                        */
/* -------------------------------------------------------------------------- */

export type IResponseIntercom<T> = {
    // Address that placed the data : IRedisFieldEntry<T>;
    [key: string]: IRedisFieldEntry<T>;
};

export type IRequestIntercomSetBody<T> = {
    key: string;
    field: string;
    publicKey: string;
    signature: string;
    value: T;
};

export type IRequestIntercomDelBody = {
    key: string;
    field: string;
    publicKey: string;
    signature: string;
};

export type IRequestIntercomGetBody = {
    key: string;
    publicKey: string;
    signature: string;
};

export type IRedisFieldEntry<T> = {
    timestamp: number;
    value: T;
};

// NOTE: This data structure can be changed to anything and it will still be supported by the intercom server
export type IPendingRbTxDetails = {
    druid: string; // Value to bind transactions together
    senderExpectation: IDruidExpectation;
    receiverExpectation: IDruidExpectation;
    status: 'pending' | 'rejected' | 'accepted'; // Status of the DDE transaction
    computeHost: string; // Correlation between clients; send txs to the same compute node; chosen by the sender
};
