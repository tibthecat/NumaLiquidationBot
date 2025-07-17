# 🧨 Numa Liquidation Bot for Sonic Protocol

This is a custom liquidation bot for Numa on the Sonic Protocol. It scans borrower accounts on the LST market, computes their LTV and risk status, and triggers liquidations through a vault if conditions are met.

---

## ⚙️ Features

- Scans `Borrow` events from the LST cToken market.
- Computes borrower LTV, collateral, shortfall, and other risk metrics.
- Supports listing mode to analyze all borrowers and output a report.
- Automatically executes liquidation transactions based on specific thresholds:
  - **Standard** liquidation
  - **Partial** liquidation for LTV > 110%
  - **Fixed amount** liquidation over 300k STS
  - **(TODO)** Bad debt liquidation

---

## 📦 Setup

1. **Clone the repo** (if needed):
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file**:
   ```bash
   touch .env
   ```

   Fill it with your RPC and private key:
   ```env
   RPC_URL_SONIC=https://your-sonic-rpc-url
   PRIVATE_KEY=your_private_key
   ```

---

## 🚀 Usage

### 1. **List Mode** (no liquidations)
Scans all borrowers and outputs a JSON report of those eligible for liquidation:
```bash
node bot.js --list
```
The result is saved to `borrowersData.json`.

---

### 2. **Live Bot Mode** (performs liquidations)
Runs continuously and executes liquidation transactions when conditions are met:
```bash
node bot.js
```

The bot scans every 5 seconds and checks for:

- Liquidity shortfall
- Sufficient vault funds
- LTV thresholds
- Collateral vs. debt ratios

---

## 📁 Project Structure

| File / Dir           | Description                            |
|----------------------|----------------------------------------|
| `bot.js`             | Main liquidation bot script            |
| `.env`               | RPC URL and private key config         |
| `borrowersData.json` | Generated report from list mode        |

---

## 📌 Contract Addresses

| Contract         | Address                                      |
|------------------|----------------------------------------------|
| Comptroller      | `0x30047cca309b7aac3613ae5b990cf460253c9b98` |
| cNUMA            | `0x16d4b53de6aba4b68480c7a3b6711df25fcb12d7` |
| cLST             | `0xb2a43445b97cd6a179033788d763b8d0c0487e36` |
| Vault            | `0xde76288c3b977776400fe44fe851bbe2313f1806` |
| Oracle           | `0xa92025d87128c1e2dcc0a08afbc945547ca3b084` |
| STS              | `0xe5da20f15420ad15de0fa650600afc998bbe3955` |

---

## 🔐 Security & Notes

- This script **uses a private key** to send transactions. Keep your `.env` file **secret** and **never commit it**.
- Transactions are sent using `ethers.js` via a connected wallet.
- Make sure the wallet has enough ETH to pay gas fees.

---

## 🧭 TODO

- Implement bad debt liquidation (Type 4).
- Add flashloan fallback or liquidity provisioning.
- Add error handling and notifications (e.g., Discord/Telegram alert on failed tx).

---

## 📄 License

MIT