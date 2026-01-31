# Kora Rent Reclaim Bot 🤖💰

> **Automated Rent Recovery for Kora Operators**
>
> Stop leaking SOL. Automatically reclaim rent from inactive or abandoned sponsored accounts.

## Overview

**Kora** is a powerful infrastructure layer that enables applications to sponsor transactions and account creation on Solana, providing a seamless user experience (gasless transactions). However, this convenience creates a hidden operational cost: **Rent-Locked SOL**.

When a Kora operator sponsors the creation of a Token Account or other state, they pay the rent exemption fee (typically ~0.002 SOL per account). Over time, thousands of these accounts can become:

- **Abandoned**: Users stop using the app.
- **Empty**: Balances are transferred out, leaving the account open but useless.
- **Inactive**: No transactions for extended periods.

For a busy operator, this can amount to **hundreds or thousands of SOL** locked in accounts that are no longer serving any purpose.

**This bot solves that problem.** It audits your transaction history, identifies sponsored accounts, checks their activity/state, and safely closes eligible accounts to reclaim the rent back to your treasury.

---

## How It Works

This tool is designed with a safe, 3-step pipeline to ensure no active user accounts are affected.

### 1. Scan 🔍

The bot scans the on-chain transaction history of your **Kora Operator Fee Payer** address. It looks for `CreateAccount`, `InitializeAccount`, or other sponsorship patterns to identify every account you have ever funded.

- **Input**: Fee Payer Address
- **Output**: A local database of potential "Sponsored Accounts".

### 2. Analyze 📊

It checks the current on-chain state of each discovered account.

- **Liveness Check**: Is the account still open?
- **Activity Check**: Has there been any transaction activity in the last `X` days? (Configurable)
- **Balance Check**: Is the token balance 0?
- **Eligibility**: If an account is **Zero Balance** AND **Inactive** for >30 days (default), it is marked as `Eligible` for reclaim.

### 3. Reclaim 💸

The bot executes cleanup transactions for eligible accounts.

- **Action**: detailed `CloseAccount` instructions are verified.
- **Safety**: Runs a simulation first (Dry Run) if requested.
- **Execution**: Closes the account and sends the rent SOL to your configured `Treasury Address`.

---

## Installation & Setup

### Prerequisites

- [Bun](https://bun.sh) (Runtime & Package Manager)
- A Kora Operator Keypair (for signing reclaim transactions)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/kora-reclaim-bot.git
cd kora-reclaim-bot
bun install
```

### 2. Configuration

Create a `config.json` file in the root directory. You can use `example_config.json` as a template.

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "operatorKeypairPath": "./id.json",
  "feePayer": "YOUR_FEE_PAYER_ADDRESS",
  "treasuryAddress": "YOUR_TREASURY_WALLET",
  "inactiveDaysThreshold": 30,
  "dryRun": false
}
```

---

## Usage

This tool is CLI-based. You can run individual commands depending on your needs.

### Quick Start

Run the full monitoring cycle:

```bash
# 1. Find accounts you paid for
bun run scan

# 2. Check which ones are empty/inactive
bun run analyze

# 3. Reclaim the rent!
bun run reclaim
```

### Detailed Commands

#### 1. Scan History

Scans the blockchain for accounts created by your fee payer.

```bash
bun run scan
# Reads feePayer from config.json
```

#### 2. Analyze Accounts

Checks the status of scanned accounts.

```bash
bun run analyze
```

#### 3. Reclaim Rent

Closes eligible accounts.

```bash
# Run in dry-run mode first (recommended)
bun run reclaim --dry-run

# Execute reclaim transactions
bun run reclaim
```

#### 4. View Statistics

See how much SOL you've recovered and how many accounts are pending.

```bash
bun run stats
```

---

## Technical Architecture

- **Runtime**: Built on **Bun** for high-performance TS execution.
- **Framework**: Uses **Gill** (Solana Client) for RPC interactions and **Drizzle ORM** + **Better-SQLite3** for efficient local state management.
- **Data Persistence**: All scanned accounts are stored in a local SQLite database (`kora.db`), allowing you to stop/resume scans without losing progress.

### Safety First 🛡️

- **Owner Checks**: Verifies that the Kora Operator actually has the authority (closing authority) to close the account before attempting.
- **Token Checks**: Explicitly checks `spl-token` and `spl-token-2022` program ownership.
- **Non-Zero Balances**: Will NEVER attempt to close an account with a positive token balance.

---

## License

Open Source. MIT License.
