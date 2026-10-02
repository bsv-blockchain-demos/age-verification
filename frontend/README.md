# Age Verification Frontend

React interface for a BSV certificate access demonstration. The flow attempts access without a certificate, requests an `age-verification` certificate through a compatible wallet, then retries the request using `AuthFetch`.

See the [project overview](../README.md) for the backend and container layout.

## Requirements

- Node.js 22.13 or later in the 22.x release line, and npm.
- A BRC-100 wallet accessible through `WalletClient` for certificate operations.
- The [backend](../backend/src/server.ts), normally at `http://localhost:3002`.
- Access to the certifier configured in [AccessControlDemo.tsx](src/components/AccessControlDemo.tsx).

## Run locally

From the repository root:

```sh
cd frontend
npm install
```

Create `frontend/.env.local` with:

```dotenv
VITE_API_URL=http://localhost:3002
```

Start the development server:

```sh
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, normally `http://localhost:5173`. Start and configure the backend separately. The checked-in `.env.example` targets a hosted API; use the local value above when developing against your own backend.

`VITE_API_URL` selects the access-control API. It does not change the certifier: the certifier URL and public key are fixed in the component, and the backend expects the same certifier key.

## Demonstration flow

1. Attempt access without a certificate.
2. Request a certificate through the wallet.
3. Retry access using the wallet's authenticated request flow.
4. Relinquish the certificate and clear the backend's verification state to repeat the demonstration.

Acquisition first attempts to relinquish existing certificates of the configured type and certifier. Use a wallet intended for this demonstration.

## Current limitations

The frontend submits `over18: 'true'` and a timestamp to the external certifier. It does not collect or independently validate a date of birth; any real age checks depend on the certifier's implementation.

The video is included under `public/video/` and is served as a public static asset. The API controls whether the interface receives its URL, but does not protect direct access to the file. This demonstrates certificate exchange, not a complete system for restricting access to content.

The backend keeps verification state in memory and starts certificate-field decryption asynchronously before continuing request handling. A first authenticated request can therefore arrive before verification state is set.

## Build and source guide

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

The build type-checks the application and writes static assets to `dist/`. API configuration is embedded at build time. `npm run lint` is also available; no test script is defined.

- [AccessControlDemo.tsx](src/components/AccessControlDemo.tsx): certificate acquisition, access requests and reset flow.
- [WalletContext.tsx](src/context/WalletContext.tsx): wallet client setup.
- [Dockerfile](Dockerfile) and [nginx.conf](nginx.conf): static hosting on container port 8080.

## Licence

This frontend's [package.json](package.json) has no licence declaration. The backend declares the **ISC licence**; see the [repository licence section](../README.md#licence) for the recorded declarations. No standalone licence file is included in this repository.
