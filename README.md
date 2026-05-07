# Shelby Bridge

> Cross-chain hot storage built on [Shelby Protocol](https://shelby.xyz). Upload once, serve everywhere — Aptos · Solana · NEAR · Ethereum — with cryptographic proofs and paid reads.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new)

---

## What it does

Shelby Bridge is a web app that lets you store files ("blobs") on Shelby Protocol's hot storage network and make them available to consumers on any blockchain. Every upload is:

- **Clay erasure-coded** across 16 storage providers for redundancy
- **Committed on Aptos** — ownership and metadata anchored on-chain
- **Served with sub-second latency** via Shelby's dedicated fiber backbone
- **Optionally priced** — set a price per read in APT and earn on every fetch

---

## Live stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, standalone output) |
| Styling | Tailwind CSS + Space Grotesk / Space Mono |
| Storage | Shelby Protocol (`@shelby-protocol/sdk`) |
| Chain | Aptos shelbynet (`@aptos-labs/ts-sdk` v6) |
| Wallets | Petra (AIP-62 standard) · Phantom (window.solana) |
| Deployment | Railway (Docker, standalone image ~400 MB) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — live stats, feature overview |
| `/upload` | Upload a blob with TTL and price-per-read |
| `/browse` | Browse all cached blobs |
| `/read/[blobId]` | Fetch a blob, pay, receive cryptographic proof |
| `/analytics` | Read volume, earnings, cache hit rate |
| `/api/health` | Health check endpoint (used by Railway) |

---

## Deploy to Railway

### 1. Prerequisites

- [Shelby CLI](https://docs.shelby.xyz/tools/cli) installed
- An Aptos account funded on shelbynet
- A Shelby API key from [developers.aptoslabs.com](https://developers.aptoslabs.com)

### 2. Fund your account

```bash
# Create an account on shelbynet
shelby account create --alias alice --context shelbynet

# Fund with APT and ShelbyUSD
curl -X POST "https://faucet.shelbynet.shelby.xyz/mint?address=YOUR_ADDRESS&amount=1000000000"
shelby account fund --alias alice --context shelbynet
```

### 3. Deploy

```bash
# Push to GitHub, then connect to Railway
git push origin main
# Railway → New Project → Deploy from GitHub → select repo
```

### 4. Set Railway environment variables

Go to **Railway dashboard → your service → Variables** and add:

| Variable | Value |
|----------|-------|
| `SHELBY_API_KEY` | `AG-…` from developers.aptoslabs.com |
| `APTOS_PRIVATE_KEY` | `ed25519-priv-0x…` from shelby account create |
| `APTOS_ACCOUNT_ADDRESS` | `0x…` your Aptos address |

Optional (defaults work for shelbynet):

| Variable | Default |
|----------|---------|
| `SHELBY_NETWORK` | `shelbynet` |
| `SHELBY_RPC_URL` | `https://api.shelbynet.shelby.xyz/shelby` |
| `APTOS_FULLNODE_URL` | `https://api.shelbynet.shelby.xyz/v1` |
| `APTOS_INDEXER_URL` | `https://api.shelbynet.shelby.xyz/v1/graphql` |
| `SHELBY_FAUCET_URL` | `https://faucet.shelbynet.shelby.xyz` |

### 5. Verify

```bash
curl https://YOUR-APP.up.railway.app/api/health | jq .
# "shelby_api_key": true  ← confirms the key is loaded
```

---

## Run locally

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy and fill in environment variables
cp .env.example .env.local   # if using the full monorepo
# Or create .env.local manually with the variables above

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Wallet connect

**Petra (Aptos)** — install from [petra.app](https://petra.app). Uses the AIP-62 wallet standard — click "Connect Petra" in the nav bar and approve the connection in the extension popup.

**Phantom (Solana)** — install from [phantom.app](https://phantom.app). Uses `window.solana`. Switch Phantom to Devnet for shelbynet testing.

---

## Uploading a blob

1. Connect your Petra wallet
2. Go to **Store** (`/upload`)
3. Drop a file or browse — any format, up to 5 GiB
4. Set a blob name (e.g. `models/llama-3b.gguf`)
5. Choose TTL (how long to keep it hot) and price per read
6. Click **Upload to Shelby**

The SDK handles Clay erasure coding, chunk distribution, and the Aptos commitment transaction. Your account needs APT for gas and ShelbyUSD for the storage fee — both available from the [shelbynet faucet](https://faucet.shelbynet.shelby.xyz).

---

## After uploading

The blob is identified as `{ownerAddress}/{blobName}`. View it on the [Shelby Explorer](https://explorer.shelby.xyz/shelbynet) by searching your account address.

---

## Shelbynet notes

- Shelbynet is the Shelby devnet — it **resets approximately weekly**
- After a reset: re-fund your account from the faucet, then redeploy on Railway
- Contract address: `0xc63d6a5efb0080a6029403131715bd4971e1149f7cc099aac69bb0069b3ddbf5`

---

## Network reference

| Resource | URL |
|----------|-----|
| Shelby RPC | `https://api.shelbynet.shelby.xyz/shelby` |
| Aptos fullnode | `https://api.shelbynet.shelby.xyz/v1` |
| Indexer (GraphQL) | `https://api.shelbynet.shelby.xyz/v1/graphql` |
| Faucet | `https://faucet.shelbynet.shelby.xyz` |
| Explorer | `https://explorer.shelby.xyz/shelbynet` |
| Shelby docs | `https://docs.shelby.xyz` |
| Discord | `https://discord.com/invite/shelbyserves` |

---

## License

MIT
