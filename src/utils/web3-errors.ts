import { CHAIN, REVERT_TEXT } from "../config/contract";

const readCode = (error: any): unknown => {
  if (!error) return undefined;
  if (error.code !== undefined) return error.code;
  return error.info && error.info.error && error.info.error.code;
};

export const describeError = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "string") return error;

  const err = error as any;
  const code = readCode(err);
  const raw: string = err.shortMessage || err.message || "Unexpected error.";

  if (code === 4001 || code === "ACTION_REJECTED") {
    return "Request rejected in your wallet.";
  }
  if (code === -32002) {
    return "A wallet request is already pending. Open your wallet to finish it.";
  }
  if (code === 4900 || code === 4901) {
    return "Your wallet is not connected to a network.";
  }

  const revertName = err.revert && err.revert.name;
  if (revertName) {
    return REVERT_TEXT[revertName] || "Contract reverted with " + revertName + "().";
  }

  if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(raw)) {
    return "Not enough " + CHAIN.currency + " to cover the amount plus gas.";
  }
  if (code === "CALL_EXCEPTION") {
    return "The contract rejected this call.";
  }
  if (code === "NETWORK_ERROR" || /failed to fetch|could not detect/i.test(raw)) {
    return "Network error reaching the RPC endpoint. Check your connection.";
  }
  return raw;
};
