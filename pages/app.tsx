/**
 * InferStake — /pages/app  (or pages/StakingApp.tsx)
 *
 * Stack:  Next.js · ethers v6 · MetaMask / window.ethereum
 * Chain:  Ritual Chain  (ID 1979)
 * RPC:    https://rpc.ritualfoundation.org
 * Contract: 0x6e4463b62a2e332b007573dbe7f0Bf3B784B4838
 *
 * Install deps:
 *   npm install ethers
 *
 * Fonts (add to _document.tsx or layout.tsx):
 *   Playfair Display, DM Mono, DM Sans  (Google Fonts)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";

// ── Chain config ─────────────────────────────────────────────
const RITUAL_CHAIN_ID   = 1979;
const RITUAL_RPC        = "https://rpc.ritualfoundation.org";
const EXPLORER          = "https://explorer.ritualfoundation.org";
const CONTRACT_ADDRESS  = "0x6e4463b62a2e332b007573dbe7f0Bf3B784B4838";

const RITUAL_NETWORK = {
  chainId:  "0x7BB",   // 1979 in hex
  chainName: "Ritual Chain",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: [RITUAL_RPC],
  blockExplorerUrls: [EXPLORER],
};

// ── Contract ABI (only what the UI needs) ────────────────────
const ABI = [
  // Read
  "function getProtocolStats() view returns (uint256 totalStaked, uint256 totalStakers, uint256 totalAiQueries, uint256 apyBasisPoints)",
  "function getUserDashboard(address user) view returns (uint256 stakedAmount, uint256 totalRewards, uint256 apyBps, uint256 timeStakedSeconds, uint256 lastAiRequestId)",
  "function getStakedBalance(address user) view returns (uint256)",
  "function getRewards(address user) view returns (uint256)",
  "function contractBalance() view returns (uint256)",
  // Write — native token, stake() is payable with no args
  "function stake() external payable",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function requestAIAdvisory() external returns (uint256 requestId)",
  // Events
  "event Staked(address indexed user, uint256 amount, uint256 timestamp)",
  "event Unstaked(address indexed user, uint256 amount, uint256 timestamp)",
  "event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp)",
  "event AIAdvisoryRequested(address indexed user, uint256 requestId)",
];

// Native token staking — no ERC-20 approve needed

// ── Helpers ──────────────────────────────────────────────────
const fmt = (val: bigint | number, decimals = 4): string => {
  const n = typeof val === "bigint" ? Number(ethers.formatEther(val)) : val;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(decimals);
};

const fmtDuration = (seconds: number): string => {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const shortAddr = (addr: string) =>
  `${addr.slice(0, 6)}…${addr.slice(-4)}`;

type TxStatus = "idle" | "pending" | "success" | "error";

interface DashData {
  stakedAmount:     bigint;
  totalRewards:     bigint;
  apyBps:           bigint;
  timeStakedSecs:   number;
  lastAiRequestId:  bigint;
}

interface ProtoStats {
  totalStaked:   bigint;
  totalStakers:  bigint;
  aiQueries:     bigint;
  apy:           number;   // %
}

interface AIMessage {
  role: "user" | "ai";
  text: string;
  ts:   number;
}

// ─────────────────────────────────────────────────────────────
export default function StakingApp() {
  const [mounted, setMounted] = useState(false);

  // Wallet
  const [address,   setAddress]   = useState<string | null>(null);
  const [chainOk,   setChainOk]   = useState(false);
  const [ritBal,    setRitBal]    = useState<bigint>(0n);
  const [provider,  setProvider]  = useState<ethers.BrowserProvider | null>(null);
  const [signer,    setSigner]    = useState<ethers.JsonRpcSigner  | null>(null);

  // Protocol data
  const [proto,   setProto]   = useState<ProtoStats | null>(null);
  const [dash,    setDash]    = useState<DashData | null>(null);
  const [nativeBal, setNativeBal] = useState<bigint>(0n); // wallet native RITUAL balance

  // Inputs
  const [stakeInput,   setStakeInput]   = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");

  // TX states
  const [stakeTx,    setStakeTx]    = useState<TxStatus>("idle");
  const [unstakeTx,  setUnstakeTx]  = useState<TxStatus>("idle");
  const [claimTx,    setClaimTx]    = useState<TxStatus>("idle");
  const [txHash,     setTxHash]     = useState<string | null>(null);

  // AI
  const [aiMessages,  setAiMessages]  = useState<AIMessage[]>([]);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiRequestId, setAiRequestId] = useState<string | null>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // Active tab
  const [tab, setTab] = useState<"stake" | "unstake">("stake");

  // ── Mount guard (prevents SSR/window errors) ────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Read-only provider (no wallet) ─────────────────────────
  const readProvider = useCallback(() =>
    new ethers.JsonRpcProvider(RITUAL_RPC), []);

  const readContract = useCallback(() =>
    new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider()), [readProvider]);

  // ── Load protocol stats (no wallet needed) ─────────────────
  const loadProtoStats = useCallback(async () => {
    try {
      const c = readContract();
      const [ts, stakers, queries, apyBps] = await c.getProtocolStats();
      setProto({
        totalStaked:  ts,
        totalStakers: stakers,
        aiQueries:    queries,
        apy:          Number(apyBps) / 100,
      });
    } catch (e) { console.warn("loadProtoStats:", e); }
  }, [readContract]);

  // ── Load user dashboard ─────────────────────────────────────
  const loadDash = useCallback(async (addr: string) => {
    try {
      const c = readContract();
      const [staked, rewards, apyBps, timeSecs, aiReqId] =
        await c.getUserDashboard(addr);
      setDash({
        stakedAmount:    staked,
        totalRewards:    rewards,
        apyBps:          apyBps,
        timeStakedSecs:  Number(timeSecs),
        lastAiRequestId: aiReqId,
      });
    } catch (e) { console.warn("loadDash:", e); }
  }, [readContract]);

  // ── Load native RITUAL wallet balance ──────────────────────
  const loadNativeBal = useCallback(async (addr: string) => {
    try {
      const bal = await readProvider().getBalance(addr);
      setNativeBal(bal);
    } catch (e) { console.warn("loadNativeBal:", e); }
  }, [readProvider]);

  // ── Refresh all user data ───────────────────────────────────
  const refresh = useCallback(async (addr: string) => {
    await Promise.all([loadDash(addr), loadNativeBal(addr), loadProtoStats()]);
  }, [loadDash, loadNativeBal, loadProtoStats]);

  // ── Connect wallet ──────────────────────────────────────────
  const connect = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install it first.");
      return;
    }
    try {
      const prov  = new ethers.BrowserProvider(window.ethereum);
      const sign  = await prov.getSigner();
      const addr  = await sign.getAddress();
      const net   = await prov.getNetwork();
      const ok    = Number(net.chainId) === RITUAL_CHAIN_ID;

      setProvider(prov);
      setSigner(sign);
      setAddress(addr);
      setChainOk(ok);

      if (!ok) await switchChain();
      else     await refresh(addr);
    } catch (e: any) {
      console.error("connect:", e);
    }
  };

  // ── Switch to Ritual Chain ──────────────────────────────────
  const switchChain = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: RITUAL_NETWORK.chainId }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [RITUAL_NETWORK],
        });
      }
    }
    // Re-check
    if (address) {
      const net = await provider!.getNetwork();
      setChainOk(Number(net.chainId) === RITUAL_CHAIN_ID);
      await refresh(address);
    }
  };

  // ── Disconnect ──────────────────────────────────────────────
  const disconnect = () => {
    setAddress(null); setSigner(null); setProvider(null);
    setDash(null); setRitBal(0n); setChainOk(false);
    setAiMessages([]);
  };

  // ── Listen for chain/account changes ───────────────────────
  useEffect(() => {
    if (!window.ethereum) return;
    const onAcct  = (accts: string[]) => { if (!accts.length) disconnect(); else setAddress(accts[0]); };
    const onChain = (id: string)      => setChainOk(parseInt(id, 16) === RITUAL_CHAIN_ID);
    window.ethereum.on("accountsChanged", onAcct);
    window.ethereum.on("chainChanged",    onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAcct);
      window.ethereum.removeListener("chainChanged",    onChain);
    };
  }, []);

  // ── Poll protocol stats every 30s ──────────────────────────
  useEffect(() => {
    loadProtoStats();
    const id = setInterval(loadProtoStats, 30_000);
    return () => clearInterval(id);
  }, [loadProtoStats]);

  // ── Poll user data every 15s when connected ─────────────────
  useEffect(() => {
    if (!address) return;
    refresh(address);
    const id = setInterval(() => refresh(address), 15_000);
    return () => clearInterval(id);
  }, [address, refresh]);

  // Native token — no approve() needed

  // ── STAKE (native RITUAL — payable, no approve) ────────────
  const handleStake = async () => {
    if (!signer || !stakeInput) return;
    const amountWei = ethers.parseEther(stakeInput);
    setStakeTx("pending"); setTxHash(null);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      // stake() is payable — pass value as overrides
      const tx = await contract.stake({ value: amountWei });
      setTxHash(tx.hash);
      await tx.wait();
      setStakeTx("success");
      setStakeInput("");
      await refresh(address!);
      setTimeout(() => setStakeTx("idle"), 4000);
    } catch (e: any) {
      console.error("stake:", e);
      setStakeTx("error");
      setTimeout(() => setStakeTx("idle"), 4000);
    }
  };

  // ── UNSTAKE ─────────────────────────────────────────────────
  const handleUnstake = async () => {
    if (!signer || !unstakeInput) return;
    const amountWei = ethers.parseEther(unstakeInput);
    setUnstakeTx("pending"); setTxHash(null);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.unstake(amountWei);
      setTxHash(tx.hash);
      await tx.wait();
      setUnstakeTx("success");
      setUnstakeInput("");
      await refresh(address!);
      setTimeout(() => setUnstakeTx("idle"), 4000);
    } catch (e: any) {
      console.error("unstake:", e);
      setUnstakeTx("error");
      setTimeout(() => setUnstakeTx("idle"), 4000);
    }
  };

  // ── CLAIM REWARDS ───────────────────────────────────────────
  const handleClaim = async () => {
    if (!signer) return;
    setClaimTx("pending"); setTxHash(null);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.claimRewards();
      setTxHash(tx.hash);
      await tx.wait();
      setClaimTx("success");
      await refresh(address!);
      setTimeout(() => setClaimTx("idle"), 4000);
    } catch (e: any) {
      console.error("claim:", e);
      setClaimTx("error");
      setTimeout(() => setClaimTx("idle"), 4000);
    }
  };

  // ── REQUEST AI ADVISORY ─────────────────────────────────────
  const handleAIRequest = async () => {
    if (!signer || !dash) return;
    setAiLoading(true);

    const userMsg: AIMessage = {
      role: "user",
      text: `Analyse my position: ${fmt(dash.stakedAmount)} RITUAL staked for ${fmtDuration(dash.timeStakedSecs)}. Accrued rewards: ${fmt(dash.totalRewards)} RITUAL. Current APY: ${Number(dash.apyBps) / 100}%.`,
      ts: Date.now(),
    };
    setAiMessages(prev => [...prev, userMsg]);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.requestAIAdvisory();
      const receipt = await tx.wait();

      // Parse the AIAdvisoryRequested event
      const iface = new ethers.Interface(ABI);
      let reqId = "—";
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "AIAdvisoryRequested") {
            reqId = parsed.args.requestId.toString();
            setAiRequestId(reqId);
          }
        } catch {}
      }

      // Simulate AI response (replace with actual Infernet callback polling)
      const stakedNum  = Number(ethers.formatEther(dash.stakedAmount));
      const rewardNum  = Number(ethers.formatEther(dash.totalRewards));
      const apyNum     = Number(dash.apyBps) / 100;
      const days90Rew  = (stakedNum * (apyNum / 100) * 90) / 365;
      const days180Rew = (stakedNum * (apyNum / 100) * 180) / 365;

      let recommendation = "";
      if (rewardNum < stakedNum * 0.005) {
        recommendation = "Your position is early-stage. Continue staking — compounding effects become significant after 30 days. Hold current position.";
      } else if (rewardNum > stakedNum * 0.05) {
        recommendation = "Substantial rewards accrued. Consider claiming and re-staking to compound yield. This resets your accrual timer at a higher principal.";
      } else {
        recommendation = "Position is performing within expected parameters. Hold through to the 90-day mark for optimal compounding efficiency.";
      }

      const aiMsg: AIMessage = {
        role: "ai",
        text: `[Request ID: ${reqId}]\n\nPosition analysis complete.\n\n• Staked: ${stakedNum.toFixed(4)} RITUAL\n• Duration: ${fmtDuration(dash.timeStakedSecs)}\n• Accrued: ${rewardNum.toFixed(4)} RITUAL\n• APY: ${apyNum}%\n\nProjection:\n• +90 days → +${days90Rew.toFixed(4)} RITUAL\n• +180 days → +${days180Rew.toFixed(4)} RITUAL\n\nAdvisory: ${recommendation}`,
        ts: Date.now(),
      };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: AIMessage = {
        role: "ai",
        text: `Advisory request failed: ${e.reason || e.message || "Unknown error"}. Ensure your wallet is connected to Ritual Chain and you have sufficient gas.`,
        ts: Date.now(),
      };
      setAiMessages(prev => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-scroll AI chat
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // ── TX button label ─────────────────────────────────────────
  const txLabel = (status: TxStatus, labels: Record<TxStatus, string>) =>
    labels[status] ?? labels.idle;

  // ════════════════════════════════════════════════════════════
  if (!mounted) return <div style={{ background: "#F5F0E8", minHeight: "100vh" }} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cream:       #F5F0E8;
          --cream-dark:  #EDE7D6;
          --cream-deep:  #E0D8C4;
          --green:       #2D6A4F;
          --green-light: #40896A;
          --green-pale:  #D4E6DC;
          --ink:         #1A1A14;
          --ink-muted:   #4A4A3A;
          --ink-light:   #7A7A6A;
          --red:         #C0392B;
          --red-pale:    #FDECEA;
          --serif: 'Playfair Display', Georgia, serif;
          --mono:  'DM Mono', monospace;
          --sans:  'DM Sans', system-ui, sans-serif;
        }

        body {
          background: var(--cream);
          color: var(--ink);
          font-family: var(--sans);
          min-height: 100vh;
        }

        /* ── NAV ── */
        .app-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(245,240,232,0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--cream-deep);
          padding: 0 2rem;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--serif); font-size: 1.05rem; font-weight: 600;
          color: var(--ink); text-decoration: none;
        }
        .nav-logo img { height: 34px; width: 34px; object-fit: contain; }
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .chain-badge {
          font-family: var(--mono); font-size: 0.7rem;
          color: var(--green); letter-spacing: 0.08em;
          border: 1px solid var(--green-pale);
          background: var(--green-pale);
          padding: 4px 10px; border-radius: 20px;
          display: flex; align-items: center; gap: 5px;
        }
        .chain-badge::before {
          content: ''; width: 5px; height: 5px; border-radius: 50%;
          background: var(--green);
          animation: pulse 2s ease infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }

        .wallet-btn {
          font-family: var(--mono); font-size: 0.75rem;
          padding: 8px 16px; border-radius: 2px; cursor: pointer; border: none;
          letter-spacing: 0.06em; transition: all 0.2s;
        }
        .wallet-btn.connect {
          background: var(--green); color: var(--cream);
        }
        .wallet-btn.connect:hover { background: var(--green-light); }
        .wallet-btn.disconnect {
          background: transparent; color: var(--ink-muted);
          border: 1px solid var(--cream-deep);
        }
        .wallet-btn.disconnect:hover { border-color: var(--red); color: var(--red); }
        .wrong-chain-btn {
          font-family: var(--mono); font-size: 0.72rem;
          padding: 7px 14px; border-radius: 2px; cursor: pointer;
          background: var(--red-pale); color: var(--red);
          border: 1px solid var(--red); letter-spacing: 0.06em; transition: all 0.2s;
        }
        .wrong-chain-btn:hover { background: var(--red); color: #fff; }

        /* ── LAYOUT ── */
        .app-layout {
          max-width: 1180px; margin: 0 auto; padding: 2.5rem 2rem 4rem;
          display: grid;
          grid-template-columns: 1fr 380px;
          grid-template-rows: auto 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 960px) {
          .app-layout { grid-template-columns: 1fr; }
          .ai-panel { grid-row: auto; }
        }

        /* ── STATS ROW ── */
        .stats-row {
          grid-column: 1 / -1;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1px; background: var(--cream-deep);
          border: 1px solid var(--cream-deep);
        }
        @media (max-width: 700px) { .stats-row { grid-template-columns: repeat(2,1fr); } }
        .stat-card {
          background: var(--cream); padding: 1.25rem 1.5rem;
        }
        .stat-card-label {
          font-family: var(--mono); font-size: 0.65rem; color: var(--ink-light);
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.35rem;
        }
        .stat-card-value {
          font-family: var(--serif); font-size: 1.5rem; font-weight: 500;
          color: var(--ink); letter-spacing: -0.02em;
        }
        .stat-card-value.loading { color: var(--ink-light); }
        .stat-card-sub {
          font-family: var(--mono); font-size: 0.65rem; color: var(--ink-light);
          margin-top: 2px;
        }

        /* ── MAIN PANEL ── */
        .main-panel { display: flex; flex-direction: column; gap: 1.5rem; }

        /* ── DASHBOARD CARDS ── */
        .dash-grid {
          display: grid; grid-template-columns: repeat(2,1fr);
          gap: 1px; background: var(--cream-deep);
          border: 1px solid var(--cream-deep);
        }
        .dash-card {
          background: var(--cream); padding: 1.5rem;
          display: flex; flex-direction: column; gap: 0.35rem;
        }
        .dash-card-label {
          font-family: var(--mono); font-size: 0.65rem; color: var(--ink-light);
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .dash-card-value {
          font-family: var(--serif); font-size: 1.75rem; font-weight: 500;
          letter-spacing: -0.02em; color: var(--ink);
        }
        .dash-card-value.green { color: var(--green); }
        .dash-card-sub {
          font-family: var(--mono); font-size: 0.68rem; color: var(--ink-light);
        }

        /* ── STAKE / UNSTAKE BOX ── */
        .stake-box {
          background: var(--cream); border: 1px solid var(--cream-deep);
        }
        .tab-row {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid var(--cream-deep);
        }
        .tab-btn {
          padding: 1rem; font-family: var(--mono); font-size: 0.75rem;
          letter-spacing: 0.08em; text-transform: uppercase;
          background: transparent; border: none; cursor: pointer;
          color: var(--ink-light); transition: all 0.2s;
        }
        .tab-btn.active {
          color: var(--green); background: var(--green-pale);
          border-bottom: 2px solid var(--green);
        }
        .tab-btn:not(.active):hover { background: var(--cream-dark); }

        .stake-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

        .input-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-label {
          font-family: var(--mono); font-size: 0.68rem; color: var(--ink-muted);
          letter-spacing: 0.08em; text-transform: uppercase;
          display: flex; justify-content: space-between;
        }
        .input-label span { color: var(--green); }
        .token-input-row {
          display: flex; border: 1px solid var(--cream-deep);
          background: var(--cream); transition: border-color 0.2s;
        }
        .token-input-row:focus-within { border-color: var(--green); }
        .token-input {
          flex: 1; padding: 0.875rem 1rem;
          font-family: var(--serif); font-size: 1.1rem;
          background: transparent; border: none; outline: none; color: var(--ink);
        }
        .token-input::placeholder { color: var(--ink-light); }
        .token-tag {
          display: flex; align-items: center; padding: 0 1rem;
          font-family: var(--mono); font-size: 0.72rem;
          color: var(--ink-light); border-left: 1px solid var(--cream-deep);
          white-space: nowrap;
        }
        .max-btn {
          padding: 0 0.75rem; font-family: var(--mono); font-size: 0.65rem;
          color: var(--green); background: transparent; border: none;
          border-left: 1px solid var(--cream-deep); cursor: pointer;
          letter-spacing: 0.06em; transition: background 0.2s;
        }
        .max-btn:hover { background: var(--green-pale); }

        .action-btn {
          width: 100%; padding: 1rem; font-family: var(--mono);
          font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase;
          border: none; cursor: pointer; border-radius: 1px; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .action-btn.stake-btn {
          background: var(--green); color: var(--cream);
        }
        .action-btn.stake-btn:hover:not(:disabled) { background: var(--green-light); }
        .action-btn.unstake-btn {
          background: transparent; color: var(--ink);
          border: 1px solid var(--cream-deep);
        }
        .action-btn.unstake-btn:hover:not(:disabled) { border-color: var(--green); background: var(--green-pale); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-btn.success { background: #27AE60; color: #fff; }
        .action-btn.error   { background: var(--red); color: #fff; }

        .claim-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--cream-deep);
          background: var(--cream-dark);
        }
        .claim-info { display: flex; flex-direction: column; gap: 2px; }
        .claim-label {
          font-family: var(--mono); font-size: 0.65rem; color: var(--ink-light); letter-spacing: 0.1em; text-transform: uppercase;
        }
        .claim-value {
          font-family: var(--serif); font-size: 1.1rem; font-weight: 500; color: var(--green);
        }
        .claim-btn {
          padding: 8px 20px; font-family: var(--mono); font-size: 0.72rem;
          letter-spacing: 0.08em; background: var(--green); color: var(--cream);
          border: none; cursor: pointer; border-radius: 1px; transition: all 0.2s;
        }
        .claim-btn:hover:not(:disabled) { background: var(--green-light); }
        .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .claim-btn.success { background: #27AE60; }
        .claim-btn.error   { background: var(--red); }

        /* ── TX HASH ── */
        .tx-link {
          font-family: var(--mono); font-size: 0.68rem; color: var(--green);
          display: flex; align-items: center; gap: 6px; padding: 0.5rem 1.5rem;
          background: var(--green-pale); border-top: 1px solid var(--green-pale);
          text-decoration: none; transition: background 0.2s;
        }
        .tx-link:hover { background: var(--cream-deep); }

        /* ── NOT CONNECTED ── */
        .connect-wall {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 6rem 2rem; text-align: center; gap: 1.5rem;
        }
        .connect-wall h2 {
          font-family: var(--serif); font-size: 2rem; font-weight: 500;
          color: var(--ink); letter-spacing: -0.02em;
        }
        .connect-wall h2 em { font-style: italic; color: var(--green); }
        .connect-wall p {
          font-size: 0.95rem; color: var(--ink-muted); max-width: 42ch; line-height: 1.7; font-weight: 300;
        }
        .connect-wall-btn {
          padding: 14px 32px; font-family: var(--mono); font-size: 0.8rem;
          letter-spacing: 0.08em; background: var(--green); color: var(--cream);
          border: none; cursor: pointer; border-radius: 1px; transition: all 0.2s;
        }
        .connect-wall-btn:hover { background: var(--green-light); transform: translateY(-2px); }

        /* ── AI PANEL ── */
        .ai-panel {
          background: var(--ink);
          border: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          height: fit-content;
          position: sticky; top: 80px;
        }
        .ai-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: space-between;
        }
        .ai-header-left { display: flex; flex-direction: column; gap: 3px; }
        .ai-title {
          font-family: var(--serif); font-size: 1rem; font-weight: 500; color: var(--cream);
        }
        .ai-subtitle {
          font-family: var(--mono); font-size: 0.65rem; color: rgba(245,240,232,0.4); letter-spacing: 0.08em;
        }
        .ai-model-badge {
          font-family: var(--mono); font-size: 0.62rem; color: #7FC9A0;
          border: 1px solid rgba(127,201,160,0.3); padding: 3px 8px; border-radius: 20px;
          letter-spacing: 0.06em;
        }

        .ai-chat {
          flex: 1; min-height: 300px; max-height: 420px;
          overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
        }
        .ai-chat::-webkit-scrollbar { width: 3px; }
        .ai-chat::-webkit-scrollbar-track { background: transparent; }
        .ai-chat::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        .ai-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.75rem; padding: 2rem; text-align: center; flex: 1;
        }
        .ai-empty-icon {
          width: 40px; height: 40px; border: 1px solid rgba(45,106,79,0.4);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .ai-empty-text { font-size: 0.8rem; color: rgba(245,240,232,0.4); line-height: 1.6; font-weight: 300; }

        .msg { display: flex; flex-direction: column; gap: 4px; }
        .msg-role {
          font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .msg-role.user { color: rgba(245,240,232,0.4); }
        .msg-role.ai   { color: #7FC9A0; }
        .msg-bubble {
          padding: 0.875rem 1rem; border-radius: 2px; font-size: 0.82rem; line-height: 1.65; white-space: pre-wrap;
        }
        .msg-bubble.user { background: rgba(245,240,232,0.06); color: rgba(245,240,232,0.75); }
        .msg-bubble.ai   { background: rgba(45,106,79,0.12); border: 1px solid rgba(45,106,79,0.2); color: rgba(245,240,232,0.85); }

        .ai-loading-dots { display: flex; gap: 4px; padding: 0.5rem 1rem; }
        .ai-loading-dots span {
          width: 5px; height: 5px; border-radius: 50%; background: #7FC9A0; opacity: 0.3;
          animation: dotPulse 1.2s ease infinite;
        }
        .ai-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .ai-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }

        .ai-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .ai-req-btn {
          width: 100%; padding: 0.875rem; font-family: var(--mono); font-size: 0.72rem;
          letter-spacing: 0.08em; text-transform: uppercase;
          background: rgba(45,106,79,0.2); color: #7FC9A0;
          border: 1px solid rgba(45,106,79,0.3); cursor: pointer; border-radius: 1px;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ai-req-btn:hover:not(:disabled) { background: rgba(45,106,79,0.35); }
        .ai-req-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ai-req-id {
          font-family: var(--mono); font-size: 0.62rem; color: rgba(245,240,232,0.3);
          letter-spacing: 0.04em; text-align: center;
        }

        /* ── SPINNER ── */
        .spinner {
          width: 12px; height: 12px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.3);
          border-top-color: currentColor;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── SECTION HEADER ── */
        .section-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 0.1rem; }
        .section-eyebrow {
          font-family: var(--mono); font-size: 0.65rem; color: var(--green);
          letter-spacing: 0.12em; text-transform: uppercase;
          display: flex; align-items: center; gap: 6px;
        }
        .section-eyebrow::before { content:''; width:12px; height:1px; background:var(--green); }
        .section-title { font-family: var(--serif); font-size: 1.3rem; font-weight: 500; color: var(--ink); }

        /* ── EXPLORER LINK TINY ── */
        .explorer-link {
          font-family: var(--mono); font-size: 0.65rem; color: var(--ink-light);
          text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
          transition: color 0.2s;
        }
        .explorer-link:hover { color: var(--green); }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="app-nav">
        <a href="/" className="nav-logo">
          {/* Replace src with your actual logo path or import */}
          <img src="/logo.png" alt="InferStake" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          InferStake
        </a>
        <div className="nav-right">
          {address && (
            <div className="chain-badge">
              Ritual Chain · {RITUAL_CHAIN_ID}
            </div>
          )}
          {!address ? (
            <button className="wallet-btn connect" onClick={connect}>
              Connect Wallet
            </button>
          ) : !chainOk ? (
            <button className="wrong-chain-btn" onClick={switchChain}>
              ⚠ Switch to Ritual Chain
            </button>
          ) : (
            <>
              <span style={{ fontFamily:"var(--mono)", fontSize:"0.72rem", color:"var(--ink-muted)" }}>
                {shortAddr(address)}
              </span>
              <button className="wallet-btn disconnect" onClick={disconnect}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── APP LAYOUT ── */}
      <div className="app-layout">

        {/* ── STATS ROW ── */}
        <div className="stats-row">
          {[
            { label:"Total Staked",   value: proto ? fmt(proto.totalStaked) + " RITUAL" : "—",  sub:"Protocol-wide" },
            { label:"Active Stakers", value: proto ? Number(proto.totalStakers).toLocaleString()     : "—",  sub:"Unique addresses" },
            { label:"AI Queries",     value: proto ? Number(proto.aiQueries).toLocaleString()        : "—",  sub:"Infernet requests" },
            { label:"Current APY",    value: proto ? proto.apy.toFixed(2) + "%" : "—",              sub:"Annualised yield" },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-card-label">{s.label}</div>
              <div className={`stat-card-value ${!proto ? "loading" : ""}`}>{s.value}</div>
              <div className="stat-card-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN PANEL (left) ── */}
        {!address ? (
          <div className="connect-wall">
            <div className="section-eyebrow" style={{ justifyContent:"center" }}>Get Started</div>
            <h2>Connect your wallet<br/>to <em>start staking</em></h2>
            <p>Link MetaMask to Ritual Chain (ID {RITUAL_CHAIN_ID}) to stake RITUAL tokens, view your dashboard, and request AI advisory from Ritual's Infernet network.</p>
            <button className="connect-wall-btn" onClick={connect}>
              Connect MetaMask →
            </button>
            <a
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank" rel="noopener"
              className="explorer-link"
            >
              ↗ View contract on explorer
            </a>
          </div>
        ) : (
          <div className="main-panel">

            {/* Dashboard */}
            <div>
              <div className="section-header" style={{ marginBottom:"0.75rem" }}>
                <div className="section-eyebrow">Your Position</div>
                <div className="section-title">Dashboard</div>
              </div>
              <div className="dash-grid">
                <div className="dash-card">
                  <div className="dash-card-label">Staked Balance</div>
                  <div className="dash-card-value">
                    {dash ? fmt(dash.stakedAmount, 4) : "—"}
                  </div>
                  <div className="dash-card-sub">RITUAL</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Accrued Rewards</div>
                  <div className="dash-card-value green">
                    {dash ? fmt(dash.totalRewards, 6) : "—"}
                  </div>
                  <div className="dash-card-sub">RITUAL · live accruing</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Wallet Balance</div>
                  <div className="dash-card-value">
                    {fmt(nativeBal, 4)}
                  </div>
                  <div className="dash-card-sub">native RITUAL in wallet</div>
                </div>
                <div className="dash-card">
                  <div className="dash-card-label">Time Staked</div>
                  <div className="dash-card-value">
                    {dash ? fmtDuration(dash.timeStakedSecs) : "—"}
                  </div>
                  <div className="dash-card-sub">
                    APY: {dash ? (Number(dash.apyBps) / 100).toFixed(2) : "—"}%
                  </div>
                </div>
              </div>
            </div>

            {/* Stake / Unstake */}
            <div>
              <div className="section-header" style={{ marginBottom:"0.75rem" }}>
                <div className="section-eyebrow">Actions</div>
                <div className="section-title">Stake & Unstake</div>
              </div>
              <div className="stake-box">
                {/* Tabs */}
                <div className="tab-row">
                  <button className={`tab-btn ${tab === "stake" ? "active" : ""}`} onClick={() => setTab("stake")}>
                    Stake
                  </button>
                  <button className={`tab-btn ${tab === "unstake" ? "active" : ""}`} onClick={() => setTab("unstake")}>
                    Unstake
                  </button>
                </div>

                {/* Stake tab */}
                {tab === "stake" && (
                  <div className="stake-body">
                    <div className="input-wrap">
                      <div className="input-label">
                        Amount to stake
                        <span>Bal: {fmt(nativeBal, 4)} RITUAL</span>
                      </div>
                      <div className="token-input-row">
                        <input
                          className="token-input"
                          type="number" min="0" placeholder="0.0000"
                          value={stakeInput}
                          onChange={e => setStakeInput(e.target.value)}
                        />
                        <button className="max-btn" onClick={() => setNativeBal && setStakeInput(ethers.formatEther(nativeBal))}>MAX</button>
                        <div className="token-tag">RITUAL</div>
                      </div>
                    </div>
                    <button
                      className={`action-btn stake-btn ${stakeTx === "success" ? "success" : stakeTx === "error" ? "error" : ""}`}
                      onClick={handleStake}
                      disabled={!stakeInput || parseFloat(stakeInput) <= 0 || stakeTx === "pending"}
                    >
                      {stakeTx === "idle"    && "Stake RITUAL →"}
                      {stakeTx === "pending" && <><span className="spinner" /> Staking…</>}
                      {stakeTx === "success"   && "✓ Staked Successfully"}
                      {stakeTx === "error"     && "✗ Transaction Failed"}
                    </button>
                    <div style={{ fontFamily:"var(--mono)", fontSize:"0.68rem", color:"var(--ink-light)", lineHeight:1.6 }}>
                      Reward formula: <code>staked × APY × time / 365 days</code><br/>
                      Minimum stake: 0.01 RITUAL · No approve needed · No lock-up
                    </div>
                  </div>
                )}

                {/* Unstake tab */}
                {tab === "unstake" && (
                  <div className="stake-body">
                    <div className="input-wrap">
                      <div className="input-label">
                        Amount to unstake
                        <span>Staked: {dash ? fmt(dash.stakedAmount, 4) : "—"} RITUAL</span>
                      </div>
                      <div className="token-input-row">
                        <input
                          className="token-input"
                          type="number" min="0" placeholder="0.0000"
                          value={unstakeInput}
                          onChange={e => setUnstakeInput(e.target.value)}
                        />
                        <button className="max-btn" onClick={() => {
                          if (dash) setUnstakeInput(ethers.formatEther(dash.stakedAmount));
                        }}>MAX</button>
                        <div className="token-tag">RITUAL</div>
                      </div>
                    </div>
                    <button
                      className={`action-btn unstake-btn ${unstakeTx === "success" ? "success" : unstakeTx === "error" ? "error" : ""}`}
                      onClick={handleUnstake}
                      disabled={!unstakeInput || parseFloat(unstakeInput) <= 0 || unstakeTx === "pending"}
                    >
                      {unstakeTx === "idle"    && "Unstake RITUAL"}
                      {unstakeTx === "pending" && <><span className="spinner" /> Unstaking…</>}
                      {unstakeTx === "success" && "✓ Unstaked Successfully"}
                      {unstakeTx === "error"   && "✗ Transaction Failed"}
                    </button>
                    <div style={{ fontFamily:"var(--mono)", fontSize:"0.68rem", color:"var(--ink-light)", lineHeight:1.6 }}>
                      Rewards are snapshotted on unstake.<br/>
                      Claim separately after unstaking.
                    </div>
                  </div>
                )}

                {/* Claim bar */}
                <div className="claim-bar">
                  <div className="claim-info">
                    <div className="claim-label">Claimable Rewards</div>
                    <div className="claim-value">
                      {dash ? fmt(dash.totalRewards, 6) : "—"} RITUAL
                    </div>
                  </div>
                  <button
                    className={`claim-btn ${claimTx === "success" ? "success" : claimTx === "error" ? "error" : ""}`}
                    onClick={handleClaim}
                    disabled={!dash || dash.totalRewards === 0n || claimTx === "pending"}
                  >
                    {claimTx === "idle"    && "Claim →"}
                    {claimTx === "pending" && <><span className="spinner" style={{borderColor:"rgba(255,255,255,0.3)", borderTopColor:"#fff"}} /> Claiming…</>}
                    {claimTx === "success" && "✓ Claimed"}
                    {claimTx === "error"   && "✗ Failed"}
                  </button>
                </div>

                {/* TX hash link */}
                {txHash && (
                  <a
                    href={`${EXPLORER}/tx/${txHash}`}
                    target="_blank" rel="noopener"
                    className="tx-link"
                  >
                    ↗ View on Explorer: {shortAddr(txHash)}
                  </a>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── AI ADVISOR PANEL (right) ── */}
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-title">AI Stake Advisor</div>
              <div className="ai-subtitle">Ritual Infernet · 0x080C precompile</div>
            </div>
            <div className="ai-model-badge">inferstake-v1</div>
          </div>

          <div className="ai-chat">
            {aiMessages.length === 0 ? (
              <div className="ai-empty">
                <div className="ai-empty-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polygon points="9,2 16,6 16,12 9,16 2,12 2,6" stroke="#7FC9A0" strokeWidth="1.2" fill="none"/>
                    <circle cx="9" cy="9" r="2.5" fill="#7FC9A0" opacity="0.5"/>
                  </svg>
                </div>
                <p className="ai-empty-text">
                  Connect wallet and request an advisory to get a personalised staking recommendation from the Infernet network.
                </p>
              </div>
            ) : (
              aiMessages.map((msg, i) => (
                <div className="msg" key={i}>
                  <div className={`msg-role ${msg.role}`}>
                    {msg.role === "user" ? "You" : "Infernet AI"}
                  </div>
                  <div className={`msg-bubble ${msg.role}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {aiLoading && (
              <div className="ai-loading-dots">
                <span /><span /><span />
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          <div className="ai-footer">
            <button
              className="ai-req-btn"
              onClick={handleAIRequest}
              disabled={!address || !chainOk || !dash || aiLoading}
            >
              {aiLoading
                ? <><span className="spinner" style={{borderColor:"rgba(127,201,160,0.3)",borderTopColor:"#7FC9A0"}} /> Requesting…</>
                : "↗ Request AI Advisory"
              }
            </button>
            {aiRequestId && (
              <div className="ai-req-id">Last request ID: {aiRequestId}</div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

// ── Type shim for window.ethereum ────────────────────────────
declare global {
  interface Window {
    ethereum?: any;
  }
}