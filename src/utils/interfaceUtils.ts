/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, ok } from 'neverthrow';
import {
    IAssetToken,
    IAssetReceipt,
    IDruidExpectation,
    IPendingRbTxDetails,
    IResult,
    IErrorInternal,
} from '../interfaces';
import { DEFAULT_DRS_TX_HASH } from '../mgmt';

/* -------------------------------------------------------------------------- */
/*                      Utilities for Custom Type Guards                      */
/* -------------------------------------------------------------------------- */

/**
 *  Initialize an empty structure of type `IAssetToken`, providing optional additional values
 *
 * @export
 * @param {Partial<IAssetToken>} [options] - Optional additional values to initialize the structure with
 * @return {*}  {IAssetToken}
 */
export function initIAssetToken(options?: Partial<IAssetToken>): IAssetToken {
    const defaults: IAssetToken = {
        Token: 0,
    };

    return {
        ...defaults,
        ...options,
    };
}

/**
 * Initialize an empty structure of type `IAssetReceipt`, providing optional additional values
 *
 * @export
 * @param {Partial<IAssetReceipt>} [options] - Optional additional values to initialize the structure with
 * @return {*}  {IAssetReceipt}
 */
export function initIAssetReceipt(options?: Partial<IAssetReceipt>): IAssetReceipt {
    const defaults: IAssetReceipt = {
        Receipt: {
            amount: 0,
            drs_tx_hash: DEFAULT_DRS_TX_HASH,
        },
    };

    return {
        ...defaults,
        ...options,
    };
}

/**
 * Initialize an empty structure of type `IDruidExpectation`, providing optional additional values
 *
 * @export
 * @param {Partial<IDruidExpectation>} [options] - Optional additional values to initialize the structure with
 * @return {*}  {IDruidExpectation}
 */
export function initIDruidExpectation(options?: Partial<IDruidExpectation>): IDruidExpectation {
    const defaults: IDruidExpectation = {
        from: '',
        to: '',
        asset: initIAssetToken(),
    };

    return {
        ...defaults,
        ...options,
    };
}

/**
 * Initialize an empty structure of type `IPendingRbTxDetails`, providing optional additional values
 *
 * @export
 * @param {Partial<IPendingRbTxDetails>} [options] - Optional additional values to initialize the structure with
 * @return {*}  {IPendingRbTxDetails}
 */
export function initIPendingRbTxDetails(
    options?: Partial<IPendingRbTxDetails>,
): IPendingRbTxDetails {
    const defaults: IPendingRbTxDetails = {
        druid: '',
        senderExpectation: initIDruidExpectation(),
        receiverExpectation: initIDruidExpectation(),
        status: 'pending',
        computeHost: '',
    };

    return {
        ...defaults,
        ...options,
    };
}

/**
 * Add left-hand-side asset to right-hand-side asset
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {(IResult<IAssetToken | IAssetReceipt>)}
 */
export const addLhsAssetToRhsAsset = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<IAssetToken | IAssetReceipt> => {
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs)) {
        const returnValue: IAssetToken = {
            Token: lhs.Token + rhs.Token,
        };
        return ok(returnValue);
    } else if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash
    ) {
        const returnValue: IAssetReceipt = {
            Receipt: {
                amount: lhs.Receipt.amount + rhs.Receipt.amount,
                drs_tx_hash: lhs.Receipt.drs_tx_hash,
            },
        };
        return ok(returnValue);
    } else {
        return err(IErrorInternal.AssetsIncompatible);
    }
};

/**
 * Subtract the right-hand-side asset from the left-hand-side asset
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {(IResult<IAssetToken | IAssetReceipt>)}
 */
export const subRhsAssetFromLhsAsset = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<IAssetToken | IAssetReceipt> => {
    const lhsAssetGreaterOrEq = lhsAssetIsEqOrGreaterThanRhsAsset(lhs, rhs);
    // Assets are incompatible due to different asset types or to lhs < rhs (we cannot have a negative asset amount)
    if (lhsAssetGreaterOrEq.isErr()) return err(IErrorInternal.AssetsIncompatible);
    if (lhsAssetGreaterOrEq.isOk() && !lhsAssetGreaterOrEq.value)
        err(IErrorInternal.AssetsIncompatible);
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs) && lhsAssetGreaterOrEq.value) {
        const returnValue: IAssetToken = {
            Token: lhs.Token - rhs.Token,
        };
        return ok(returnValue);
    } else if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash &&
        lhsAssetGreaterOrEq.value
    ) {
        const returnValue: IAssetReceipt = {
            Receipt: {
                amount: lhs.Receipt.amount - rhs.Receipt.amount,
                drs_tx_hash: lhs.Receipt.drs_tx_hash,
            },
        };
        return ok(returnValue);
    } else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine whether the left-hand-side asset is equal to, or greater than the right-hand-side asset
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {IResult<boolean>}
 */
export const lhsAssetIsEqOrGreaterThanRhsAsset = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<boolean> => {
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs)) return ok(lhs.Token >= rhs.Token);
    else if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash
    )
        return ok(lhs.Receipt.amount >= rhs.Receipt.amount);
    else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine whether the left-hand-side asset is greater than the right-hand-side asset
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {IResult<boolean>}
 */
export const lhsAssetIsGreaterThanRhsAsset = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<boolean> => {
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs)) return ok(lhs.Token > rhs.Token);
    else if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash
    )
        return ok(lhs.Receipt.amount > rhs.Receipt.amount);
    else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine whether the left-hand-side asset is less than the right-hand-side asset
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {IResult<boolean>}
 */
export const lhsAssetIsLessThanRhsAsset = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<boolean> => {
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs)) return ok(lhs.Token < rhs.Token);
    else if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash
    )
        return ok(lhs.Receipt.amount < rhs.Receipt.amount);
    else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine whether an asset is of type `IAssetToken`
 *
 * @param {*} value
 * @return {*}  {value is IAssetToken}
 */
export const isOfTypeIAssetToken = (value: any): value is IAssetToken =>
    isOfType<IAssetToken>(value, initIAssetToken());

/**
 *  Determine whether an asset is of type `IAssetReceipt`
 *
 * @param {*} value
 * @return {*}  {value is IAssetReceipt}
 */
export const isOfTypeIAssetReceipt = (value: any): value is IAssetReceipt =>
    isOfType<IAssetReceipt>(value, initIAssetReceipt());

/**
 *   Determine whether the provided value is of type `IPendingRbTxDetails`
 *
 * @param {*} value
 * @return {*}  {value is IPendingRbTxDetails}
 */
export const isOfTypeIPendingRbTxDetails = (value: any): value is IPendingRbTxDetails =>
    isOfType<IPendingRbTxDetails>(value, initIPendingRbTxDetails());

/**
 *
 *
 * @template T
 * @param {*} arg
 * @param {*} testAgainst
 * @return {*}  {arg is T}
 */
export const isOfType = <T>(arg: any, testAgainst: any): arg is T =>
    Object.entries(testAgainst).every(
        ([key]) => key in arg && typeof arg[key] === typeof testAgainst[key],
    );

/**
 * Determine whether two assets are of type `IAssetToken`
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {IResult<[IAssetToken, IAssetToken]>}
 */
export const assetsAreBothTokens = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<[IAssetToken, IAssetToken]> => {
    if (isOfTypeIAssetToken(lhs) && isOfTypeIAssetToken(rhs)) return ok([lhs, rhs]);
    else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine wheter two assets are `IAssetReceipt` assets which are compatible based on their DRS transaction hash
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {IResult<[IAssetReceipt, IAssetReceipt]>}
 */
export const assetsAreBothCompatibleReceipts = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): IResult<[IAssetReceipt, IAssetReceipt]> => {
    if (
        isOfTypeIAssetReceipt(lhs) &&
        isOfTypeIAssetReceipt(rhs) &&
        lhs.Receipt.drs_tx_hash === rhs.Receipt.drs_tx_hash
    )
        return ok([lhs, rhs]);
    else return err(IErrorInternal.AssetsIncompatible);
};

/**
 * Determine whether or not two assets are compatible
 *
 * @param {(IAssetToken | IAssetReceipt)} lhs
 * @param {(IAssetToken | IAssetReceipt)} rhs
 * @return {*}  {boolean}
 */
export const assetsAreCompatible = (
    lhs: IAssetToken | IAssetReceipt,
    rhs: IAssetToken | IAssetReceipt,
): boolean => {
    return assetsAreBothTokens(lhs, rhs).isOk() || assetsAreBothCompatibleReceipts(lhs, rhs).isOk();
};
