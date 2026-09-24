import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  formatUnits,
  parseEther
} from "ethers";
import {
  CHAIN,
  CONTRACT_ADDRESS,
  CONTRACT_ADDRESS_ERROR,
  VAULT_ABI
} from "../config/contract";
import { describeError } from "../utils/web3-errors";
import type { Eip1193Provider } from "../types/ethereum";

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TxState {
  hash: string;
  status: "pending" | "confirmed";
  block?: number;
}

interface UseVaultOptions {
  injected: Eip1193Provider | null;
  account: string | null;
  chainId: number | null;
}

export interface VaultState {
  token: TokenInfo | null;
  deposited: string | null;
  tokenBalance: string | null;
  nativeBalance: string | null;
  reading: boolean;
  readError: string | null;
  busy: "deposit" | "withdraw" | null;
  tx: TxState | null;
  txError: string | null;
  refresh: () => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  withdraw: () => Promise<void>;
}

const useVault = ({ injected, account, chainId }: UseVaultOptions): VaultState => {
  const readProvider = useMemo(
    () => new JsonRpcProvider(CHAIN.rpc, CHAIN.id, { staticNetwork: true }),
    []
  );
  const readContract = useMemo(() => {
    if (CONTRACT_ADDRESS_ERROR) return null;
    return new Contract(CONTRACT_ADDRESS, VAULT_ABI, readProvider);
  }, [readProvider]);

  const [token, setToken] = useState<TokenInfo | null>(null);
  const [deposited, setDeposited] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(CONTRACT_ADDRESS_ERROR);
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);
  const [tx, setTx] = useState<TxState | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    const loadToken = async () => {
      if (!readContract) return;
      try {
        const [name, symbol, decimals] = await Promise.all([
          readContract.name(),
          readContract.symbol(),
          readContract.decimals()
        ]);
        if (alive) setToken({ name, symbol, decimals: Number(decimals) });
      } catch (error) {
        if (alive) setReadError(describeError(error));
      }
    };
    loadToken();
    return () => {
      alive = false;
    };
  }, [readContract]);

  const refresh = useCallback(async () => {
    if (!readContract || !account) {
      setDeposited(null);
      setTokenBalance(null);
      setNativeBalance(null);
      return;
    }
    seq.current += 1;
    const ticket = seq.current;
    setReading(true);
    setReadError(null);
    try {
      const [vault, held, native] = await Promise.all([
        readContract.getBalance({ from: account }),
        readContract.balanceOf(account),
        readProvider.getBalance(account)
      ]);
      if (ticket !== seq.current) return;
      setDeposited(formatEther(vault));
      setTokenBalance(formatUnits(held, token ? token.decimals : 18));
      setNativeBalance(formatEther(native));
    } catch (error) {
      if (ticket === seq.current) setReadError(describeError(error));
    } finally {
      if (ticket === seq.current) setReading(false);
    }
  }, [account, readContract, readProvider, token]);

  useEffect(() => {
    refresh();
  }, [refresh, chainId]);

  const getWriteContract = useCallback(async () => {
    if (CONTRACT_ADDRESS_ERROR) throw new Error(CONTRACT_ADDRESS_ERROR);
    if (!injected) throw new Error("No EVM wallet detected in this browser.");
    const browserProvider = new BrowserProvider(injected as any, "any");
    const signer = await browserProvider.getSigner();
    return new Contract(CONTRACT_ADDRESS, VAULT_ABI, signer);
  }, [injected]);

  const send = useCallback(
    async (kind: "deposit" | "withdraw", run: (contract: Contract) => Promise<any>) => {
      setBusy(kind);
      setTxError(null);
      setTx(null);
      try {
        const contract = await getWriteContract();
        const sent = await run(contract);
        setTx({ hash: sent.hash, status: "pending" });
        const receipt = await sent.wait(1);
        setTx({ hash: sent.hash, status: "confirmed", block: receipt.blockNumber });
        await refresh();
      } catch (error) {
        setTxError(describeError(error));
        setTx(null);
      } finally {
        setBusy(null);
      }
    },
    [getWriteContract, refresh]
  );

  const deposit = useCallback(
    (amount: string) =>
      send("deposit", (contract) => contract.deposit({ value: parseEther(amount) })),
    [send]
  );

  const withdraw = useCallback(() => send("withdraw", (contract) => contract.withdraw()), [send]);

  return {
    token,
    deposited,
    tokenBalance,
    nativeBalance,
    reading,
    readError,
    busy,
    tx,
    txError,
    refresh,
    deposit,
    withdraw
  };
};

export default useVault;
