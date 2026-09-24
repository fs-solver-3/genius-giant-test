import { isAddress } from "ethers";

export const CHAIN = {
  id: 97,
  hex: "0x61",
  name: "BNB Smart Chain Testnet",
  currency: "tBNB",
  rpc: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  explorer: "https://testnet.bscscan.com"
};

const ENV_CONTRACT_ADDRESS = (process.env.REACT_APP_CONTRACT_ADDRESS || "").trim();

export const CONTRACT_ADDRESS = ENV_CONTRACT_ADDRESS;

export const CONTRACT_ADDRESS_ERROR: string | null = !ENV_CONTRACT_ADDRESS
  ? "REACT_APP_CONTRACT_ADDRESS is not set. Copy .env.example to .env and restart the dev server."
  : !isAddress(ENV_CONTRACT_ADDRESS)
  ? "REACT_APP_CONTRACT_ADDRESS is not a valid address: " + ENV_CONTRACT_ADDRESS
  : null;

export const VAULT_ABI = [
  "function getBalance() view returns (uint256)",
  "function deposit() payable",
  "function withdraw()",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "error DepositIsZero()",
  "error NothingToWithdraw()"
];

export const REVERT_TEXT: Record<string, string> = {
  DepositIsZero: "Deposit must be greater than zero.",
  NothingToWithdraw: "You have no deposited balance to withdraw."
};

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  10: "OP Mainnet",
  56: "BNB Smart Chain",
  97: "BNB Smart Chain Testnet",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  43114: "Avalanche C-Chain",
  11155111: "Sepolia",
  80002: "Polygon Amoy"
};

export const chainName = (id: number | null): string => {
  if (id === null) return "Unknown network";
  return CHAIN_NAMES[id] || "Unknown network (" + id + ")";
};

export const shortenAddress = (address: string | null): string => {
  if (!address) return "";
  return address.slice(0, 6) + "…" + address.slice(-4);
};

export const txUrl = (hash: string): string => CHAIN.explorer + "/tx/" + hash;

export const addressUrl = (address: string): string =>
  CHAIN.explorer + "/address/" + address;

export const trimAmount = (value: string | null, places = 6): string => {
  if (value === null || value === undefined) return "—";
  const parts = String(value).split(".");
  const fraction = (parts[1] || "").slice(0, places).replace(/0+$/, "");
  return fraction ? parts[0] + "." + fraction : parts[0];
};
