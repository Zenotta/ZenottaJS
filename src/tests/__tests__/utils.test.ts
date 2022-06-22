import {
    addLhsAssetToRhsAsset,
    assetsAreCompatible,
    calculateNonceForId,
    generateIntercomDelBody,
    generateIntercomGetBody,
    generateIntercomSetBody,
    getUniqueID,
    initIAssetReceipt,
    initIAssetToken,
    isOfTypeIAssetReceipt,
    isOfTypeIAssetToken,
    lhsAssetIsLessThanRhsAsset,
    subRhsAssetFromLhsAsset,
    throwIfErr,
    lhsAssetIsGreaterThanRhsAsset,
    lhsAssetIsEqOrGreaterThanRhsAsset,
    filterIntercomDataForPredicates,
    formatSingleCustomKeyValuePair,
} from '../../utils';
import { sha3_256 } from 'js-sha3';
import { IKeypair, IResponseIntercom, IPendingRbTxDetails } from '../../interfaces';
import { DEFAULT_DRS_TX_HASH } from '../../mgmt';
import { initIDruidExpectation } from '../../utils';

/* -------------------------------------------------------------------------- */
/*                           General Utilities Tests                          */
/* -------------------------------------------------------------------------- */

test('create valid proof-of-work', () => {
    const difficulty = 2;
    const id = getUniqueID();
    const nonce = calculateNonceForId(difficulty, id);
    expect(
        Array.from(Buffer.from(sha3_256(`${nonce}-${id}`), 'hex'))
            .slice(0, difficulty)
            .every((e) => e === 0),
    ).toBe(true);
});

/* -------------------------------------------------------------------------- */
/*                          Interface Utilities Tests                         */
/* -------------------------------------------------------------------------- */
test('validate asset type guards', () => {
    const assetToken_1 = initIAssetToken({ Token: 1 });
    const assetToken_2 = initIAssetToken({ Token: 2 });
    const assetReceipt_1 = initIAssetReceipt();
    const assetReceipt_2 = initIAssetReceipt({
        Receipt: { amount: 1, drs_tx_hash: 'unique_drs_tx_hash' },
    });
    const assetReceipt_3 = initIAssetReceipt({
        Receipt: { amount: 2, drs_tx_hash: 'unique_drs_tx_hash' },
    });
    const assetReceipt_4 = initIAssetReceipt({
        Receipt: { amount: 3, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });

    /* ------------------------- Individual type guards ------------------------- */
    expect(isOfTypeIAssetToken(assetToken_1)).toBe(true);
    expect(isOfTypeIAssetToken(assetToken_2)).toBe(true);
    expect(isOfTypeIAssetToken(assetReceipt_1)).toBe(false);
    expect(isOfTypeIAssetToken(assetReceipt_2)).toBe(false);
    expect(isOfTypeIAssetToken(assetReceipt_3)).toBe(false);
    expect(isOfTypeIAssetToken(assetReceipt_4)).toBe(false);
    expect(isOfTypeIAssetReceipt(assetToken_1)).toBe(false);
    expect(isOfTypeIAssetReceipt(assetToken_2)).toBe(false);
    expect(isOfTypeIAssetReceipt(assetReceipt_1)).toBe(true);
    expect(isOfTypeIAssetReceipt(assetReceipt_2)).toBe(true);
    expect(isOfTypeIAssetReceipt(assetReceipt_3)).toBe(true);
    expect(isOfTypeIAssetReceipt(assetReceipt_4)).toBe(true);

    /* -------------------------- Combined type guards -------------------------- */
    // Note: Infers correct operability of `assetsAreBothTokens`
    // and `assetsAreBothCompatibleReceipts` utility functions

    // All assets of type `Token` are compatible with each other
    expect(assetsAreCompatible(assetToken_1, assetToken_2)).toBe(true);
    expect(assetsAreCompatible(assetToken_1, assetToken_2)).toBe(true);
    expect(assetsAreCompatible(assetToken_2, assetToken_1)).toBe(true);
    expect(assetsAreCompatible(assetToken_2, assetToken_1)).toBe(true);

    // `Receipt` assets are only compatible if they exhibit the same `drs_tx_hash`
    expect(assetsAreCompatible(assetReceipt_1, assetReceipt_2)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_1, assetReceipt_3)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_1, assetReceipt_4)).toBe(true);
    expect(assetsAreCompatible(assetReceipt_2, assetReceipt_1)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_2, assetReceipt_3)).toBe(true);
    expect(assetsAreCompatible(assetReceipt_2, assetReceipt_4)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_3, assetReceipt_1)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_3, assetReceipt_2)).toBe(true);
    expect(assetsAreCompatible(assetReceipt_3, assetReceipt_4)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_4, assetReceipt_1)).toBe(true);
    expect(assetsAreCompatible(assetReceipt_4, assetReceipt_2)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_4, assetReceipt_3)).toBe(false);

    // Assets of type `Token` and `Receipt` are never compatible
    expect(assetsAreCompatible(assetReceipt_1, assetToken_1)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_2, assetToken_2)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_3, assetToken_1)).toBe(false);
    expect(assetsAreCompatible(assetReceipt_4, assetToken_2)).toBe(false);
});

test('validate correct value amount and mathematical operation between assets', () => {
    /* ------------------------ `Token` assets operations ----------------------- */
    const assetToken_1 = initIAssetToken({ Token: 1 });
    const assetToken_2 = initIAssetToken({ Token: 10 });
    const assetToken_3 = initIAssetToken({ Token: 10 });

    /*
     * Success tests
     */
    // Subtract assetToken_1 from assetToken_2
    expect(throwIfErr(subRhsAssetFromLhsAsset(assetToken_2, assetToken_1))).toStrictEqual({
        Token: 9,
    });
    // Add assetToken_1 to assetToken_2
    expect(throwIfErr(addLhsAssetToRhsAsset(assetToken_2, assetToken_1))).toStrictEqual({
        Token: 11,
    });
    // Test assetToken_1 < assetToken_2
    expect(throwIfErr(lhsAssetIsLessThanRhsAsset(assetToken_1, assetToken_2))).toBe(true);
    // Test assetToken_2 > assetToken_1
    expect(throwIfErr(lhsAssetIsGreaterThanRhsAsset(assetToken_2, assetToken_1))).toBe(true);
    // Test assetToken_2 >= assetToken_3
    expect(throwIfErr(lhsAssetIsEqOrGreaterThanRhsAsset(assetToken_2, assetToken_3))).toBe(true);

    /*
     * Failure tests
     */
    // Subtract assetToken_3 from assetToken_1
    expect(subRhsAssetFromLhsAsset(assetToken_1, assetToken_3).isOk()).toBe(false);
    // Test assetToken_1 > assetToken_2
    expect(throwIfErr(lhsAssetIsLessThanRhsAsset(assetToken_2, assetToken_1))).toBe(false);
    // Test assetToken_2 < assetToken_1
    expect(throwIfErr(lhsAssetIsGreaterThanRhsAsset(assetToken_1, assetToken_2))).toBe(false);

    /* ----------------------- `Receipt` asset operations ----------------------- */
    const assetReceipt_1 = initIAssetReceipt({
        Receipt: { amount: 1, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });
    const assetReceipt_2 = initIAssetReceipt({
        Receipt: { amount: 10, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });
    const assetReceipt_3 = initIAssetReceipt({
        Receipt: { amount: 10, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });
    const assetReceipt_4 = initIAssetReceipt({
        Receipt: { amount: 1, drs_tx_hash: 'unique_drs_tx_hash' },
    });
    const assetReceipt_5 = initIAssetReceipt({
        Receipt: { amount: 10, drs_tx_hash: 'unique_drs_tx_hash' },
    });
    const assetReceipt_6 = initIAssetReceipt({
        Receipt: { amount: 10, drs_tx_hash: 'unique_drs_tx_hash' },
    });

    /*
     * Success tests
     */
    // Subtract assetReceipt_1 from assetReceipt_2
    expect(throwIfErr(subRhsAssetFromLhsAsset(assetReceipt_2, assetReceipt_1))).toStrictEqual({
        Receipt: { amount: 9, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });
    // Add assetReceipt_1 to assetReceipt_2
    expect(throwIfErr(addLhsAssetToRhsAsset(assetReceipt_2, assetReceipt_1))).toStrictEqual({
        Receipt: { amount: 11, drs_tx_hash: DEFAULT_DRS_TX_HASH },
    });
    // Test assetReceipt_1 < assetReceipt_2
    expect(throwIfErr(lhsAssetIsLessThanRhsAsset(assetReceipt_1, assetReceipt_2))).toBe(true);
    // Test assetReceipt_2 > assetReceipt_1
    expect(throwIfErr(lhsAssetIsGreaterThanRhsAsset(assetReceipt_2, assetReceipt_1))).toBe(true);
    // Test assetReceipt_2 >= assetReceipt_3
    expect(throwIfErr(lhsAssetIsEqOrGreaterThanRhsAsset(assetReceipt_2, assetReceipt_3))).toBe(
        true,
    );

    /*
     * Failure tests
     */
    // Subtract assetReceipt_3 from assetReceipt_1
    expect(subRhsAssetFromLhsAsset(assetReceipt_1, assetReceipt_3).isOk()).toBe(false); // Cannot have negative amount
    // Test assetReceipt_1 > assetReceipt_2
    expect(throwIfErr(lhsAssetIsLessThanRhsAsset(assetReceipt_2, assetReceipt_1))).toBe(false);
    // Test assetReceipt_2 < assetReceipt_1
    expect(throwIfErr(lhsAssetIsGreaterThanRhsAsset(assetReceipt_1, assetReceipt_2))).toBe(false);
    // Add assetReceipt_4 to assetReceipt_1
    expect(addLhsAssetToRhsAsset(assetReceipt_1, assetReceipt_4).isOk()).toBe(false); // Incompatibe `Receipt` types
    // Test assetReceipt_4 < assetReceipt_1
    expect(lhsAssetIsLessThanRhsAsset(assetReceipt_4, assetReceipt_1).isOk()).toBe(false); // Incompatibe `Receipt` types
    // Test assetReceipt_5 > assetReceipt_1
    expect(lhsAssetIsGreaterThanRhsAsset(assetReceipt_5, assetReceipt_2).isOk()).toBe(false); // Incompatibe `Receipt` types
    // Test assetReceipt_6 >= assetReceipt_1
    expect(lhsAssetIsEqOrGreaterThanRhsAsset(assetReceipt_6, assetReceipt_3).isOk()).toBe(false); // Incompatibe `Receipt` types

    /* ------------------------ Combined Asset Operations ----------------------- */
    // Note: ALl tests should fail here because `Token` and `Receipt` assets
    // are incompatible for mathematical operations and evaluations.

    /*
     * Failure tests
     */
    // Subtract assetReceipt_3 from assetToken_1
    expect(subRhsAssetFromLhsAsset(assetToken_1, assetReceipt_3).isOk()).toBe(false);
    // Add assetReceipt_2 to assetToken_1
    expect(addLhsAssetToRhsAsset(assetToken_1, assetReceipt_2).isOk()).toBe(false);
    // Test assetReceipt_1 > assetToken_2
    expect(lhsAssetIsLessThanRhsAsset(assetToken_2, assetReceipt_1).isOk()).toBe(false);
    // Test assetReceipt_2 < assetToken_1
    expect(lhsAssetIsGreaterThanRhsAsset(assetToken_2, assetReceipt_2).isOk()).toBe(false);
    // Test assetReceipt_3 >= assetToken_3
    expect(lhsAssetIsEqOrGreaterThanRhsAsset(assetToken_2, assetReceipt_3).isOk()).toBe(false);
});

/* -------------------------------------------------------------------------- */
/*                          Intercom Utilities Tests                          */
/* -------------------------------------------------------------------------- */

test('generate an intercom get body', () => {
    // Key-pair we own
    const keypair: IKeypair = {
        // Latest address version structure
        address: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        secretKey: Uint8Array.from([
            233, 235, 184, 105, 168, 34, 66, 245, 129, 89, 179, 190, 179, 228, 191, 30, 5, 237, 239,
            61, 108, 71, 165, 31, 199, 98, 115, 229, 108, 205, 221, 247, 35, 4, 102, 112, 71, 249,
            172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29, 131, 72, 179, 214, 50, 52,
            144, 185, 200, 204, 249, 120,
        ]),
        publicKey: Uint8Array.from([
            35, 4, 102, 112, 71, 249, 172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29,
            131, 72, 179, 214, 50, 52, 144, 185, 200, 204, 249, 120,
        ]),
        version: null,
    };
    // Generate intercom get body
    const body = generateIntercomGetBody(keypair.address, keypair);
    // Verify correct body structure
    expect(body).toStrictEqual({
        key: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        publicKey: '2304667047f9ac074b2b062b46557e3283a1661d8348b3d6323490b9c8ccf978',
        signature:
            '04e37549dcc0422237aa1e3c18b6a2cdb529831e8daad8ea4d3865cad149d50016e7b64cedf12c01fb5eb715b2e049bb3441eb6da9866ce1eef6071b38465808',
    });
});

test('generate an intercom set body', () => {
    // Key-pair we own
    const keypair: IKeypair = {
        // Latest address version structure
        address: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        secretKey: Uint8Array.from([
            233, 235, 184, 105, 168, 34, 66, 245, 129, 89, 179, 190, 179, 228, 191, 30, 5, 237, 239,
            61, 108, 71, 165, 31, 199, 98, 115, 229, 108, 205, 221, 247, 35, 4, 102, 112, 71, 249,
            172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29, 131, 72, 179, 214, 50, 52,
            144, 185, 200, 204, 249, 120,
        ]),
        publicKey: Uint8Array.from([
            35, 4, 102, 112, 71, 249, 172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29,
            131, 72, 179, 214, 50, 52, 144, 185, 200, 204, 249, 120,
        ]),
        version: null,
    };
    // Setting data on the intercom server needs to be of type `object`
    const dataToSet: object = { testValue: 'Hello!' };
    // Generate intercom set body
    const body = generateIntercomSetBody<object>(
        'address_to_send_data_to',
        keypair.address,
        keypair,
        dataToSet,
    );
    // Verify correct body structure
    expect(body).toStrictEqual({
        key: 'address_to_send_data_to',
        field: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        signature:
            '04e37549dcc0422237aa1e3c18b6a2cdb529831e8daad8ea4d3865cad149d50016e7b64cedf12c01fb5eb715b2e049bb3441eb6da9866ce1eef6071b38465808',
        publicKey: '2304667047f9ac074b2b062b46557e3283a1661d8348b3d6323490b9c8ccf978',
        value: { testValue: 'Hello!' },
    });
});

test('generate intercom delete body', () => {
    // Key-pair we own
    const keypair: IKeypair = {
        // Latest address version structure
        address: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        secretKey: Uint8Array.from([
            233, 235, 184, 105, 168, 34, 66, 245, 129, 89, 179, 190, 179, 228, 191, 30, 5, 237, 239,
            61, 108, 71, 165, 31, 199, 98, 115, 229, 108, 205, 221, 247, 35, 4, 102, 112, 71, 249,
            172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29, 131, 72, 179, 214, 50, 52,
            144, 185, 200, 204, 249, 120,
        ]),
        publicKey: Uint8Array.from([
            35, 4, 102, 112, 71, 249, 172, 7, 75, 43, 6, 43, 70, 85, 126, 50, 131, 161, 102, 29,
            131, 72, 179, 214, 50, 52, 144, 185, 200, 204, 249, 120,
        ]),
        version: null,
    };
    // Generate intercom delete body
    const body = generateIntercomDelBody(keypair.address, 'address_that_placed_the_data', keypair);
    // Verify correct body structure
    expect(body).toStrictEqual({
        key: '18f70e4a53a7cfd7f82d0e1fc287a449872ec7489dba0dff86144df8609caeda',
        field: 'address_that_placed_the_data',
        signature:
            '04e37549dcc0422237aa1e3c18b6a2cdb529831e8daad8ea4d3865cad149d50016e7b64cedf12c01fb5eb715b2e049bb3441eb6da9866ce1eef6071b38465808',
        publicKey: '2304667047f9ac074b2b062b46557e3283a1661d8348b3d6323490b9c8ccf978',
    });
});

test('filter intercom data for predicate', () => {
    // Data received from intercom server
    const intercomData: IResponseIntercom<IPendingRbTxDetails> = {
        sender_address_1: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_1',
                senderExpectation: initIDruidExpectation(),
                receiverExpectation: initIDruidExpectation(),
                computeHost: 'computeHost_1',
                status: 'pending',
            },
        },
        sender_address_2: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_2',
                senderExpectation: initIDruidExpectation(),
                receiverExpectation: initIDruidExpectation(),
                computeHost: 'computeHost_2',
                status: 'accepted',
            },
        },
        sender_address_3: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_3',
                senderExpectation: initIDruidExpectation(),
                receiverExpectation: initIDruidExpectation(),
                computeHost: 'computeHost_2', // Same compute host as data from "sender_address_2"
                status: 'accepted',
            },
        },
    };

    /*
     *   Success Tests
     */
    // Filter intercom data for unique_druid_value_1
    const filterForDruid1 = throwIfErr(
        // We assume that DRUID values are unique and only one result should be present
        formatSingleCustomKeyValuePair(
            throwIfErr(
                filterIntercomDataForPredicates(intercomData, {
                    druid: 'unique_druid_value_1',
                }),
            ),
        ),
    );
    expect(filterForDruid1).toStrictEqual({
        key: 'sender_address_1',
        value: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_1', // Filtered out intercom data with unique DRUID value
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_1',
                status: 'pending',
            },
        },
    });

    // Filter intercom data for unique_druid_value_2
    const filterForDruid2 = throwIfErr(
        // We assume that DRUID values are unique and only one result should be present
        formatSingleCustomKeyValuePair(
            throwIfErr(
                filterIntercomDataForPredicates(intercomData, {
                    druid: 'unique_druid_value_2',
                }),
            ),
        ),
    );
    expect(filterForDruid2).toStrictEqual({
        key: 'sender_address_2',
        value: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_2', // Filtered out intercom data with unique DRUID value
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_2',
                status: 'accepted',
            },
        },
    });

    // Filter intercom data for 'accepted' status
    const filterForAccepted = throwIfErr(
        filterIntercomDataForPredicates(intercomData, {
            status: 'accepted',
        }),
    );
    expect(filterForAccepted).toStrictEqual({
        sender_address_2: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_2',
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_2',
                status: 'accepted', // Filtered out intercom data with status set to 'accepted'
            },
        },
        sender_address_3: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_3',
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_2',
                status: 'accepted', // Filtered out intercom data with status set to 'accepted'
            },
        },
    });

    const filterForStatusAndComputeHost = throwIfErr(
        filterIntercomDataForPredicates(intercomData, {
            status: 'accepted',
            computeHost: 'computeHost_2',
        }),
    );

    expect(filterForStatusAndComputeHost).toStrictEqual({
        sender_address_2: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_2',
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_2',
                status: 'accepted',
            },
        },
        sender_address_3: {
            timestamp: 0,
            value: {
                druid: 'unique_druid_value_3',
                senderExpectation: { from: '', to: '', asset: { Token: 0 } },
                receiverExpectation: { from: '', to: '', asset: { Token: 0 } },
                computeHost: 'computeHost_2',
                status: 'accepted',
            },
        },
    });
});
