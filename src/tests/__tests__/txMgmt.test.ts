/* eslint-disable jest/no-conditional-expect */
import { IKeypair, IOutPoint, ICreateTxInScript, IErrorInternal } from '../../interfaces';
import { ADDRESS_VERSION } from '../../mgmt';
import * as txMgmt from '../../mgmt/txMgmt';
import { ADDRESS_LIST_TEST, FETCH_BALANCE_RESPONSE_TEST } from '../constants';
import { initIAssetToken } from '../../utils';

test('create transaction for a token amount', () => {
    const keyPairMap = new Map<string, IKeypair>();
    for (const addr of Object.keys(ADDRESS_LIST_TEST)) {
        keyPairMap.set(addr, {
            address: addr,
            secretKey: Buffer.from(ADDRESS_LIST_TEST[addr].secret_key, 'hex'),
            publicKey: Buffer.from(ADDRESS_LIST_TEST[addr].public_key, 'hex'),
            version: ADDRESS_VERSION,
        });
    }

    /*
     * Success Tests
     */
    const createTransactionSuccess = txMgmt.createPaymentTx(
        'payment_address',
        initIAssetToken({ Token: 1050 }),
        'excess_address',
        FETCH_BALANCE_RESPONSE_TEST,
        keyPairMap,
    );

    // Transaction created successfully
    expect(createTransactionSuccess.isOk()).toBe(true);

    if (createTransactionSuccess.isOk()) {
        const [createTx, usedAddresses] = [
            createTransactionSuccess.value.createTx,
            createTransactionSuccess.value.usedAddresses,
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
                    script_public_key: 'payment_address',
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
        }
    }

    /*
     * Failure Tests
     */

    //Insufficient funds available
    const createTransactionFailure = txMgmt.createPaymentTx(
        'payment_address',
        initIAssetToken({ Token: 99999 }) /* Insufficient funds */,
        'excess_address',
        FETCH_BALANCE_RESPONSE_TEST,
        keyPairMap,
    );
    expect(createTransactionFailure._unsafeUnwrapErr()).toStrictEqual(
        IErrorInternal.InsufficientFunds,
    );
});
