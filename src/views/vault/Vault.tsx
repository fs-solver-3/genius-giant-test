import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import useWallet from "../../hooks/useWallet";
import useVault from "../../hooks/useVault";
import {
  CHAIN,
  CONTRACT_ADDRESS,
  addressUrl,
  chainName,
  shortenAddress,
  trimAmount,
  txUrl
} from "../../config/contract";

const cardSx = {
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid #e3e8ef",
  boxShadow: "none",
  marginBottom: "16px"
};

const labelSx = {
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  color: "text.secondary",
  marginBottom: "14px"
};

interface RowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

const Row = ({ label, value }: RowProps) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    spacing={2}
    sx={{ paddingY: "10px" }}
  >
    <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>{label}</Typography>
    <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>{value}</Typography>
  </Stack>
);

const Vault = () => {
  const wallet = useWallet();
  const vault = useVault({
    injected: wallet.injected,
    account: wallet.account,
    chainId: wallet.chainId
  });

  const [amount, setAmount] = useState("0.01");

  const symbol = vault.token ? vault.token.symbol : "GG";
  const parsedAmount = Number(amount);
  const amountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const noDeposit = vault.deposited !== null && Number(vault.deposited) === 0;
  const locked = !wallet.connected || wallet.wrongNetwork || Boolean(vault.busy);

  const onDeposit = () => {
    if (!amountValid) return;
    vault.deposit(amount.trim());
  };

  return (
    <Box sx={{ padding: "48px 20px 60px", maxWidth: "680px", margin: "0 auto", textAlign: "left" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ marginBottom: "28px" }}>
        <Box
          sx={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            background: "#f0b90b",
            color: "#1a1400",
            fontWeight: 800,
            fontSize: "17px",
            display: "grid",
            placeItems: "center"
          }}
        >
          GG
        </Box>
        <Box>
          <Typography sx={{ fontSize: "18px", fontWeight: 700 }}>Genius Giant Vault</Typography>
          <Typography sx={{ fontSize: "13px", color: "text.secondary" }}>
            Deposit and withdraw {CHAIN.currency} on {CHAIN.name}
          </Typography>
        </Box>
      </Stack>

      {wallet.error && (
        <Alert severity="error" sx={{ marginBottom: "14px" }}>
          {wallet.error}
        </Alert>
      )}
      {vault.txError && (
        <Alert severity="error" sx={{ marginBottom: "14px" }}>
          {vault.txError}
        </Alert>
      )}
      {vault.readError && (
        <Alert severity="error" sx={{ marginBottom: "14px" }}>
          {vault.readError}
        </Alert>
      )}
      {vault.tx && vault.tx.status === "pending" && (
        <Alert
          severity="info"
          icon={<CircularProgress size={16} />}
          sx={{ marginBottom: "14px" }}
        >
          Transaction submitted, waiting for confirmation —{" "}
          <Link href={txUrl(vault.tx.hash)} target="_blank" rel="noreferrer">
            view on BscScan
          </Link>
        </Alert>
      )}
      {vault.tx && vault.tx.status === "confirmed" && (
        <Alert severity="success" sx={{ marginBottom: "14px" }}>
          Confirmed in block {vault.tx.block} —{" "}
          <Link href={txUrl(vault.tx.hash)} target="_blank" rel="noreferrer">
            view on BscScan
          </Link>
        </Alert>
      )}

      <Paper sx={cardSx}>
        <Typography sx={labelSx}>Wallet</Typography>

        {!wallet.hasWallet && (
          <Alert severity="error">
            No EVM wallet detected.{" "}
            <Link href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              Install MetaMask
            </Link>
            , then reload this page.
          </Alert>
        )}

        {wallet.hasWallet && !wallet.connected && (
          <Box>
            <Typography
              sx={{ color: "text.secondary", textAlign: "center", padding: "22px 0" }}
            >
              Connect a wallet to read your balance and transact.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={wallet.connect}
              disabled={wallet.connecting}
              startIcon={wallet.connecting ? <CircularProgress size={16} /> : undefined}
            >
              {wallet.connecting ? "Awaiting wallet…" : "Connect Wallet"}
            </Button>
          </Box>
        )}

        {wallet.connected && (
          <Box>
            <Row label="Address" value={shortenAddress(wallet.account)} />
            <Divider />
            <Row
              label="Network"
              value={
                <Chip
                  size="small"
                  label={chainName(wallet.chainId)}
                  color={wallet.wrongNetwork ? "error" : "success"}
                  variant="outlined"
                />
              }
            />
            <Stack direction="row" spacing={1.5} sx={{ marginTop: "16px" }}>
              {wallet.wrongNetwork && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={wallet.switchNetwork}
                  disabled={wallet.switching}
                  startIcon={wallet.switching ? <CircularProgress size={16} /> : undefined}
                >
                  {wallet.switching ? "Switching…" : "Switch to " + CHAIN.name}
                </Button>
              )}
              <Button fullWidth variant="outlined" color="error" onClick={wallet.disconnect}>
                Disconnect
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper sx={cardSx}>
        <Typography sx={labelSx}>Balances</Typography>
        {!wallet.connected ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", padding: "22px 0" }}>
            Not connected.
          </Typography>
        ) : (
          <Box>
            <Typography sx={{ fontSize: "14px", color: "text.secondary" }}>
              Deposited in vault · getBalance()
            </Typography>
            <Typography sx={{ fontSize: "28px", fontWeight: 700, marginBottom: "14px" }}>
              {vault.reading && vault.deposited === null ? "…" : trimAmount(vault.deposited)}
              <Typography
                component="span"
                sx={{ fontSize: "13px", color: "text.secondary", marginLeft: "6px" }}
              >
                {CHAIN.currency}
              </Typography>
            </Typography>
            <Divider />
            <Row
              label={symbol + " token balance"}
              value={trimAmount(vault.tokenBalance, 4) + " " + symbol}
            />
            <Divider />
            <Row
              label={"Wallet " + CHAIN.currency}
              value={trimAmount(vault.nativeBalance, 4) + " " + CHAIN.currency}
            />
            <Button
              fullWidth
              variant="outlined"
              onClick={vault.refresh}
              disabled={vault.reading}
              startIcon={vault.reading ? <CircularProgress size={16} /> : undefined}
              sx={{ marginTop: "16px" }}
            >
              {vault.reading ? "Reading…" : "Refresh"}
            </Button>
          </Box>
        )}
      </Paper>

      <Paper sx={cardSx}>
        <Typography sx={labelSx}>Actions</Typography>

        {wallet.wrongNetwork && (
          <Alert severity="warning" sx={{ marginBottom: "14px" }}>
            Switch to {CHAIN.name} before transacting.
          </Alert>
        )}

        <TextField
          fullWidth
          size="small"
          type="number"
          label={"Amount to deposit (" + CHAIN.currency + ")"}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={locked}
          inputProps={{ min: 0, step: 0.001 }}
          error={!amountValid && amount.trim() !== ""}
          helperText={
            !amountValid && amount.trim() !== "" ? "Enter an amount greater than zero." : " "
          }
        />

        <Stack direction="row" spacing={1.5} sx={{ marginTop: "6px" }}>
          <Button
            fullWidth
            variant="contained"
            onClick={onDeposit}
            disabled={locked || !amountValid}
            startIcon={vault.busy === "deposit" ? <CircularProgress size={16} /> : undefined}
          >
            {vault.busy === "deposit" ? "Depositing…" : "Deposit"}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={vault.withdraw}
            disabled={locked || noDeposit}
            startIcon={vault.busy === "withdraw" ? <CircularProgress size={16} /> : undefined}
          >
            {vault.busy === "withdraw" ? "Withdrawing…" : "Withdraw all"}
          </Button>
        </Stack>

        {noDeposit && !vault.busy && (
          <Typography sx={{ fontSize: "13px", color: "text.secondary", marginTop: "10px" }}>
            Nothing deposited yet — withdraw stays disabled until you deposit.
          </Typography>
        )}
      </Paper>

      {CONTRACT_ADDRESS && (
        <Box sx={{ textAlign: "center", marginTop: "26px" }}>
          <Typography sx={{ fontFamily: "monospace", fontSize: "13px", color: "text.secondary" }}>
            {CONTRACT_ADDRESS}
          </Typography>
          <Link
            href={addressUrl(CONTRACT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            sx={{ fontSize: "13px" }}
          >
            View contract on BscScan
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default Vault;
