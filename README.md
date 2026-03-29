# StellarVault — Decentralized Escrow on Stellar

A trustless escrow dApp built on the **Stellar Soroban** smart contract platform. Lock, release, and refund XLM with full on-chain transparency.

## Deployed contract ID
  [CAJV7EFWQFV5SZVUYYZE2WW55H6YJKEVTUZ7PVCRE2L2A7SJJSV5BS45]


## Token ID
  [CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC]

## Features

- **Create Escrow** — Lock XLM in a smart contract with a beneficiary and arbiter
- **Release Funds** — Depositor or arbiter can release funds to the beneficiary
- **Refund** — Beneficiary or arbiter can refund funds to the depositor
- **Escrow Lookup** — Fetch any escrow by ID and view full details
- **Transaction Verification** — Look up any Stellar transaction hash
- **Real-time Dashboard** — Auto-refreshing escrow list with status tracking
- **Freighter Wallet** — Seamless integration with the Freighter browser wallet
- **Mobile Responsive** — Fully responsive design for all screen sizes

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Blockchain | Stellar Soroban, @stellar/stellar-sdk |
| Wallet | Freighter (@stellar/freighter-api) |
| CI/CD | GitHub Actions |

## Contract Details

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Escrow Contract** | `CAJV7EFWQFV5SZVUYYZE2WW55H6YJKEVTUZ7PVCRE2L2A7SJJSV5BS45` |
| **Token Contract** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **RPC URL** | `https://soroban-testnet.stellar.org` |

### Contract Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `create_escrow` | `depositor, beneficiary, arbiter, amount` | Create a new escrow (requires prior token approval) |
| `release` | `caller, escrow_id` | Release escrowed funds to the beneficiary |
| `refund` | `caller, escrow_id` | Refund escrowed funds to the depositor |
| `get_escrow` | `escrow_id` | Read escrow details |
| `get_count` | — | Get total number of escrows |

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Freighter Wallet](https://www.freighter.app/) browser extension
- A Stellar testnet account funded via [Friendbot](https://friendbot.stellar.org/)

### Installation

```bash
git clone <your-repo-url>
cd stellarvault
npm install
npm run dev
```

### Usage

1. Install the Freighter wallet extension
2. Switch Freighter to **Stellar Testnet**
3. Fund your account using Friendbot
4. Connect wallet via the app header
5. **Create Escrow**: Enter beneficiary, arbiter, and amount → approve token spend → confirm escrow creation
6. **Release/Refund**: Navigate to Lookup, enter escrow ID, and use the action buttons

### Important Notes

- **Token approval is required** before `create_escrow` — the app handles this automatically
- **Release**: Only the depositor or arbiter can release funds
- **Refund**: Only the beneficiary or arbiter can refund
- The contract is **already initialized** — do NOT call `initialize`

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx vitest run       # Run tests
npx tsc --noEmit     # Type check
```

## Architecture

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # shadcn/ui primitives
│   ├── CreateEscrowForm.tsx
│   ├── EscrowCard.tsx
│   ├── EscrowDetails.tsx
│   ├── Header.tsx
│   └── WalletButton.tsx
├── contexts/         # React contexts (Wallet)
├── lib/
│   ├── stellar.ts    # Soroban contract helpers
│   └── wallet.ts     # Freighter wallet integration
└── pages/            # Route pages
    ├── Dashboard.tsx
    ├── CreateEscrow.tsx
    ├── EscrowLookup.tsx
    └── VerifyTransaction.tsx
```

## License

MIT
