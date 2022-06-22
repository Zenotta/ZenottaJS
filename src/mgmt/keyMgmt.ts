/* eslint-disable @typescript-eslint/no-explicit-any */
import { truncateByBytesUTF8, getStringBytes, getHexStringBytes } from '../utils';
import { bytesToBase64 } from 'byte-base64';
import { sha3_256 } from 'js-sha3';
import nacl from 'tweetnacl';
import { TEMP_ADDRESS_VERSION, ADDRESS_VERSION } from './constants';
import Mnemonic from 'bitcore-mnemonic';
import { err, ok } from 'neverthrow';
import { IResult, IErrorInternal, IMasterKey, IKeypair } from '../interfaces';
import { throwIfErr } from '../utils';

/**
 * Get the address version for either a given public key and address
 * , or a version number
 *
 * The result is formatted for network operations
 *
 * @param {Uint8Array} publicKey - Public key
 * @param {string} address - Public address associated with public key
 * @param version - Address version
 * @return {*}  {(number | null)}
 */
export function getAddressVersion(
    publicKey?: Uint8Array,
    address?: string,
    version?: number | null,
): IResult<number | null> {
    if (publicKey && address) {
        const tempAddress = constructAddress(publicKey, TEMP_ADDRESS_VERSION);
        if (tempAddress.isErr()) return err(tempAddress.error);
        const defaultAddress = constructAddress(publicKey, ADDRESS_VERSION);
        if (defaultAddress.isErr()) return err(defaultAddress.error);
        switch (address) {
            case tempAddress.value:
                return ok(TEMP_ADDRESS_VERSION); /* Temporary address structure */
            case defaultAddress.value:
                return ok(null); /* New address structure */
            default:
                return err(IErrorInternal.InvalidAddressVersion);
        }
    } else if (version != null) {
        switch (version) {
            case TEMP_ADDRESS_VERSION:
                return ok(TEMP_ADDRESS_VERSION);
            case ADDRESS_VERSION:
                return ok(ADDRESS_VERSION);
            default:
                return err(IErrorInternal.InvalidAddressVersion);
        }
    } else {
        return err(IErrorInternal.InvalidParametersProvided);
    }
}

/**
 * Generates a new seed phrase
 */
export function generateSeed(): IResult<string> {
    try {
        const seed = new Mnemonic();
        return ok(seed.toString());
    } catch {
        return err(IErrorInternal.UnableToGenerateSeed);
    }
}

/**
 * Converts the given passphrase to a 32 byte Uint8Array
 *
 * @param passphrase {string} - Passphrase as a string
 */
export function getPassphraseBuffer(passphrase: string): IResult<Uint8Array> {
    try {
        const hash = sha3_256(passphrase);
        const val = truncateByBytesUTF8(hash, 32);
        return ok(getStringBytes(val));
    } catch {
        return err(IErrorInternal.UnableToGetPassphraseBuffer);
    }
}

/**
 * Generates a new master key, seed phrase optional.
 * If no seed phrase is provided, a new one will be generated and returned.
 * If a seed phrase is provided, it's assumed to be in `Buffer` format
 *
 * @param seed {string} - Seed phrase
 * @param passphrase {string} - Passphrase as a string
 */
export function generateMasterKey(seed?: string, passphrase?: string): IResult<IMasterKey> {
    try {
        const genInput = seed || Mnemonic.Words.ENGLISH.join(' ');
        const mGen = new Mnemonic(genInput);
        return ok({
            secret: mGen.toHDPrivateKey(passphrase || ''),
            seed: seed || mGen.toString(),
        } as IMasterKey);
    } catch {
        return err(IErrorInternal.InvalidSeedPhrase);
    }
}

/**
 *  Generates a new keypair, potentially from seed
 *
 * @export
 * @param {*} [version=ADDRESS_VERSION] - Address version
 * @param {Uint8Array} [seed] - Seed phrase as UInt8Array
 * @return {*}  {IResult<IKeypair>}
 */
export function generateKeypair(version = ADDRESS_VERSION, seed?: Uint8Array): IResult<IKeypair> {
    try {
        if (seed && seed.length != 32) {
            seed = seed.slice(0, 32);
        }
        const keypairRaw = seed ? nacl.sign.keyPair.fromSeed(seed) : nacl.sign.keyPair();
        const address = throwIfErr(constructAddress(keypairRaw.publicKey, version));
        return ok({
            address: address,
            secretKey: keypairRaw.secretKey,
            publicKey: keypairRaw.publicKey,
            version: version,
        } as IKeypair);
    } catch {
        return err(IErrorInternal.UnableToGenerateKeypair);
    }
}

/**
 *  Generates the next keypair at a given derivation depth
 *
 * @export
 * @param {IMasterKey} masterKey - Master key in an unencrypted format
 * @param {number} depth - Desired derivation depth
 * @param {*} [version=ADDRESS_VERSION] - Address version
 * @return {*}  {IResult<IKeypair>}
 */
export function getNextDerivedKeypair(
    masterKey: IMasterKey,
    depth: number,
    version = ADDRESS_VERSION,
): IResult<IKeypair> {
    try {
        const seedKeyRaw = masterKey.secret.deriveChild(depth, true);
        const seedKey = getStringBytes(seedKeyRaw.xprivkey);
        return generateKeypair(version, seedKey);
    } catch {
        return err(IErrorInternal.UnableToDeriveNextKeypair);
    }
}

/**
 * Constructs an address from the provided public key
 *
 * @param publicKey {Uint8Array} - Public key as Uint8Array
 * @param version {number} - Address version
 */
export function constructAddress(publicKey: Uint8Array, version: number | null): IResult<string> {
    switch (version) {
        case TEMP_ADDRESS_VERSION:
            return constructVersionTempAddress(publicKey);
        case ADDRESS_VERSION:
            return constructVersionDefaultAddress(publicKey);
        default:
            return err(IErrorInternal.InvalidAddressVersion);
    }
}

/**
 * Constructs the address from the provided public key given the default version.
 *
 * @param publicKey {Uint8Array}- Public key as Uint8Array
 * @returns
 */
export function constructVersionDefaultAddress(publicKey: Uint8Array): IResult<string> {
    try {
        return ok(sha3_256(publicKey));
    } catch {
        return err(IErrorInternal.UnableToConstructDefaultAddress);
    }
}

/**
 * Constructs the address from the provided public key given the temporary version.
 * NOTE: Not to be used unless specifically needed
 *
 * @param publicKey {Uint8Array} - Public key as Uint8Array
 * @returns
 */
export function constructVersionTempAddress(publicKey: Uint8Array): IResult<string> {
    try {
        return ok(sha3_256(getHexStringBytes(bytesToBase64(publicKey))));
    } catch {
        return err(IErrorInternal.UnableToConstructTempAddress);
    }
}

/**
 * Signs a message with a provided private key
 *
 * @param secretKey {Uint8Array} - Secret key used to sign the message as Uint8Array
 * @param message {Uint8Array} - Message to sign as Uint8Array
 */
export function createSignature(secretKey: Uint8Array, message: Uint8Array): Uint8Array {
    return nacl.sign.detached(message, secretKey);
}

/**
 * Generates a new keypair from a given master key and address version
 *
 * TODO: Use a provided depth instead of the entire address list
 *
 * @export
 * @param {IMasterKey} masterKey - Master key in an unencrypted format
 * @param {(number | null)} addressVersion - Address version
 * @param {string[]} addresses - A list of all existing public addresses
 * @return {*}  {IResult<IKeypair>}
 */
export function generateNewKeypairAndAddress(
    masterKey: IMasterKey,
    addressVersion: number | null,
    addresses: string[],
): IResult<IKeypair> {
    let counter = addresses.length;

    let currentKey = getNextDerivedKeypair(masterKey, counter);
    if (currentKey.isErr()) return err(currentKey.error);
    let currentAddr = constructAddress(currentKey.value.publicKey, addressVersion);
    if (currentAddr.isErr()) return err(currentAddr.error);
    // Keep generating keys until we get a new one
    while (addresses.indexOf(currentAddr.value) != -1) {
        counter++;
        currentKey = getNextDerivedKeypair(masterKey, counter);
        if (currentKey.isErr()) return err(currentKey.error);
        currentAddr = constructAddress(currentKey.value.publicKey, addressVersion);
        if (currentAddr.isErr()) return err(currentAddr.error);
    }

    // Return keypair
    const keypair = {
        address: currentAddr.value,
        secretKey: currentKey.value.secretKey,
        publicKey: currentKey.value.publicKey,
        version: addressVersion,
    } as IKeypair;

    return ok(keypair);
}
