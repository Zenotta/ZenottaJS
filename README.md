<div id="top"></div>

<!-- PROJECT LOGO -->
<br />

<div align="center">
  <a>
    <img src="https://gitlab.com/zenotta/zenotta-js/-/raw/readme_for_oss/assets/hero.jpg" alt="Logo">
  </a>

  <h3 align="center">Zenotta-JS</h3>

  <div><img src="https://gitlab.com/zenotta/zenotta-js/badges/main/pipeline.svg" alt="Pipeline Status" /></div>

  <p align="center">
    A JavaScript module to help interact with the Zenotta blockchain network.
    <br />
    <br />
    <a href="https://zenotta.io"><strong>Official documentation »</strong></a>
    <br />
    <br />
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#installation">Installation</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
    </li>
     <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#generating-and-testing-seed-phrases">Generating and Testing Seed Phrases</a></li>
        <li><a href="#generating-key-pairs">Generating Key-pairs</a></li>
        <li><a href="#updating-the-balance">Updating the Balance</a></li>
        <li><a href="#making-token-payments">Making Token Payments</a></li>
        <li><a href="#making-receipt-based-payments">Making Receipt-based Payments</a></li>
        <li><a href="#fetching-pending-receipt-based-payments">Fetching Pending Receipt-based Payments</a></li>
        <li><a href="#responding-to-pending-receipt-based-payments">Responding to Pending Receipt-based Payments</a></li>
      </ul>
    </li>
    <li>
      <a href="#client-response-type">Client Response Type</a>
    </li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

This module aims to ease the development of wallet applications that interact with the Zenotta network.

Specific areas of focus include:

* Key-pair generation through the use of BIP39 mnemonic implementation.
* Encryption and decryption of key-pairs during operations safely.
* Transactions and other complex network interactions simplified.

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Installation

Install the module to your project:

* npm

  ```sh
  npm install @zenotta/zenotta-js
  ```

* yarn

  ```sh
  yarn add @zenotta/zenotta-js
  ```

## Getting Started

* `initNew`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const COMPUTE_HOST = 'example.compute.host.com'
  const INTERCOM_HOST = 'example.intercom.host.com'
  const PASSPHRASE = 'a secure passphrase'

  // Create the client object
  const client = new ZenottaInstance();

  // Initialize the client with the needed configuration
  const initResult = client.initNew({
      computeHost: COMPUTE_HOST,
      intercomHost: INTERCOM_HOST,
      passPhrase: PASSPHRASE,
    }
  );

  const [seedPhrase, masterKeyEncrypted] = initResult.content.initNewResponse;

  // Display the seed phrase to the user for safe keeping
  displaySeedPhrase(seedPhrase);

  // Store the encrypted master key safely
  saveMasterKey(masterKeyEncrypted);
  ```
  
When the client is initialized without a pre-generated seed phrase or existing master key, the `initNew` function is used to initialize the client. This type of initialization will in return provide a generated seed phrase as well as its corresponding master key in an encrypted format. It is then up to the developer to store this master key somewhere safe, and to display the seed phrase at least once to the user for safe-keeping. This seed phrase can be used to re-construct lost key-pairs if the need should arise.

Some arguments during the initialization are optional, such as the `timeout`- which is used determine the maximum amount of time the client is allowed to wait for a response from the network.

The `computeHost` and `intercomHost` interface elements are used to determine the API endpoints for the Compute node, and Zenotta Intercom server the client is supposed to connect to, respectively.

A user-defined `passPhrase` needs to be supplied to the client during initialization, as this passphrase will be used to encrypt/decrypt data during operations.

* `initFromMasterKey`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const COMPUTE_HOST = 'example.compute.host.com'
  const INTERCOM_HOST = 'example.intercom.host.com'
  const PASSPHRASE = 'a secure passphrase'

  // Create the client object
  const client = new ZenottaInstance();

  // Initialize the client with the needed configuration
  client.initFromMasterKey({
      computeHost: COMPUTE_HOST,
      intercomHost: INTERCOM_HOST,
      passPhrase: PASSPHRASE,
    },
    masterKey: getMasterKey()
  );
  ```

When an existing master key exists, this type of initialization **should** be used. This typically occurs when the client has been initialized previously using `initNew` and the encrypted master key has been stored safely. Using an existing master key will ensure that BIP39 key-pair derivation is consistent. This type of initialization does not have a return value.

* `initFromSeed`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const COMPUTE_HOST = 'example.compute.host.com'
  const INTERCOM_HOST = 'example.intercom.host.com'
  const PASSPHRASE = 'a secure passphrase'
  const SEED_PHRASE = 'a seed phrase that should look like a bunch of random words'

  // Create the client object
  const client = new ZenottaInstance();

  // Initialize the client with the needed configuration
  const initResult = client.initFromSeed({
      computeHost: COMPUTE_HOST,
      intercomHost: INTERCOM_HOST,
      passPhrase: PASSPHRASE,
    },
    seedPhrase: SEED_PHRASE
  );

    const masterKey = initResult.content.initFromSeedResponse;

    // Store the encrypted master key safely
  saveMasterKey(masterKeyEncrypted);
  ```

Initialization of the client through the use of an existing seed phrase may happen for one of two reasons:
<ol>
<li>
The user has lost their key-pairs and re-generation is needed by providing the seed phrase.
</li>
<li>
A valid seed phrase has been pre-generated due to specific UX design constraints and needs to be used to initialize the client.
</li>
</ol>

This type of initialization will return the corresponding master key (in an encrypted format) which was created using the provided seed phrase. This master key needs to be stored safely in the same manner as initialization using `initNew`.

<details>
<summary>User-defined Methods</summary>

```typescript
  function saveMasterKey(masterKeyEncrypter: IMasterKeyEncrypted): void {
    // Write your I/O operations here to safely store the encrypted master key
    ...
  }

  function getMasterKey(): IMasterKeyEncrypted {
    // Write your I/O operations here to safely retrieve 
    // the encrypted master key
    ...
  }

  function saveKeypair(keyPair: IKeyPairEncrypted): void {
    // Write your I/O operations here to safely store the key pair
    ...
  }

  function getKeypairs(): IKeyPairEncrypted[] {
    // Write your I/O operations here to safely retrieve 
    // the encrypted key pairs
    ...
  }

  function getAllEncryptedTxs(): ICreateTransactionEncrypted[] {
    // Write your I/O operations here to get all encrypted 
    // transactions
    ...
  }

  function saveEncryptedTx(druid: string, encryptedTx: ICreateTransactionEncrypted): void {
    // Write your I/O operations here to save the encrypted transaction
    // with its corresponding DRUID value in a key-value format
    ...
  }

```

Many methods will either **require** or **return** different types of data depending on the operation. It is entirely up to the developer to store and retrieve data safely.
</details>
<p align="right">(<a href="#top">back to top</a>)</p>

## Usage

After the client has been correctly initialized, the methods provided by the client will allow the developer to interact with the Zenotta blockchain network.

### Generating and Testing Seed Phrases

* `generateSeedPhrase`

  ```typescript
  import { generateSeedPhrase } from '@zenotta/zenotta-js';

  const seedPhrase = generateSeedPhrase();
  ```

* `testSeedPhrase`

  ```typescript
  import { testSeedPhrase } from '@zenotta/zenotta-js';

  const seedPhrase = 'a seed phrase provided by the user that looks like a bunch of random words';

  const testResult = testSeedPhrase(seedPhrase);
  ```

As seen previously, depending on the scenario, the client can be initialized in a number of different ways. If the client is initialized using `initNew`, a new seed phrase will be generated automatically. However, in some cases the client needs to be initialized using a pre-generated or provided seed phrase.

The `generateSeedPhrase` method is provided by the module to generate valid new seed phrases on the fly. This is especially useful in cases where UX design constraints require a valid seed phrase to be generated and displayed to the user before the client is initialized.

Since a seed phrase can be used to reconstruct lost/missing key-pairs, it is customary for the user to be able to provide their own seed phrase should the need arise. To test if the seed phrase is capable of constructing a valid master key, the `testSeedPhrase` method should be used.

### Generating Key-pairs

* `getNewKeypair`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  const newKeypairResult = client.getNewKeypair();

  const newKeypair: IKeypairEncrypted = newKeypairResult.content.newKeypairResponse;

  // Save the key-pair safely
  saveKeypair(newKeypair);
  ```

### Updating the Balance

* `fetchBalance`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  const allKeypairs = getAllKeypairs();

  // We only need the 'address' field of the key-pairs
  const addressList = allKeypairs.map(keypair => keypair.address);

  const balanceResult = await client.fetchBalance(addressList);

  const balance: IFetchBalanceResponse = balanceResult.content.balanceResponse;
  ```
  
<details>
<summary>Response Content</summary>
<br/>

```json
"total": {
    "tokens": 85000,
    "receipts": 0
}
"address_list": {
    "d0e72...85b46": [
        {
            "out_point": {
                "t_hash": "ga070...4df62",
                "n": 0
            },
            "value": {
                "Token": 60000
            }
        },
        {
            "out_point": {
                "t_hash": "g11e3...c916c",
                "n": 0
            },
            "value": {
                "Token": 25000
            }
        },
    ],
}
```

* `total`: The total balance of all addresses provided
* `address_list`: A list of addresses and their previous out-points
</details>

### Making Token Payments

* `makeTokenPayment`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  const allKeypairs = getAllKeypairs();

  await makeTokenPayment(
        "d0e72...85b46", // Payment address
        10,              // Payment amount
        allKeypairs,     // All key-pairs
        allKeypairs[0],  // Excess/change address
    );

  ```

  ***NB***: *The `makeTokenPayment` method will not check validity of the payment address. It is therefore crucial to ensure a valid payment address is used before the payment gets made.*

### Making Receipt-based Payments

* `makeReceiptPayment`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  const allKeypairs = getAllKeypairs();

  const paymentResult = await makeRbPayment(
        "d0e72...85b46", // Payment address
        10,              // Payment amount
        allKeypairs,     // All key-pairs
        allKeypairs[0],  // Receive address (which is also the excess/change address)
    );

    const { druid, encryptedTx } = paymentResult.content.makeRbPaymentResponse;

    // Save the encrypted transaction along 
    // with it's corresponding DRUID value 
    saveEncryptedTx(druid, encryptedTx);

  ```

### Fetching Pending Receipt-based Payments


* `fetchPendingRbTransactions`
  
  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  const allKeypairs = getAllKeypairs();

  const allEncryptedTxs = getAllEncryptedTxs();

  const pendingRbTransactionsResult = await client.fetchPendingRbTransactions(
        allKeypairs,
        allEncryptedTxs:,
    )

  const pendingRbTransactions: IFetchPendingRbResponse = pendingRbTransactionsResult.content.fetchPendingRbTransactionsResponse;

  ```

<details>
<summary>Response Content</summary>
<br/>

```json
{
    "18c32...a8478": {
        "timestamp": 1646992748926,
        "value": {
            "DRUID0xf60aa3e17": {
                "senderAsset": "Token",
                "senderAmount": 1000,
                "senderAddress": "18c32...a8478",
                "receiverAsset": "Receipt",
                "receiverAmount": 1,
                "receiverAddress": "1a8a7...eb901",
                "fromAddr": "32a18...07816",
                "status": "pending"
            }
        }
    }
}
```

From this data structure we're able to obtain specific details about the receipt-based payment, such as the unique identifier `DRUID0xf60aa3e17`, the status of the transaction `status`, the timestamp of the transaction `timestamp`, as well as the address that made the receipt-based payment request- `18c32...a8478`.

We are also able to see that in this specific request, the sender expects 1 `Receipt` asset in exchange for 1000 `Token` assets.
</details>

### Responding to Pending Receipt-based Payments

* `acceptRbTx` and `rejectRbTx`

```typescript
import { ZenottaInstance } from '@zenotta/zenotta-js';

const client = new ZenottaInstance();

// Initialize the client correctly
...

// Fetch the pending receipt-based payments from the network
...
const pendingRbTransactions: IFetchPendingRbResponse = pendingRbTransactionsResult.content.fetchPendingRbTransactionsResponse;

// Fetch all existing key-pairs
...
const allKeypairs = getAllKeypairs();

// Accept a receipt-based payment using its unique `DRUID` identifier
await client.acceptRbTx('DRUID0xf60aa3e17', pendingRbTransactions, allKeypairs);

<!-- --------------------------------- OR ---------------------------------- -->

// Reject a receipt-based payment using its unique `DRUID` identifier
await client.rejectRbTx('DRUID0xf60aa3e17', pendingRbTransactions, allKeypairs);
```

Receipt-based transactions are accepted **or** rejected by passing their unique DRUID identifier as an argument to the corresponding methods.

<p align="right">(<a href="#top">back to top</a>)</p>

## Client Response Type

All methods provided by the client have a return value corresponding to the following interface:

```typescript
export type IClientResponse = {
    id?: string;
    status: 'success' | 'error' | 'pending' | 'unknown';
    reason?: string;
    content?: IContentType;
};
```

, where each field represents the following:

* `status`: A general indication of success or failure for the method being used

* `id`: A unqiue identifier used for network interactions

* `reason`: Detailed feedback corresponding to the `status` field

* `content`: Data structures or values returned from the client object