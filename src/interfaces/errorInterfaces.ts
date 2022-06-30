/* -------------------------------------------------------------------------- */
/*                           Internal Module Errors                           */
/* -------------------------------------------------------------------------- */

import { Result } from 'neverthrow';

export enum IErrorInternal {
    InsufficientFunds = 'Insufficient funds',
    NoInputs = 'No inputs for transaction',
    InvalidInputs = 'Some inputs are invalid',
    UnableToGenerateDruid = 'Unable to generate DRUID',
    UnableToConstructTxIns = 'Unable to construct tx ins',
    UnableToConstructSignature = 'Unable to construct signature',
    InvalidAddressVersion = 'Unable to determine address version',
    InvalidParametersProvided = 'Invalid parameters provided',
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
    UnknownError = 'Unknown Error',
    KeyMgmtNotInitialized = "Key management hasn't been initialized",
}

// Custom `Result` wrapper with string error
export type IResult<T> = Result<T, IErrorInternal | string>;
