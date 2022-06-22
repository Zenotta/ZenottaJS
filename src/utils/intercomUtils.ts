/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, ok } from 'neverthrow';
import {
    IErrorInternal,
    IKeypair,
    IRequestIntercomDelBody,
    IRequestIntercomGetBody,
    IRequestIntercomSetBody,
    IResponseIntercom,
    IResult,
} from '../interfaces';
import { createSignature } from '../mgmt';
import { isOfTypeIPendingRbTxDetails } from './interfaceUtils';

/**
 * Filter data received from the intercom server for a list of pre-defined predicates
 *
 * @export
 * @template T - Template of object structure expected from the intercom server
 * @param {IResponseIntercom<T>} intercomData - Data as received from the intercom server
 * @param {Partial<{ [key in keyof T]: T[keyof T] }>} predicates - A list of predicates to filter for
 * @param {boolean} [canBeEmpty=false] - Indication of whether it should be possible to receive an empty list of filtered results
 * @return {*}  {IResult<IResponseIntercom<T>>}
 */
export function filterIntercomDataForPredicates<T>(
    intercomData: IResponseIntercom<T>,
    predicates: Partial<{ [key in keyof T]: T[keyof T] }>,
    canBeEmpty = false,
): IResult<IResponseIntercom<T>> {
    const filteredData: IResponseIntercom<T> = {};
    Object.entries(filterValidIntercomData(intercomData))
        .filter(([, value]) =>
            Object.entries(predicates).every(
                ([predicateKey, predicateValue]) =>
                    (value.value as any)[predicateKey] === predicateValue,
            ),
        )
        .forEach(([key, value]) => (filteredData[key] = value));
    if (Object.entries(filteredData).length === 0 && !canBeEmpty)
        return err(IErrorInternal.UnableToFilterIntercomData);
    return ok(filteredData);
}

/**
 * Generate the needed request body to retrieve data from the intercom server
 *
 * @export
 * @param {string} addressKey
 * @param {IKeypair} keyPairForKey
 * @return {*}  {IRequestIntercomGetBody}
 */
export function generateIntercomGetBody(
    addressKey: string,
    keyPairForKey: IKeypair,
): IRequestIntercomGetBody {
    return {
        key: addressKey,
        publicKey: Buffer.from(keyPairForKey.publicKey).toString('hex'),
        signature: Buffer.from(
            createSignature(
                keyPairForKey.secretKey,
                Uint8Array.from(Buffer.from(addressKey, 'hex')),
            ),
        ).toString('hex'),
    } as IRequestIntercomGetBody;
}

/**
 * Generate the needed request body to place data on the intercom server
 *
 * @export
 * @template T
 * @param {string} addressKey
 * @param {string} addressField
 * @param {IKeypair} keyPairForField
 * @param {T} value
 * @return {*}  {IRequestIntercomSetBody<T>}
 */
export function generateIntercomSetBody<T>(
    addressKey: string,
    addressField: string,
    keyPairForField: IKeypair,
    value: T,
): IRequestIntercomSetBody<T> {
    return {
        key: addressKey,
        field: addressField,
        signature: Buffer.from(
            createSignature(
                keyPairForField.secretKey,
                Uint8Array.from(Buffer.from(addressField, 'hex')),
            ),
        ).toString('hex'),
        publicKey: Buffer.from(keyPairForField.publicKey).toString('hex'),
        value,
    } as IRequestIntercomSetBody<T>;
}

/**
 * Generate the needed request body to delete data from the intercom server
 *
 * @export
 * @param {string} addressKey
 * @param {string} addressField
 * @param {IKeypair} keyPairForKey
 * @return {*}  {IRequestIntercomDelBody}
 */
export function generateIntercomDelBody(
    addressKey: string,
    addressField: string,
    keyPairForKey: IKeypair,
): IRequestIntercomDelBody {
    return {
        key: addressKey,
        field: addressField,
        signature: Buffer.from(
            createSignature(
                keyPairForKey.secretKey,
                Uint8Array.from(Buffer.from(addressKey, 'hex')),
            ),
        ).toString('hex'),
        publicKey: Buffer.from(keyPairForKey.publicKey).toString('hex'),
    } as IRequestIntercomDelBody;
}

/**
 * Remove garbage entries from data received from the intercom server based on the provided template
 *
 * @export
 * @template T - Template of data structure expected from the intercom server
 * @param {IResponseIntercom<T>} pending - Data as received from the intercom server
 * @return {*}  {IResponseIntercom<T>}
 */
export function filterValidIntercomData<T>(pending: IResponseIntercom<T>): IResponseIntercom<T> {
    // We test against this body structure to ensure that the data is valid
    const returnValue: IResponseIntercom<T> = {};
    Object.entries(pending)
        .filter(([, entry]) => isOfTypeIPendingRbTxDetails(entry.value))
        .forEach(([key, value]) => (returnValue[key] = value));
    return returnValue;
}
