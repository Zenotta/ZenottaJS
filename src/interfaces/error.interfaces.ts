/* -------------------------------------------------------------------------- */
/*                           Internal Module Errors                           */
/* -------------------------------------------------------------------------- */

import { Result } from 'neverthrow';

export enum IErrorAll {
    IErrorInternal,
    IErrorNotary,
    IErrorZNP,
}

// ZNP Error Types
export enum IErrorZNP {
    InternalServerError = 'Internal Server Error',
    InvalidPassphrase = 'Invalid passphrase',
    BlankPassphrase = 'New passphrase cannot be blank',
    InvalidRequestBody = 'Invalid request body',
    CannotParseAddress = 'Cannot parse address',
    CannotAccessWallet = 'Cannot access wallet',
    CannotAccessUserNode = 'Cannot access user node',
    CannotAccessComputeNode = 'Cannot access compute node',
    CannotAccessPeerUserNode = 'Cannot access peer user node',
    CannotSaveAddressesToWallet = 'Cannot save address to wallet',
    CannotFetchBalance = 'Cannot fetch balance',
    NoDataFoundForKey = 'No data found for key',
    InternalError = 'Internal Error',
    Unauthorized = 'Unauthorized',
    MethodNotFound = 'Method not found',
    MethodNotAllowed = 'Method not allowed',
    BadRequest = 'Bad request',
}

// Notary service error types
export enum IErrorNotary {
    NotaryIdNotSet = 'Notary ID not set',
    NotaryNotFound = 'Notary not found',
    NoBurnTransaction = 'No burn transaction found',
    InvalidRequestBody = 'Invalid request body',
    InternalServerError = 'Internal Server Error',
    NotaryNotAuthorized = 'Notary not authorized for operation',
    AddressConstructionFailed = 'Address construction from public keys failed',
    TransactionOutputsHaveNoZeno = 'Transaction outputs do not contain Zeno tokens',
    InputsDoNotBelongToPk = 'Previous inputs do not belong to the provided public keys',
    InvalidSignatures = 'Invalid signatures provided',
    InvalidBurnTransaction = 'Transaction outputs to burn address do not contain Zeno tokens',
    TransactionOutputsEmpty = 'Transaction outputs contain no Zeno tokens assigned to provided burn address',
    KeypairUndefined = 'Key-pair undefined',
}

// Internal module error
export enum IErrorInternal {
    InsufficientFunds = 'Insufficient funds',
    NoInputs = 'No inputs for transaction',
    InvalidInputs = 'Some inputs are invalid',
    UnableToGenerateDruid = 'Unable to generate DRUID',
    UnableToConstructTxIns = 'Unable to construct tx ins',
    UnableToConstructSignature = 'Unable to construct signature',
    UnableToGetKeypairFromMap = 'Unable to retrieve key-pair from map',
    InvalidAddressVersion = 'Unable to determine address version',
    InvalidParametersProvided = 'Invalid parameters provided',
    UnableToConstructOldAddress = 'Unable to construct old address',
    UnableToConstructTempAddress = 'Unable to construct temp address',
    UnableToConstructDefaultAddress = 'Unable to construct default address',
    UnableToGenerateSeed = 'Unable to generate seed',
    UnableToGetExistingSeed = 'Unable to get existing seed phrase',
    UnableToGetExistingMasterKey = 'Unable to get existing master key',
    UnableToGetPassphraseBuffer = 'Unable to get passphrase buffer',
    UnableToGetKeypair = 'Unable to get key-pair',
    UnableToGenerateMasterKey = 'Unable to generate master key',
    UnableToGenerateKeypair = 'Unable to generate key-pair',
    UnableToDeriveNextKeypair = 'Unable to derive next key-pair',
    UnableToEncryptKeypair = 'Unable to encrypt key-pair',
    UnableToEncryptMasterKey = 'Unable to encrypt master key',
    UnableToDecryptKeypair = 'Unable to decrypt keypair',
    UnableToDecryptMasterKey = 'Unable to decrypt master key',
    MasterKeyCorrupt = 'Master key is corrupt',
    UnableToRegenAddresses = 'Unable to regenerate addresses',
    UnableToEncryptTransaction = 'Unable to encrypt transaction',
    UnableToDecryptTransaction = 'Unable to decrypt transaction',
    InvalidSeedPhrase = 'Invalid seed phrase',
    InvalidDRUIDProvided = 'Invalid DRUID value provided',
    UnableToFilterIntercomData = 'Unable to filter intercom data',
    ClientNotInitialized = 'Client not initialized',
    FetchBalanceResponseEmpty = 'Balance object is empty',
    NoDRUIDValues = 'DRUID values are null',
    AssetsIncompatible = 'Assets are incompatible',
    KeyValuePairNotSingle = 'Key-value pair does not only have one element',
    UnableToFindNonEmptyAddresses = 'Unable to find addresses that contain assets',
    InvalidNetworkResponse = 'Invalid network response',
    UnableToSignMessage = 'Unable to sign message',
    NoHostsProvided = 'No hosts provided',
    NoKeypairsProvided = 'No key-pairs provided',
    UnknownError = 'Unknown Error',
}

// Custom `Result` wrapper with string error
export type IResult<T> = Result<T, IErrorInternal | string>;
