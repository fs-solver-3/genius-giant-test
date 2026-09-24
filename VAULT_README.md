# GG Vault — Wallet Connection & Contract Interaction

A self-contained page that connects an EVM wallet and reads from / writes to the
**Genius Giant Token** contract on BNB Smart Chain Testnet.

Route: **`/vault`** → http://localhost:3000/vault

---

## Quick start

```bash
cp .env.example .env
npm install
npm run client
```

Then open http://localhost:3000/vault

> Use **`npm run client`**, not `npm start`. `client` runs only the React dev server,
> which is all this page needs. `start` additionally boots the Express API in `server.js`.

`.env` is listed in `.gitignore`, so it is not committed — copy it from `.env.example`
on a fresh clone. CRA only reads `.env` at startup, so **restart the dev server** after
changing it.

---

## Environment

| Variable | Purpose |
| --- | --- |
| `REACT_APP_CONTRACT_ADDRESS` | Address of the GG contract. Required. |

There is intentionally **no hardcoded fallback address**. If the variable is missing or
malformed, the page renders a specific message saying so rather than silently pointing at
some other contract. The value is validated with `isAddress()` from ethers before use.

---

## Files added

| File | Lines | Responsibility |
| --- | --- | --- |
| `src/views/vault/Vault.tsx` | 328 | The page. MUI layout, all UI states, user input. |
| `src/hooks/useVault.ts` | 180 | Contract reads and writes, transaction lifecycle. |
| `src/hooks/useWallet.ts` | 167 | Connect, disconnect, network, wallet events. |
| `src/config/contract.ts` | 72 | Chain config, address from env, ABI, formatters. |
| `src/utils/web3-errors.ts` | 42 | Maps wallet/contract errors to readable text. |
| `src/types/ethereum.d.ts` | 13 | Types for the injected `window.ethereum` provider. |
| `.env.example` | 1 | Template for the required env variable. |

## Files modified

| File | Change |
| --- | --- |
| `src/routes/Router.tsx` | Added the lazy import and one top-level route (5 lines). |
| `package.json` | Added `ethers ^6.13.4`. Remaining diff is npm re-sorting existing deps alphabetically. |

The page is registered as a **top-level route, not a child of `Layout`**, so it renders no
shared Header, Footer, or Notifications and shares no state with the existing pages.
Nothing in Dashboard / Sell / Login was modified.

---

## Contract interface

Verified directly against BSC Testnet via `eth_call` rather than assumed:

```solidity
function getBalance() view returns (uint256)
function deposit() payable
function withdraw()

error DepositIsZero()
error NothingToWithdraw()
```

Plus the standard ERC-20 surface (`name`, `symbol`, `decimals`, `balanceOf`, `totalSupply`).

Token: **Genius Giant Token (GG)**, 18 decimals, 1,000,000 total supply.

### Two balances, deliberately shown separately

`getBalance()` is **not** the GG token balance. For the same address, `balanceOf()` returned
1,000,000 GG while `getBalance()` returned 0 — they are independent ledgers:

| Displayed as | Source | Meaning |
| --- | --- | --- |
| Deposited in vault | `getBalance()` | tBNB credited to the caller by `deposit()` |
| GG token balance | `balanceOf(account)` | ERC-20 token holding |
| Wallet tBNB | `provider.getBalance()` | Native gas balance |

### Deposits are in tBNB, not GG

`deposit()` takes **no arguments and is `payable`** — it reverts `DepositIsZero()` at zero
value and succeeds with tBNB attached. The contract exposes no function that accepts a GG
amount; `deposit(uint256)`, `depositToken(uint256)`, `stake(uint256)`, `withdrawToken(uint256)`,
`unstake(uint256)`, `token()` and `asset()` were each probed and all revert with empty data,
meaning no such selector exists. The UI therefore labels the deposit in tBNB, which is what
the transaction actually sends.

---

## How it works

### Read vs write are deliberately separate

Reads go through a plain `JsonRpcProvider` pointed at the public RPC, so balances render
even when the wallet sits on the wrong network. Writes go through
`BrowserProvider → getSigner()`, because only those require a signature.

```
read   JsonRpcProvider  → Contract(ABI, provider) → getBalance() / balanceOf()
write  BrowserProvider  → getSigner()             → deposit() / withdraw()
```

### Async / transaction flow

1. Validate input, block the action if the wallet is on the wrong chain.
2. Send the transaction; store its hash and show a pending state with a BscScan link.
3. `await tx.wait(1)` for one confirmation.
4. Show the confirmed block number, then re-read balances.

Buttons are disabled for the whole in-flight window. A `seq` ref discards stale read
responses so a slow earlier request cannot overwrite a newer one.

### Wallet state

`eth_accounts` restores an existing connection on load without prompting; `eth_requestAccounts`
is only called on an explicit click. Live `accountsChanged` and `chainChanged` listeners keep
the UI in sync when the user switches account or network in MetaMask, and are removed on unmount.

---

## Error handling

| Case | Handling |
| --- | --- |
| No wallet installed | Message with an Install MetaMask link; actions disabled |
| Connection rejected | `4001` / `ACTION_REJECTED` → "Request rejected in your wallet." |
| Request already open | `-32002` → prompt to finish the pending wallet request |
| Wrong network | Warning + switch button; `wallet_switchEthereumChain`, falling back to `wallet_addEthereumChain` on `4902` |
| `DepositIsZero()` | Decoded to "Deposit must be greater than zero." |
| `NothingToWithdraw()` | Decoded, and pre-empted by disabling Withdraw at zero balance |
| Insufficient funds | Explains the amount plus gas exceeds the balance |
| RPC unreachable | Network error message |
| Missing / invalid env address | Config error naming the variable to set |

Both custom errors are declared in the ABI, so ethers decodes them into named reverts
instead of a generic "execution reverted".

---

## Notes

- Amounts are converted with `parseEther` / `formatEther` / `formatUnits`; no float maths
  is used on token values.
- The page is disconnect-aware: clearing the account resets balances and re-renders the
  connect prompt. `wallet_revokePermissions` is attempted first so MetaMask genuinely
  drops the authorisation where supported.
