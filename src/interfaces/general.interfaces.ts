/* -------------------------------------------------------------------------- */
/*                       Interfaces for ZenottaInstance                       */
/* -------------------------------------------------------------------------- */

// Config needed for initialization
export type IClientConfig = {
    computeHost?: string;
    storageHost?: string;
    intercomHost?: string;
    notaryHost?: string;
    passPhrase: string;
};

/* -------------------------------------------------------------------------- */
/*                             Internal Interfaces                            */
/* -------------------------------------------------------------------------- */

/* --------------------------- General Structures --------------------------- */
export type IGenericKeyPair<T> = {
    [key: string]: T;
};

export type ICustomKeyPair<K extends string | number | symbol, T> = {
    [key in K]: T;
};

// Master key
export type IMasterKey = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    secret: any;
    seed: string;
};

// Master key in an encrypted format
export type IMasterKeyEncrypted = {
    nonce: string;
    save: string;
};

// Key-pair
export type IKeypair = {
    address: string;
    secretKey: Uint8Array;
    publicKey: Uint8Array;
    version: number | null;
};

// Key-pair in an encrypted format
export type IKeypairEncrypted = {
    address: string;
    nonce: string;
    version: number | null;
    save: string;
};

// Transaction
export type ITransaction = {
    inputs: ITxIn[];
    outputs: ITxOut[];
    version: number;
    druid_info: IDdeValues | null;
};

// Transaction input
export type ITxIn = {
    previous_out: IOutPoint | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    script_signature: any | null;
};

// OutPoint
export type IOutPoint = {
    t_hash: string;
    n: number;
};

// Transaction Output
export type ITxOut = {
    value: IAssetToken | IAssetReceipt;
    locktime: number;
    drs_block_hash: string | null;
    script_public_key: string | null;
};

// Dual-double-entry data
export type IDdeValues = {
    druid: string;
    participants: number;
    expectations: IDruidExpectation[];
};

// Dual-double-entry expectation
export type IDruidExpectation = {
    from: string;
    to: string;
    asset: IAssetToken | IAssetReceipt;
};

// DDE/DRUID droplet value as stored on compute node
export type IDruidDroplet = {
    participants: number;
    tx: { [key: string]: ITransaction };
};

// Receipt asset type
export type IAssetReceipt = {
    Receipt: {
        amount: number;
        drs_tx_hash: string;
        metadata: string | null;
    };
};

// Token asset type
export type IAssetToken = {
    Token: number;
};

// `Script` part of body sent to compute node for processing
export type ICreateTxInScript = {
    Pay2PkH: {
        signable_data: string;
        signature: string;
        public_key: string;
        address_version: number | null;
    };
};

// `Transaction inputs` part of body sent to compute node for processing
export type ICreateTxIn = {
    previous_out: IOutPoint | null;
    script_signature: ICreateTxInScript | null;
};

// Entire request body sent to compute node for transaction processing
export type ICreateTransaction = {
    inputs: ICreateTxIn[];
    outputs: ITxOut[];
    version: number;
    druid_info: IDdeValues | null;
};

// Encrypted transaction
export type ICreateTransactionEncrypted = {
    druid: string;
    nonce: string;
    save: string;
};

/* ---------------------------- Script Interfaces --------------------------- */

// `Script` interface
export type Script = {
    stack: StackEntry[];
};

// Signature as expressed in hexidecimal form
export type Signature = string;

// Public key as expressed in hexidecimal form
export type PubKey = string;

// Public key hash | Sha256
export type PubKeyHash = string;

export type Num = number;

// Bytes to sign
export type Bytes = string;

export class StackEntry {
    type: 'Op' | 'Num' | 'Bytes' | 'PubKey' | 'PubKeyHash' | 'Signature';
    value: OpString | Num | Bytes | PubKey | PubKeyHash | Signature;
    constructor(
        type: 'Op' | 'Num' | 'Bytes' | 'PubKey' | 'PubKeyHash' | 'Signature',
        value: OpString | Num | Bytes | PubKey | PubKeyHash | Signature,
    ) {
        this.type = type;
        this.value = value;
    }
    toString() {
        return `${this.type}:${this.value}`;
    }
}

// OPcodes represented as strings
export type OpString =
    // push value
    | 'OP_0'
    | 'OP_PUSHDATA1'
    | 'OP_PUSHDATA2'
    | 'OP_PUSHDATA4'
    | 'OP_1NEGATE'
    | 'OP_RESERVED'
    | 'OP_1'
    | 'OP_2'
    | 'OP_3'
    | 'OP_4'
    | 'OP_5'
    | 'OP_6'
    | 'OP_7'
    | 'OP_8'
    | 'OP_9'
    | 'OP_10'
    | 'OP_11'
    | 'OP_12'
    | 'OP_13'
    | 'OP_14'
    | 'OP_15'
    | 'OP_16'

    // control
    | 'OP_NOP'
    | 'OP_VER'
    | 'OP_IF'
    | 'OP_NOTIF'
    | 'OP_VERIF'
    | 'OP_VERNOT'
    | 'OP_ELSE'
    | 'OP_ENDIF'
    | 'OP_VERIFY'
    | 'OP_RETURN'

    // stack ops
    | 'OP_TOALTSTACK'
    | 'OP_FROMALTSTA'
    | 'OP_2DROP'
    | 'OP_2DUP'
    | 'OP_3DUP'
    | 'OP_2OVER'
    | 'OP_2ROT'
    | 'OP_2SWAP'
    | 'OP_IFDUP'
    | 'OP_DEPTH'
    | 'OP_DROP'
    | 'OP_DUP'
    | 'OP_NIP'
    | 'OP_OVER'
    | 'OP_PICK'
    | 'OP_ROLL'
    | 'OP_ROT'
    | 'OP_SWAP'
    | 'OP_TUCK'

    // splice ops
    | 'OP_CAT'
    | 'OP_SUBSTR'
    | 'OP_LEFT'
    | 'OP_RIGHT'
    | 'OP_SIZE'

    // bit logic
    | 'OP_INVERT'
    | 'OP_AND'
    | 'OP_OR'
    | 'OP_XOR'
    | 'OP_EQUAL'
    | 'OP_EQUALVERIFY'
    | 'OP_RESERVED1'
    | 'OP_RESERVED2'

    // numeric
    | 'OP_1ADD'
    | 'OP_1SUB'
    | 'OP_2MUL'
    | 'OP_2DIV'
    | 'OP_NEGATE'
    | 'OP_ABS'
    | 'OP_NOT'
    | 'OP_0NOTEQUAL'
    | 'OP_ADD'
    | 'OP_SUB'
    | 'OP_MUL'
    | 'OP_DIV'
    | 'OP_MOD'
    | 'OP_LSHIFT'
    | 'OP_RSHIFT'
    | 'OP_BOOLAND'
    | 'OP_BOOLOR'
    | 'OP_NUMEQUAL'
    | 'OP_NUMEQUALVERIFY'
    | 'OP_NUMNOTEQUAL'
    | 'OP_LESSTHAN'
    | 'OP_GREATERTHAN'
    | 'OP_LESSTHANOREQUAL'
    | 'OP_GREATERTHANOREQUAL'
    | 'OP_MIN'
    | 'OP_MAX'
    | 'OP_WITHIN'

    // crypto
    | 'OP_SHA256'
    | 'OP_HASH160'
    | 'OP_HASH256' // Latest address structure
    | 'OP_CODESEPARATOR'
    | 'OP_CHECKSIG'
    | 'OP_CHECKSIGVERIFY'
    | 'OP_CHECKMULTISIG'
    | 'OP_CHECKMULTISIGVERIFY'

    // expansion
    | 'OP_NOP1'
    | 'OP_CHECKLOCKTIMEVERIFY'
    | 'OP_CHECKSEQUENCEVERIFY'
    | 'OP_NOP4'
    | 'OP_NOP5'
    | 'OP_NOP6'
    | 'OP_NOP7'
    | 'OP_NOP8'
    | 'OP_NOP9'
    | 'OP_NOP10'

    // data
    | 'OP_CREATE'
    | 'OP_INVALIDOPCODE'

    // Old (32 byte) address structure
    | 'OP_HASH256_V0'

    // Temporary address structure
    | 'OP_HASH256_TEMP';

// OPcode values
export enum Op {
    // push value
    OP_0 = 0x00,
    OP_PUSHDATA1 = 0x4c,
    OP_PUSHDATA2 = 0x4d,
    OP_PUSHDATA4 = 0x4e,
    OP_1NEGATE = 0x4f,
    OP_RESERVED = 0x50,
    OP_1 = 0x51,
    OP_2 = 0x52,
    OP_3 = 0x53,
    OP_4 = 0x54,
    OP_5 = 0x55,
    OP_6 = 0x56,
    OP_7 = 0x57,
    OP_8 = 0x58,
    OP_9 = 0x59,
    OP_10 = 0x5a,
    OP_11 = 0x5b,
    OP_12 = 0x5c,
    OP_13 = 0x5d,
    OP_14 = 0x5e,
    OP_15 = 0x5f,
    OP_16 = 0x60,

    // control
    OP_NOP = 0x61,
    OP_VER = 0x62,
    OP_IF = 0x63,
    OP_NOTIF = 0x64,
    OP_VERIF = 0x65,
    OP_VERNOTIF = 0x66,
    OP_ELSE = 0x67,
    OP_ENDIF = 0x68,
    OP_VERIFY = 0x69,
    OP_RETURN = 0x6a,

    // stack ops
    OP_TOALTSTACK = 0x6b,
    OP_FROMALTSTACK = 0x6c,
    OP_2DROP = 0x6d,
    OP_2DUP = 0x6e,
    OP_3DUP = 0x6f,
    OP_2OVER = 0x70,
    OP_2ROT = 0x71,
    OP_2SWAP = 0x72,
    OP_IFDUP = 0x73,
    OP_DEPTH = 0x74,
    OP_DROP = 0x75,
    OP_DUP = 0x76,
    OP_NIP = 0x77,
    OP_OVER = 0x78,
    OP_PICK = 0x79,
    OP_ROLL = 0x7a,
    OP_ROT = 0x7b,
    OP_SWAP = 0x7c,
    OP_TUCK = 0x7d,

    // splice ops
    OP_CAT = 0x7e,
    OP_SUBSTR = 0x7f,
    OP_LEFT = 0x80,
    OP_RIGHT = 0x81,
    OP_SIZE = 0x82,

    // bit logic
    OP_INVERT = 0x83,
    OP_AND = 0x84,
    OP_OR = 0x85,
    OP_XOR = 0x86,
    OP_EQUAL = 0x87,
    OP_EQUALVERIFY = 0x88,
    OP_RESERVED1 = 0x89,
    OP_RESERVED2 = 0x8a,

    // numeric
    OP_1ADD = 0x8b,
    OP_1SUB = 0x8c,
    OP_2MUL = 0x8d,
    OP_2DIV = 0x8e,
    OP_NEGATE = 0x8f,
    OP_ABS = 0x90,
    OP_NOT = 0x91,
    OP_0NOTEQUAL = 0x92,

    OP_ADD = 0x93,
    OP_SUB = 0x94,
    OP_MUL = 0x95,
    OP_DIV = 0x96,
    OP_MOD = 0x97,
    OP_LSHIFT = 0x98,
    OP_RSHIFT = 0x99,

    OP_BOOLAND = 0x9a,
    OP_BOOLOR = 0x9b,
    OP_NUMEQUAL = 0x9c,
    OP_NUMEQUALVERIFY = 0x9d,
    OP_NUMNOTEQUAL = 0x9e,
    OP_LESSTHAN = 0x9f,
    OP_GREATERTHAN = 0xa0,
    OP_LESSTHANOREQUAL = 0xa1,
    OP_GREATERTHANOREQUAL = 0xa2,
    OP_MIN = 0xa3,
    OP_MAX = 0xa4,

    OP_WITHIN = 0xa5,

    // crypto
    OP_SHA256 = 0xa8,
    OP_HASH160 = 0xa9,
    OP_HASH256 = 0xaa,
    OP_CODESEPARATOR = 0xab,
    OP_CHECKSIG = 0xac,
    OP_CHECKSIGVERIFY = 0xad,
    OP_CHECKMULTISIG = 0xae,
    OP_CHECKMULTISIGVERIFY = 0xaf,

    // expansion
    OP_NOP1 = 0xb0,
    OP_CHECKLOCKTIMEVERIFY = 0xb1,
    OP_CHECKSEQUENCEVERIFY = 0xb2,
    OP_NOP4 = 0xb3,
    OP_NOP5 = 0xb4,
    OP_NOP6 = 0xb5,
    OP_NOP7 = 0xb6,
    OP_NOP8 = 0xb7,
    OP_NOP9 = 0xb8,
    OP_NOP10 = 0xb9,

    // data
    OP_CREATE = 0xc0,

    OP_INVALIDOPCODE = 0xff,

    // support for old (32 byte) address structures
    OP_HASH256_V0 = 0xc1,

    // Temporary address structure
    OP_HASH256_TEMP = 0xc2,
}
