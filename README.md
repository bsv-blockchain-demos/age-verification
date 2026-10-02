# Age Verification Certificate Demo

A React and Express demonstration of requesting a BSV age-verification certificate and presenting it through an authenticated wallet request. The interface first attempts access without a certificate, requests one through a compatible wallet, then retries the API request.

This demonstrates certificate exchange. It is not a complete age-checking or protected-media service: the frontend submits an `over18` claim, and the sample video remains directly accessible as a public static file.

## Components

| Component | Purpose |
| --- | --- |
| [frontend/](frontend/README.md) | Wallet connection, certificate acquisition and access demonstration. |
| [backend/src/server.ts](backend/src/server.ts) | Certificate authentication, in-memory verification state and video-URL endpoint. |
| External certifier | Signs the requested certificate; its URL and public key are configured in the source. |

The certifier service is a separate dependency. Its implementation determines whether a submitted age claim is actually checked.

## Run locally

Use Node.js 22.13 or later in the 22.x release line, npm and a compatible BRC-100 wallet. Both components currently use `npm install` because they do not include lockfiles.

From the repository root:

```sh
cd backend
npm install
```

Create `backend/.env` with your own configuration:

```dotenv
PORT=3002
SERVER_PRIVATE_KEY=<your-server-wallet-private-key>
WALLET_STORAGE_URL=<wallet-storage-url-for-your-network>
BSV_NETWORK=test
```

Use `test` or `main` for `BSV_NETWORK`, with a matching storage provider. The wallet module contains a fixed fallback private key; supply your own instead of using that shared identity.

The wallet module reads configuration before the entry point calls `dotenv.config()`. Preload the environment so it receives the intended values:

```sh
NODE_OPTIONS='--env-file=.env' npm run dev
```

In a second terminal, from the repository root:

```sh
cd frontend
npm install
```

Create `frontend/.env.local` containing `VITE_API_URL=http://localhost:3002`, then run:

```sh
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`. The API URL does not select the certifier. Keep the certifier URL and public key in the frontend aligned with the key expected by the backend.

## Demonstration behaviour

The access endpoint returns a video URL after the backend records an accepted `over18` field for the wallet identity. The reset flow relinquishes the wallet certificate and clears the backend's verification state.

Verification state exists only in memory. Certificate-field decryption runs asynchronously before request handling continues, so the first authenticated request may arrive before the state is updated.

The sample media under `frontend/public/video/` remains public regardless of the API response. Real content protection would require authorisation at the point where the file is served, plus an appropriate process for verifying age claims.

## Build

Run `npm run build` in each component. For the compiled backend, continue to preload its `.env`:

```sh
NODE_OPTIONS='--env-file=.env' npm start
```

The frontend produces `dist/`. Its [README](frontend/README.md) covers container hosting, build configuration and source entry points. No automated test scripts are defined.

## Licence

**Declared licence: ISC.** The existing project documentation identifies ISC, and [backend/package.json](backend/package.json) also declares ISC. The [frontend package](frontend/package.json) has no separate licence declaration. No standalone licence file is included in this repository.
