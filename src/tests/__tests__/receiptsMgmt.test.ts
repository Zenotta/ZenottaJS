/* eslint-disable jest/no-conditional-expect */
import { IKeypair, IOutPoint, ICreateTxInScript, IDrsTxHashSpecification } from '../../interfaces';
import {
    ADDRESS_VERSION,
    constructTxInsAddress,
    constructTxInSignableAssetHash,
    DEFAULT_DRS_TX_HASH,
    generateDRUID,
    getInputsForTx,
} from '../../mgmt';
import * as receiptMgmt from '../../mgmt/receiptMgmt';
import { ADDRESS_LIST_TEST, FETCH_BALANCE_RESPONSE_TEST } from '../constants';
import { initIAssetReceipt, initIAssetToken, initIDruidExpectation } from '../../utils';

test('creates a valid payload to create receipts', () => {
    const keypair = {
        publicKey: new Uint8Array([
            105, 254, 232, 28, 144, 69, 179, 94, 175, 4, 183, 75, 250, 121, 131, 97, 138, 8, 172,
            183, 25, 239, 141, 55, 73, 164, 240, 4, 162, 147, 202, 223,
        ]),
        secretKey: new Uint8Array([
            252, 186, 153, 105, 137, 147, 53, 80, 3, 89, 170, 69, 174, 112, 8, 199, 221, 139, 22,
            136, 61, 254, 142, 163, 154, 121, 146, 89, 231, 15, 152, 90, 105, 254, 232, 28, 144, 69,
            179, 94, 175, 4, 183, 75, 250, 121, 131, 97, 138, 8, 172, 183, 25, 239, 141, 55, 73,
            164, 240, 4, 162, 147, 202, 223,
        ]),
    };

    const payload = receiptMgmt.createReceiptPayload(
        keypair.secretKey,
        keypair.publicKey,
        ADDRESS_VERSION,
    );

    if (payload.isOk()) {
        expect(payload.value).toEqual({
            receipt_amount: 1000,
            public_key: '69fee81c9045b35eaf04b74bfa7983618a08acb719ef8d3749a4f004a293cadf',
            script_public_key: 'a0b08e623c6800bb27dddb5d6f6956939be674cfc63399dcc7b9f2e6733c02e5',
            signature:
                '08e2251bb12d8b4acf168404a11166868bc9222364ee66d545ab4c9e317d85ca420686b637319869ecba7bbf3aa268577ab434990847a3b32537e84ac5b1bd03',
            version: null,
            drs_tx_hash_spec:
                IDrsTxHashSpecification.Default /* Create generic Receipt assets instead of a tracked Receipt assets */,
        });
    }
});

test('create transaction for the SEND portion of a receipt-based payment', () => {
    const keyPairMap = new Map<string, IKeypair>();
    for (const addr of Object.keys(ADDRESS_LIST_TEST)) {
        keyPairMap.set(addr, {
            address: addr,
            secretKey: Buffer.from(ADDRESS_LIST_TEST[addr].secret_key, 'hex'),
            publicKey: Buffer.from(ADDRESS_LIST_TEST[addr].public_key, 'hex'),
            version: ADDRESS_VERSION,
        });
    }

    const createTransaction = receiptMgmt.createRbTxHalf(
        FETCH_BALANCE_RESPONSE_TEST,
        'full_druid',
        initIDruidExpectation({
            asset: {
                Receipt: {
                    amount: 1,
                    drs_tx_hash: DEFAULT_DRS_TX_HASH,
                },
            },
            from: 'their_from_value',
            to: 'our_receive_address',
        }),
        initIDruidExpectation({
            asset: {
                Token: 1050,
            },
            from: 'our_from_value',
            to: 'their_receive_address',
        }),
        'excess_address',
        keyPairMap,
    );

    if (createTransaction.isOk()) {
        const [createTx, usedAddresses] = [
            createTransaction.value.createTx,
            createTransaction.value.usedAddresses,
        ];
        // From here we assume the create transaction struct is created correctly
        expect(createTx).toBeDefined();
        if (createTx) {
            // Assert used addresses
            expect(usedAddresses).toStrictEqual([
                'f226b92e6868e178f722e9cf71ad2a0c16d864c5d8fcadc70153bbd021f11ea0',
                '9b28bf45e5e5285a8eb10003046f5ed48571903ea767915acf0fe77e257b43fa',
            ]);

            // Assert TxOut values
            const txOuts = createTx?.outputs;
            expect(txOuts).toStrictEqual([
                {
                    value: { Token: 1050 } /* Amount payed */,
                    locktime: 0,
                    drs_block_hash: null,
                    script_public_key: 'their_receive_address',
                },
                {
                    value: { Token: 10 } /* Change/excess */,
                    locktime: 0,
                    drs_block_hash: null,
                    script_public_key: 'excess_address',
                },
            ]);

            // Assert previous outpoints in CreateTransaction struct
            const previousOuts: IOutPoint[] = Object.entries(createTx?.inputs)
                .map((i) => i[1].previous_out)
                .filter((input): input is IOutPoint => !!input);

            expect(previousOuts).toStrictEqual([
                {
                    n: 0,
                    t_hash: '000000',
                },
                {
                    n: 0,
                    t_hash: '000001',
                },
                {
                    n: 0,
                    t_hash: '000002',
                },
            ]);

            // Assert script signatures
            const script_signatures: ICreateTxInScript[] = Object.entries(createTx?.inputs)
                .map((i) => i[1].script_signature)
                .filter((input): input is ICreateTxInScript => !!input);

            expect(script_signatures).toStrictEqual([
                {
                    Pay2PkH: {
                        signable_data:
                            '927b3411743452e5e0d73e9e40a4fa3c842b3d00dabde7f9af7e44661ce02c88',
                        signature:
                            '660e4698d817d409feb209699b15935048c8b3c4ac86a23f25b05aa32fb8b87e7cd029b83220d31a0b2717bd63b47a320a7728355d7fae43a665d6e27743e20d',
                        public_key:
                            '5e6d463ec66d7999769fa4de56f690dfb62e685b97032f5926b0cb6c93ba83c6',
                        address_version: null,
                    },
                },
                {
                    Pay2PkH: {
                        signable_data:
                            '754dc248d1c847e8a10c6f8ded6ccad96381551ebb162583aea2a86b9bb78dfa',
                        signature:
                            'fd107c9446cdcbd8fbb0d6b88c73067c9bd15de03fff677b0129acf1bd2d14a5ab8a63c7eb6fe8c5acc4b44b033744760847194a15b006368d178c85243d0605',
                        public_key:
                            '58272ba93c1e79df280d4c417de47dbf6a7e330ba52793d7baa8e00ae5c34e59',
                        address_version: null,
                    },
                },
                {
                    Pay2PkH: {
                        signable_data:
                            '5585c6f74d5c55f1ab457c31671822ba28c78c397cce1e11680b9f3852f96edb',
                        signature:
                            'e1a436bbfcb3e411be1ce6088cdb4c39d7e79f8fe427943e74307e43864fd0f6ef26123f1439b92c075edd031d17feb4dd265c6fcc2e5ed571df48a03c396100',
                        public_key:
                            'efa9dcba0f3282b3ed4a6aa1ccdb169d6685a30d7b2af7a2171a5682f3112359',
                        address_version: null,
                    },
                },
            ]);

            // Assert druid values
            const druid_values = createTx?.druid_info;
            if (druid_values !== null) {
                expect(druid_values).toStrictEqual({
                    druid: 'full_druid',
                    expectations: [
                        {
                            asset: {
                                Receipt: {
                                    amount: 1,
                                    drs_tx_hash: DEFAULT_DRS_TX_HASH,
                                },
                            },
                            from: 'their_from_value',
                            to: 'our_receive_address',
                        },
                    ],
                    participants: 2,
                });
            }
        }
    }
});

test('create transaction for the RECEIVE portion of a receipt-based payment', () => {
    const keyPairMap = new Map<string, IKeypair>();
    for (const addr of Object.keys(ADDRESS_LIST_TEST)) {
        keyPairMap.set(addr, {
            address: addr,
            secretKey: Buffer.from(ADDRESS_LIST_TEST[addr].secret_key, 'hex'),
            publicKey: Buffer.from(ADDRESS_LIST_TEST[addr].public_key, 'hex'),
            version: ADDRESS_VERSION,
        });
    }

    const createTransaction = receiptMgmt.createRbTxHalf(
        FETCH_BALANCE_RESPONSE_TEST,
        'full_druid',
        initIDruidExpectation({
            asset: {
                Token: 1060,
            },
            from: 'their_from_value',
            to: 'our_receive_address',
        }),
        initIDruidExpectation({
            asset: {
                Receipt: {
                    amount: 1,
                    drs_tx_hash: DEFAULT_DRS_TX_HASH,
                },
            },
            from: 'our_from_value',
            to: 'their_receive_address',
        }),
        'excess_address',
        keyPairMap,
    );

    if (createTransaction.isOk()) {
        const [createTx, usedAddresses] = [
            createTransaction.value.createTx,
            createTransaction.value.usedAddresses,
        ];

        // From here we assume the create transaction struct is created correctly
        expect(createTx).toBeDefined();
        if (createTx) {
            // Assert used addresses
            expect(usedAddresses).toStrictEqual(
                [] /* All addresses still have something assigned to them */,
            );

            // Assert TxOut values
            const txOuts = createTx?.outputs;
            expect(txOuts).toStrictEqual([
                {
                    value: {
                        Receipt: { amount: 1, drs_tx_hash: DEFAULT_DRS_TX_HASH },
                    } /* Amount payed */,
                    locktime: 0,
                    drs_block_hash: null,
                    script_public_key: 'their_receive_address',
                },
                {
                    value: {
                        Receipt: { amount: 2, drs_tx_hash: DEFAULT_DRS_TX_HASH },
                    } /* Change/excess */,
                    locktime: 0,
                    drs_block_hash: null,
                    script_public_key: 'excess_address',
                },
            ]);

            // Assert previous outpoints in CreateTransaction struct
            const previousOuts: IOutPoint[] = Object.entries(createTx?.inputs)
                .map((i) => i[1].previous_out)
                .filter((input): input is IOutPoint => !!input);

            expect(previousOuts).toStrictEqual([
                {
                    n: 1,
                    t_hash: '000000',
                },
            ]);

            // Assert script signatures
            const script_signatures: ICreateTxInScript[] = Object.entries(createTx?.inputs)
                .map((i) => i[1].script_signature)
                .filter((input): input is ICreateTxInScript => !!input);

            expect(script_signatures).toStrictEqual([
                {
                    Pay2PkH: {
                        signable_data:
                            '20da10859579fda4748bf3f0e21a2fa9c7ad8bbc4472002819da79f613c136f0',
                        signature:
                            '055973416f4fd0ace53ef392a0c00a83dfc848d52a8425d59fd4eb9e06b0f4a50a637ed452ddacff1a1281a45f83a1ab7faa3142ce5d0341c85a14f634306a06',
                        public_key:
                            '5e6d463ec66d7999769fa4de56f690dfb62e685b97032f5926b0cb6c93ba83c6',
                        address_version: null,
                    },
                },
            ]);

            // Assert druid values
            const druid_values = createTx?.druid_info;
            if (druid_values !== null) {
                expect(druid_values).toStrictEqual({
                    druid: 'full_druid',
                    expectations: [
                        {
                            asset: { Token: 1060 },
                            from: 'their_from_value',
                            to: 'our_receive_address',
                        },
                    ],
                    participants: 2,
                });
            }
        }
    }
});

// NOTE: This test corresponds with `test_construct_valid_tx_ins_address` in NAOM
test('create TxIns address used as `from` value in DdeValues', () => {
    const keyPairMap = new Map<string, IKeypair>();
    for (const addr of Object.keys(ADDRESS_LIST_TEST)) {
        keyPairMap.set(addr, {
            address: addr,
            secretKey: Buffer.from(ADDRESS_LIST_TEST[addr].secret_key, 'hex'),
            publicKey: Buffer.from(ADDRESS_LIST_TEST[addr].public_key, 'hex'),
            version: ADDRESS_VERSION,
        });
    }
    const txInputs = getInputsForTx(
        initIAssetToken({ Token: 1050 }),
        FETCH_BALANCE_RESPONSE_TEST,
        keyPairMap,
    );

    if (txInputs.isOk()) {
        const ourFromAddress = constructTxInsAddress(txInputs.value[2]).unwrapOr('');
        expect(ourFromAddress).toStrictEqual(
            'a7b09a0ffc38e41318eb67c781279d4168f6e203810741284c2426b86ed28e3a',
        );
    }
});

//NOTE: This test corresponds with `test_construct_valid_tx_in_signable_asset_hash` in NAOM
//TODO: Add test for `DataAsset` variant
test('creates a valid signable asset hash value', () => {
    const signableTxInAssetHashes: string[] = [
        constructTxInSignableAssetHash(initIAssetToken({ Token: 1 })),
        constructTxInSignableAssetHash(
            initIAssetReceipt({
                Receipt: {
                    amount: 1,
                    drs_tx_hash:
                        DEFAULT_DRS_TX_HASH /* Value is currently not used to generate signable hash */,
                },
            }),
        ),
    ];

    expect(signableTxInAssetHashes).toStrictEqual([
        'a5b2f5e8dcf824aee45b81294ff8049b680285b976cc6c8fa45eb070acfc5974',
        'ce86f26f7f44f92630031f83e8d2f26c58e88eae40583c8760082edc7407991f',
    ]);
});

test('generates a valid DRUID', () => {
    const druid = generateDRUID();
    if (druid.isOk()) {
        expect(druid.value.slice(0, 5)).toBe('DRUID');
        expect(druid.value.length).toBe(39);
    }
});
