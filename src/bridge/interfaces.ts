/**
 * Interface for relationship between 2 partners for a bridge trade.
 * The status indicates at what point in the trade the relationship is.
 * Numbers correspond to the following:
 *
 * - 0: Relationship initiated, fresh test to be signed
 * - 1: Fresh test signed, waiting for partner to sign
 * - 2: Both sides have signed, the trade can continue
 * - 3: First transaction stage, with multisig tx
 * - 4: First transaction stage checked and approved
 * - 5: Second transaction stage, as partial
 * - 6: Third transaction stage, DDE to Zenotta Mempool
 * - 7: DDE transaction complete, fetch Zenotta signature
 * - 8: Trade completed
 * - null: Failure to complete (more reason given in `reasonForFailure` attribute)
 */
export type ITradeProgress = {
    status: number | null;
    lastEvent: Date;
    ourAddress: string;
    reasonForFailure: string | null;
};

/**
 * Rust-like Result monad for handling errors
 */
export type IPromiseResult<T> = Promise<T | Error>;

/**
 * Test for public key freshness on intercom
 */
export type IFreshTest = {
    publicKey: string;
    message: string;
    signature: string | null;
};

/* -------------------------------------------------------------------------- */
/*                       Interfaces for Zenotta                               */
/* -------------------------------------------------------------------------- */

export type IZenExpectations = {
    ourAddress: string;
    amount: number;
};

/* -------------------------------------------------------------------------- */
/*                       Interfaces for BitCoin                               */
/* -------------------------------------------------------------------------- */

export type IFetchBtcUtxoResponse = {
    inputs: any[]; // unfortunately has to be any due to UnspentOut in bitcore-lib not being exportable
    totalAmountAvailable: number;
};

export type ITxStage1ScriptInput = {
    theirAddress: string;
    ourReturnAddress: string;
    zenottasAddress: string;
    daysToLock: number;
    startBlockHeight: number;
};

export type IBtcExpectations = {
    ourAddress: string;
    zenottasAddress: string;
    amount: number; // in satoshis
};
