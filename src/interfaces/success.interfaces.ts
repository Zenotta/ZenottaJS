export enum ISuccessAll {
    IErrorInternal,
}

export enum ISuccessZNP {
    FetchWalletInfo = 'Wallet info successfully fetched',
    ExportKeypairs = 'Key-pairs successfully exported',
    ImportKeypairs = 'Key-pairs successfully imported',
    GetPaymentAddress = 'New payment address generated',
    GetDebugData = 'Debug data successfully retrieved',
    GetLatestBlock = 'Current mining block successfully retrieved',
    UTXOAddressesRetrieved = 'UTXO addresses successfully retrieved',
    DataBaseItemsRetrieved = 'Database item(s) successfully retrieved',
    PaymentProcessing = 'Payment processing',
    IpPaymentProcessing = 'IP payment processing',
    DonationRequestSent = 'Donation request sent',
    RunningTotalUpdated = 'Running total updated',
    FetchBalance = 'Balance successfully fetched',
    FetchPendingTransactions = 'Pending transactions successfully fetched',
    CreateReceiptAssets = 'Receipt asset(s) created',
    CreateTransactions = 'Transaction(s) processing',
    ChangeWalletPassphrase = 'Passphrase changed successfully',
    ConstructAddress = 'Address successfully constructed',
}

export enum ISuccessNotary {
    AuthorizationSuccessful = 'Authorization successful',
    BurnAddressFetched = 'Burn address fetched',
}

export enum ISuccessInternal {
    ClientInitialized = 'Client initialized',
    MessageSigned = 'Message successfully signed',
    RbPaymentProcessing = 'Receipt-based payment processing',
    PendingRbPaymentsFetched = 'Succesfully fetched pending receipt-based transactions',
    AddressesReconstructed = 'Addresses have successfully been reconstructed',
    NewAddressGenerated = 'Successfully generated new address',
    SeedPhraseObtained = 'Successfully obtained seed phrase',
    MasterKeyObtained = 'Successfully obtained master key',
    KeypairDecrypted = 'Successfully decrypted key-pair',
    RespondedToRbPayment = 'Successfully responded to receipt-based payment',
}
