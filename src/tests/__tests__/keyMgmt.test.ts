/* eslint-disable jest/no-conditional-expect */
import nacl from 'tweetnacl';
import { bytesToBase64 } from 'byte-base64';
import * as keyMgmt from '../../mgmt/keyMgmt';
import { TEMP_ADDRESS_VERSION, ADDRESS_VERSION } from '../../mgmt';
import { getHexStringBytes } from '../../utils';
import { SEED } from '../constants';

// Public keys for address generation
const PUBLIC_KEYS = [
    '5371832122a8e804fa3520ec6861c3fa554a7f6fb617e6f0768452090207e07c',
    '6e86cc1fc5efbe64c2690efbb966b9fe1957facc497dce311981c68dac88e08c',
    '8b835e00c57ebff6637ec32276f2c6c0df71129c8f0860131a78a4692a0b59dc',
];

//====== TESTS ======//

test('generates a deterministic master key from seed', () => {
    const mKey1 = keyMgmt.generateMasterKey(SEED);
    const mKey2 = keyMgmt.generateMasterKey(SEED);
    const mKey3 = keyMgmt.generateMasterKey(SEED);
    const mKey4 = keyMgmt.generateMasterKey(SEED);
    if (mKey1.isOk() && mKey2.isOk() && mKey3.isOk() && mKey4.isOk()) {
        // Assertion
        expect(mKey1.value.secret.xprivkey).toEqual(mKey2.value.secret.xprivkey);
        expect(mKey1.value.secret.xpubkey).toEqual(mKey2.value.secret.xpubkey);
        expect(mKey1.value.seed).toEqual(mKey2.value.seed);
        expect(mKey2.value.secret.xprivkey).toEqual(mKey3.value.secret.xprivkey);
        expect(mKey2.value.secret.xpubkey).toEqual(mKey3.value.secret.xpubkey);
        expect(mKey2.value.seed).toEqual(mKey3.value.seed);
        expect(mKey3.value.secret.xprivkey).toEqual(mKey4.value.secret.xprivkey);
        expect(mKey3.value.secret.xpubkey).toEqual(mKey4.value.secret.xpubkey);
        expect(mKey3.value.seed).toEqual(mKey4.value.seed);
    }
});

test('generates a master key from both seed and passphrase', () => {
    const passphrase = 'hello';

    const mKey1 = keyMgmt.generateMasterKey(SEED, passphrase);
    const mKey2 = keyMgmt.generateMasterKey(SEED, passphrase);
    if (mKey1.isOk() && mKey2.isOk()) {
        expect(mKey1.value.secret.xprivkey).toEqual(mKey2.value.secret.xprivkey);
    }
});

test('derives deterministic keys from the same seed', () => {
    const mKey1 = keyMgmt.generateMasterKey(SEED);
    const mKey2 = keyMgmt.generateMasterKey(SEED);

    if (mKey1.isOk() && mKey2.isOk()) {
        const derived1_0 = mKey1.value.secret.deriveChild(0, true);
        const derived2_0 = mKey2.value.secret.deriveChild(0, true);
        const derived1_1 = mKey1.value.secret.deriveChild(1, true);
        const derived2_1 = mKey2.value.secret.deriveChild(1, true);
        const derived1_2 = mKey1.value.secret.deriveChild(2, true);
        const derived2_2 = mKey2.value.secret.deriveChild(2, true);

        // Assertion
        expect(derived1_0.xprivkey).toEqual(derived2_0.xprivkey);
        expect(derived1_0.xpubkey).toEqual(derived2_0.xpubkey);
        expect(derived1_1.xprivkey).toEqual(derived2_1.xprivkey);
        expect(derived1_1.xpubkey).toEqual(derived2_1.xpubkey);
        expect(derived1_2.xprivkey).toEqual(derived2_2.xprivkey);
        expect(derived1_0.xpubkey).toEqual(derived2_0.xpubkey);
    }
});

test('derives deterministic signable keypairs through ed25519, via seed', () => {
    const mKey1 = keyMgmt.generateMasterKey(SEED);
    const mKey2 = keyMgmt.generateMasterKey(SEED);

    if (mKey1.isOk() && mKey2.isOk()) {
        const genKeypair1 = keyMgmt.getNextDerivedKeypair(mKey1.value, 0);
        const genKeypair2 = keyMgmt.getNextDerivedKeypair(mKey2.value, 0);
        const genKeypair3 = keyMgmt.getNextDerivedKeypair(mKey1.value, 1);
        const genKeypair4 = keyMgmt.getNextDerivedKeypair(mKey2.value, 1);

        if (genKeypair1.isOk() && genKeypair2.isOk() && genKeypair3.isOk() && genKeypair4.isOk()) {
            // Assertion
            expect(bytesToBase64(genKeypair1.value.secretKey)).toEqual(
                bytesToBase64(genKeypair2.value.secretKey),
            );
            expect(bytesToBase64(genKeypair1.value.publicKey)).toEqual(
                bytesToBase64(genKeypair2.value.publicKey),
            );
            expect(bytesToBase64(genKeypair3.value.publicKey)).toEqual(
                bytesToBase64(genKeypair4.value.publicKey),
            );
            expect(bytesToBase64(genKeypair3.value.publicKey)).toEqual(
                bytesToBase64(genKeypair4.value.publicKey),
            );
        }
    }
});

// NOTE: This test corresponds with `test_construct_valid_addresses` in NAOM
test('generates a valid payment address with the default version', () => {
    const actual = [
        keyMgmt
            .constructAddress(getHexStringBytes(PUBLIC_KEYS[0]), TEMP_ADDRESS_VERSION)
            .unwrapOr(''),
        keyMgmt
            .constructAddress(getHexStringBytes(PUBLIC_KEYS[1]), TEMP_ADDRESS_VERSION)
            .unwrapOr(''),
        keyMgmt
            .constructAddress(getHexStringBytes(PUBLIC_KEYS[2]), TEMP_ADDRESS_VERSION)
            .unwrapOr(''),
    ];

    const expected = [
        '6c6b6e8e9df8c63d22d9eb687b9671dd1ce5d89f195bb2316e1b1444848cd2b3',
        '8ac2fdcb0688abb2727d63ed230665b275a1d3a28373baa92a9afa5afd610e9f',
        '0becdaaf6a855f04961208ee992651c11df0be91c08629dfc079d05d2915ec22',
    ];

    expect(actual).toEqual(expected);
});

test('generates a valid payment address with version 1', () => {
    const actual = [
        keyMgmt.constructAddress(getHexStringBytes(PUBLIC_KEYS[0]), ADDRESS_VERSION).unwrapOr(''),
        keyMgmt.constructAddress(getHexStringBytes(PUBLIC_KEYS[1]), ADDRESS_VERSION).unwrapOr(''),
        keyMgmt.constructAddress(getHexStringBytes(PUBLIC_KEYS[2]), ADDRESS_VERSION).unwrapOr(''),
    ];

    const expected = [
        '5423e6bd848e0ce5cd794e55235c23138d8833633cd2d7de7f4a10935178457b',
        '77516e2d91606250e625546f86702510d2e893e4a27edfc932fdba03c955cc1b',
        '4cfd64a6692021fc417368a866d33d94e1c806747f61ac85e0b3935e7d5ed925',
    ];

    expect(actual).toEqual(expected);
});

test('can create a valid signature', () => {
    const mKey = keyMgmt.generateMasterKey(SEED);
    if (mKey.isOk()) {
        const genKeypair = keyMgmt.getNextDerivedKeypair(mKey.value, 0);
        if (genKeypair.isOk()) {
            const msg = Uint8Array.from([0, 1, 2]);
            const sig = keyMgmt.createSignature(genKeypair.value.secretKey, msg);
            expect(nacl.sign.detached.verify(msg, sig, genKeypair.value.publicKey)).toEqual(true);
        }
    }
});
