<div id="top"></div>

<!-- PROJECT LOGO -->
<br />

<div align="center">
  <a>
    <img src="https://github.com/Zenotta/ZenottaJS/blob/develop/assets/hero.svg" alt="Logo" style="width: 350px">
  </a>

  <h3 align="center">Zenotta-JS</h3>

  <div><img src="https://img.shields.io/github/workflow/status/Zenotta/ZenottaJS/CodeQL" alt="Pipeline Status" /></div>

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
        <li><a href="#creating-receipt-assets">Creating Receipt Assets</a></li>
        <li><a href="#spending-tokens">Spending Tokens</a></li>
        <li><a href="#spending-receipts">Spending Receipts</a></li>
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

<p align="right">(<a href="#top">back to top</a>)</p>

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

Some arguments during the initialization are optional, such as the `initOffline`- which is used to initialize the client in an offline state.

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
<summary>Offline Initialization</summary>
<br/>

```typescript
import { ZenottaInstance } from '@zenotta/zenotta-js';

  const COMPUTE_HOST = 'example.compute.host.com'
  const INTERCOM_HOST = 'example.intercom.host.com'
  const PASSPHRASE = 'a secure passphrase'

  // Create the client object
  const client = new ZenottaInstance();

  // Configuration
  const config = {
      computeHost: COMPUTE_HOST,
      intercomHost: INTERCOM_HOST,
      passPhrase: PASSPHRASE,
    };

  // Initialize the client with the needed configuration
  const initResult = client.initNew(config, true);

  const [seedPhrase, masterKeyEncrypted] = initResult.content.initNewResponse;

  // Display the seed phrase to the user for safe keeping
  displaySeedPhrase(seedPhrase);

  // Store the encrypted master key safely
  saveMasterKey(masterKeyEncrypted);

  // Initialize network configuration when required
  const initNetworkResult = client.initNetwork(config);

```

In some cases, it might be desirable to initialize the client without a network connection. This will allow the client to be used offline, but will inadvertently prevent the client from being able to perform any operations that require interaction with the Zenotta network. The following functions are available with an offline configuration:

* `regenAddresses` - Re-generate lost key-pairs from a list of given addresses.
* `getNewKeypair` - Generate a new key-pair.
* `getSeedPhrase` - Get the existing seed phrase from memory (requires initialization from seed phrase).
* `getMasterKey` - Get the existing master key from memory.

</details>

<details>
<summary>User-defined Methods</summary>
<br/>

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

  const balance: IFetchBalanceResponse = balanceResult.content.fetchBalanceResponse;
  ```
  
  <details>
  <summary>Response Content</summary>
  <br/>

  ```json
  {
      "total": {
          "tokens": 0,
          "receipts": {
              "default_drs_tx_hash": 1000,
              "g7d07...6704b": 1000
          }
      },
      "address_list": {
          "a0b08...c02e5": [
              {
                  "out_point": {
                      "t_hash": "g3b13...3353f",
                      "n": 0
                  },
                  "value": {
                      "Receipt": {
                          "amount": 1000,
                          "drs_tx_hash": "default_drs_tx_hash"
                      }
                  }
              },
              {
                  "out_point": {
                      "t_hash": "g7d07...6704b",
                      "n": 0
                  },
                  "value": {
                      "Receipt": {
                          "amount": 1000,
                          "drs_tx_hash": "g7d07...6704b"
                      }
                  }
              },
              {
                  "out_point": {
                      "t_hash": "ga070...4df62",
                      "n": 0
                  },
                  "value": {
                      "Token": 60000
                  }
              }
          ]
      }
  }
  ```

  * `total`: The total balance of all addresses provided
  * `address_list`: A list of addresses and their previous out-points along with their associated assets
  
  </details>

### Creating Receipt Assets

* `createReceipts`

  ``` typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';
  
  const client = new ZenottaInstance();
  
  // Initialize the client correctly
  ...
  
  // Address / key-pair to assign the `Receipt` assets to
  const keyPair = getAllKeypairs()[0];
  
  // Create `Receipt` assets that have the default DRS identifier
  const createReceiptResponse = await client.createReceipts(keyPair).content.createReceiptResponse;
  
  <!-- --------------------------------- OR ---------------------------------- -->
  
  // Create `Receipt` assets that have a unique DRS identifier
  const createReceiptResponse = await client.createReceipts(keyPair, false).content.createReceiptResponse;
  
  ```

  `Receipt` assets can either be assigned to the default digital rights signature (DRS) or a unique DRS. When assets have different DRS identifiers they are **not** mutually interchangeable with each other.
  
  <details>
  <summary>Response Content</summary>
  <br/>

  ```json
  {
      "asset": {
          "asset": {
              "Receipt": {
                  "amount": 1000,
                  "drs_tx_hash": "g7d07...6704b"
              }
          },
          "metadata": null
      },
      "to_address": "a0b08...c02e5",
      "tx_hash": "g7d07...6704b"
  }
  ```

  * `drs_tx_hash`: The DRS identifier associated with the created `Receipt` assets.
  
</details>

### Spending Tokens

* `makeTokenPayment`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  // All key-pairs
  const allKeypairs = getAllKeypairs();

  // Change/excess key-pair
  const changeKeyPair = allKeypairs[0];

  await makeTokenPayment(
        "d0e72...85b46", // Payment address
        10,              // Payment amount
        allKeypairs,     // All key-pairs
        changeKeyPair,   // Excess/change address
    );

  ```

  ***NB***: *The `makeTokenPayment` method will not check validity of the payment address. It is therefore crucial to ensure a valid payment address is used before the payment gets made.*

### Spending Receipts

* `makeReceiptPayment`

  ``` typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';
  
  const client = new ZenottaInstance();
  
  // Initialize the client correctly
  ...
  
  // All key-pairs
  const keyPairs = getAllKeypairs();
  
  // Change/excess key-pair
  const changeKeyPair = keyPairs[0];
  
  // DRS identifier (the default DRS identifier or a unique DRS identifier)
  const drsTxHash = "default_drs_tx_hash";
  
  await makeReceiptPayment(
          "d0e72...85b46", // Payment address
          10,              // Payment amount
          drsTxHash        // DRS identifier
          allKeypairs,     // All key-pairs
          changeKeyPair,   // Excess/change address
      );
  
  ```
  
  ***NB***: *The `makeReceiptPayment` method is similar to the `makeTokenPayment` in many regards, one of which being the fact that this method will send `Receipt` assets to a payment address in a unidirectional fashion and does not expect any assets in return. It should not be confused with **receipt-based** payments!*
  
### Making Receipt-based Payments

* `makeReceiptPayment`

  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  // All key-pairs
  const allKeypairs = getAllKeypairs();

  // Receive address (which is also the excess/change address)
  const receivingAddress = allKeypairs[0];

  // The asset we want to send
  const sendingAsset = initIAssetToken({"Token": 10});

  // The asset we want to receive
  const receivingAsset = initIAssetReceipt({
    "Receipt": {
        "amount": 10,
        "drs_tx_hash": "default_drs_tx_hash"
    }});

  const paymentResult = await makeRbPayment(
        "18f70...caeda",  // Payment address
        sendingAsset,     // Payment asset
        receivingAsset,   // Receiving asset
        allKeypairs,      // All key-pairs
        receivingAddress, // Receive address
    );

    const { druid, encryptedTx } = paymentResult.content.makeRbPaymentResponse;

    // Save the encrypted transaction along 
    // with it's corresponding DRUID value 
    saveEncryptedTx(druid, encryptedTx);

  ```

  ***NB***: *This type of transaction is a Dual-Double-Entry (DDE) transaction, and requires all parties to reach common consent before their respective transactions are sent to the compute node for processing.*

### Fetching Pending Receipt-based Payments

* `fetchPendingRbTransactions`
  
  ```typescript
  import { ZenottaInstance } from '@zenotta/zenotta-js';

  const client = new ZenottaInstance();

  // Initialize the client correctly
  ...

  // ALl key-pairs
  const allKeypairs = getAllKeypairs();

  // All encrypted transactions
  const allEncryptedTxs = getAllEncryptedTxs();

  // Fetch pending receipt-based payments
  const pendingRbTransactionsResult = await client.fetchPendingRbTransactions(
        allKeypairs,
        allEncryptedTxs:,
    )

  const pendingRbTransactions: IResponseIntercom<IPendingRbTxDetails> = pendingRbTransactionsResult.content.fetchPendingRbResponse;

  ```

  <details>
  <summary>Response Content</summary>
  <br/>
  
  ```json
  {
      "2a646...f8b98": {
          "timestamp": 1655117144145,
          "value": {
              "druid": "DRUID0xd0f407436f7f1fc494d7aee22939090e",
              "senderExpectation": {
                  "from": "",
                  "to": "2a646...f8b98",
                  "asset": {
                      "Receipt": {
                          "amount": 1,
                          "drs_tx_hash": "default_drs_tx_hash"
                      }
                  }
              },
              "receiverExpectation": {
                  "from": "295b2...8d4fa",
                  "to": "18f70...caeda",
                  "asset": {
                      "Token": 25200
                  }
              },
              "status": "pending",
              "computeHost": "http://127.0.0.1:3003"
          }
      }
  }
  ```
  
  From this data structure we're able to obtain specific details about the receipt-based payment, such as the unique identifier `DRUID0xd0f407436f7f1fc494d7aee22939090e`, the status of the transaction `status`, the timestamp of the transaction `timestamp`, as well as the address that made the receipt-based payment request- `2a646...f8b98`.
  
  We are also able to see that in this specific request, the sender expects 1 `Receipt` asset in exchange for 25200 `Token` assets.
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
  const pendingRbTransactions: IFetchPendingRbResponse = pendingRbTransactionsResult.content.fetchPendingRbResponse;
  
  // Fetch all existing key-pairs
  ...
  const allKeypairs = getAllKeypairs();
  
  // Accept a receipt-based payment using its unique `DRUID` identifier
  await client.acceptRbTx('DRUID0xd0f407436f7f1fc494d7aee22939090e', pendingRbTransactions, allKeypairs);
  
  <!-- --------------------------------- OR ---------------------------------- -->
  
  // Reject a receipt-based payment using its unique `DRUID` identifier
  await client.rejectRbTx('DRUID0xd0f407436f7f1fc494d7aee22939090e', pendingRbTransactions, allKeypairs);
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

* `id`: A unique identifier used for network interactions

* `reason`: Detailed feedback corresponding to the `status` field

* `content`: Data structures or values returned from the client object

<p align="right">(<a href="#top">back to top</a>)</p>
