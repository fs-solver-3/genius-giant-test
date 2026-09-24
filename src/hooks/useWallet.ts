import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress } from "ethers";
import { CHAIN } from "../config/contract";
import { describeError } from "../utils/web3-errors";
import type { Eip1193Provider } from "../types/ethereum";

const findInjected = (): Eip1193Provider | null => {
  const injected = window.ethereum;
  if (!injected) return null;
  if (Array.isArray(injected.providers) && injected.providers.length) {
    return injected.providers.find((item) => item.isMetaMask) || injected.providers[0];
  }
  return injected;
};

export interface WalletState {
  injected: Eip1193Provider | null;
  hasWallet: boolean;
  account: string | null;
  chainId: number | null;
  connected: boolean;
  wrongNetwork: boolean;
  connecting: boolean;
  switching: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const useWallet = (): WalletState => {
  const injected = useMemo(findInjected, []);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!injected) return undefined;
    let alive = true;

    const readState = async () => {
      try {
        const [accounts, hex] = await Promise.all([
          injected.request({ method: "eth_accounts" }),
          injected.request({ method: "eth_chainId" })
        ]);
        if (!alive) return;
        setAccount(accounts && accounts.length ? getAddress(accounts[0]) : null);
        setChainId(Number(hex));
      } catch (readError) {
        if (alive) setChainId(null);
      }
    };
    readState();

    const onAccountsChanged = (accounts: string[]) => {
      setAccount(accounts && accounts.length ? getAddress(accounts[0]) : null);
      setError(null);
    };
    const onChainChanged = (hex: string) => setChainId(Number(hex));

    injected.on("accountsChanged", onAccountsChanged);
    injected.on("chainChanged", onChainChanged);

    return () => {
      alive = false;
      injected.removeListener("accountsChanged", onAccountsChanged);
      injected.removeListener("chainChanged", onChainChanged);
    };
  }, [injected]);

  const connect = useCallback(async () => {
    setError(null);
    if (!injected) {
      setError("No EVM wallet detected in this browser.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = await injected.request({ method: "eth_requestAccounts" });
      if (!accounts || !accounts.length) {
        throw new Error("Wallet returned no accounts.");
      }
      setAccount(getAddress(accounts[0]));
      const hex = await injected.request({ method: "eth_chainId" });
      setChainId(Number(hex));
    } catch (connectError) {
      setError(describeError(connectError));
    } finally {
      setConnecting(false);
    }
  }, [injected]);

  const disconnect = useCallback(async () => {
    setError(null);
    if (injected) {
      try {
        await injected.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }]
        });
      } catch (revokeError) {
        setAccount(null);
      }
    }
    setAccount(null);
  }, [injected]);

  const switchNetwork = useCallback(async () => {
    if (!injected) return;
    setError(null);
    setSwitching(true);
    try {
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN.hex }]
      });
    } catch (switchError) {
      const code = (switchError as any)?.code;
      if (code === 4902 || code === -32603) {
        try {
          await injected.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CHAIN.hex,
                chainName: CHAIN.name,
                nativeCurrency: {
                  name: CHAIN.currency,
                  symbol: CHAIN.currency,
                  decimals: 18
                },
                rpcUrls: [CHAIN.rpc],
                blockExplorerUrls: [CHAIN.explorer]
              }
            ]
          });
        } catch (addError) {
          setError(describeError(addError));
        }
      } else {
        setError(describeError(switchError));
      }
    } finally {
      setSwitching(false);
    }
  }, [injected]);

  return {
    injected,
    hasWallet: Boolean(injected),
    account,
    chainId,
    connected: Boolean(account),
    wrongNetwork: Boolean(account) && chainId !== null && chainId !== CHAIN.id,
    connecting,
    switching,
    error,
    connect,
    disconnect,
    switchNetwork
  };
};

export default useWallet;
