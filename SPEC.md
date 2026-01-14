# Access Control

## Overview

The general idea here is to demonstrate the Identity and Certificates framework built on top of BSV blockchain within the distributed applications stack. The demo should allow a user to create a certificate using acquireCertificate() method from the WalletClient. The certifierURL should be set to https://certify.bsvb.tech 

## Features

The demo should allow the user to generate a certificate which expires within 1 minute, so the data included ought to include a unix timestamp, and a boolean value true or false for "over18". The demonstrator can check the user's ID to verify and sign off on this fact at their discretion.

Once issued the demo app will switch to "content access demo" mode where the user will be prompted to "provide access credential". Once they press that button the app should grab the certificate from the wallet using listCertificates() method from the WalletClient. The app should then decrypt the certificate and grant access on the basis of the timestamp being within the last minute and the boolean value being true. 

These things will be validated by the api which will use node express server and @bsv/auth-express-middleware setting the requestedCertificates parameter in the configuration. Which means the app needs to make requests to the api using AuthFetch from the @bsv/sdk instantiated with the wallet from WalletClient brought in via the useWallet() hook much like the data-integrity app.

We need to make up some data which the api is protecting, let's just say it's a link to a video which the user can then play in a video html5 element using src attribute of the video element "2387368734-34-2354234-5432-4235.mp4" which should link to a video file in the public directory.

## Implementation

Here's an example snippet creating a plumber certificate.

```ts
import { WalletClient, Utils } from '@bsv/sdk'

export async function createCertificate(runner) {

    // Connect to user's wallet
    const wallet = new WalletClient()
    
    // Server key at our certifier endpoint
    const certifier = '03c644fe2fd97673a5d86555a58587e7936390be6582ece262bc387014bcff6fe4'
    
    const type = Utils.toBase64(Utils.toArray('internet plumbing', 'utf8'))

    // Create a certificate of anything you need
    const response = await wallet.acquireCertificate({
      type,
      acquisitionProtocol: 'issuance',
      certifier,
      certifierUrl: 'https://certify.bsvb.tech',
      fields: {  
        'soldering': 'veteran',
        'pipe fitting': 'expert',
        'customer service': 'delightful',
        'leaks': 'none whatsoever',
        'moustache': 'impressive',
      }
    })

    return runner.log(response)
    
}
```

Here's an example of listing a certificate to look it back up:

```ts
import { WalletClient, Utils, Random, WalletProtocol, MasterCertificate, VerifiableCertificate } from '@bsv/sdk'

export async function existingCertificate(runner) {

    // Connect to user's wallet
    const wallet = new WalletClient()

    const type = Utils.toBase64(Utils.toArray('internet plumbing', 'utf8'))

    const response = await wallet.listCertificates({
        certifiers: ['03c644fe2fd97673a5d86555a58587e7936390be6582ece262bc387014bcff6fe4'],
        types: [type],
        limit: 1
    })

    const c = response.certificates[0]
    const fields = await MasterCertificate.decryptFields(wallet, c.keyring, c.fields, c.certifier)

    runner.log({ fields })

    // Create a verifiable certificate
    const fieldsToReveal = ['moustache'] // revealing this field only
    const verifier = '02ec9b58db65002d0971c3abe2eef3403d23602d8de2af51445d84e1b64c11a646' // to this identity

    const verifierKeyring = await MasterCertificate.createKeyringForVerifier(
        wallet,
        c.certifier,
        verifier,
        c.fields,
        fieldsToReveal,
        c.keyring,
        c.serialNumber
    )

    const verifiableCertificate = VerifiableCertificate.fromCertificate(c, verifierKeyring)
    
    runner.log({ verifiableCertificate })

}
```

here's and example of using auth-express-middleware to request certificates from the user.

```ts
import express from 'express'
import { createAuthMiddleware } from '@bsv/auth-express-middleware'
import { Wallet } from './wallet'

const wallet = new Wallet()

function onCertificatesReceived(senderPublicKey, certs, req, res, next) {
  console.log(`Received certs from ${senderPublicKey}`, certs)
  next()
}

const authMiddleware = createAuthMiddleware({
  wallet,
  certificatesToRequest: {
    certifiers: ['<certifier-pubkey-hex>'],
    types: {
      'someCertificateType': ['fieldA', 'fieldB']
    }
  },
  onCertificatesReceived
})

const app = express()
app.use(express.json())
app.use(authMiddleware)

app.listen(3000, () => console.log('Server up!'))
```

where the wallet server side implementaion looks like this:

```ts
import { KeyDeriver, PrivateKey, WalletInterface } from '@bsv/sdk'
import { Services, StorageClient, Wallet, WalletSigner, WalletStorageManager } from '@bsv/wallet-toolbox-client';

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string
const WALLET_STORAGE_URL = process.env.WALLET_STORAGE_URL as string
const BSV_NETWORK = process.env.BSV_NETWORK as 'mainnet' | 'testnet'

let walletInstance: WalletInterface | null = null

export async function getWallet(): Promise<WalletInterface> {
    if (!walletInstance) {
        const chain = BSV_NETWORK === 'mainnet' ? 'main' : 'test'
        const keyDeriver = new KeyDeriver(new PrivateKey(SERVER_PRIVATE_KEY, 'hex'));
        const storageManager = new WalletStorageManager(keyDeriver.identityKey);
        const signer = new WalletSigner(chain, keyDeriver, storageManager);
        const services = new Services(chain);
        const wallet = new Wallet(signer, services);
        const client = new StorageClient(wallet, WALLET_STORAGE_URL);
        await client.makeAvailable();
        await storageManager.addWalletStorageProvider(client);
        return wallet;
    }
    return walletInstance
}
```
