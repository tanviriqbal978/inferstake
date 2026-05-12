/**
 * InferStake — /pages/docs.tsx
 *
 * Full documentation page.
 * Place at: pages/docs.tsx  (Next.js pages router)
 *        or app/docs/page.tsx (App router — add "use client" if needed)
 */

import { useState } from "react";

const CONTRACT_ADDRESS = "0x6e4463b62a2e332b007573dbe7f0Bf3B784B4838";
const EXPLORER         = "https://explorer.ritualfoundation.org";
const CHAIN_ID         = 1979;
const RPC_HTTP         = "https://rpc.ritualfoundation.org";
const RPC_WS           = "wss://rpc.ritualfoundation.org/ws";

// Full contract ABI for devs
const CONTRACT_ABI = [
  { name: "stake",               type: "function", stateMutability: "payable",    inputs: [],                                            outputs: [] },
  { name: "unstake",             type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],          outputs: [] },
  { name: "claimRewards",        type: "function", stateMutability: "nonpayable", inputs: [],                                            outputs: [] },
  { name: "requestAIAdvisory",   type: "function", stateMutability: "nonpayable", inputs: [],                                            outputs: [{ name: "requestId", type: "uint256" }] },
  { name: "getStakedBalance",    type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],           outputs: [{ name: "", type: "uint256" }] },
  { name: "getRewards",          type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],           outputs: [{ name: "", type: "uint256" }] },
  { name: "getUserDashboard",    type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],           outputs: [{ name: "stakedAmount", type: "uint256" }, { name: "totalRewards", type: "uint256" }, { name: "apyBps", type: "uint256" }, { name: "timeStakedSeconds", type: "uint256" }, { name: "lastAiRequestId", type: "uint256" }] },
  { name: "getProtocolStats",    type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "_totalStaked", type: "uint256" }, { name: "_totalStakers", type: "uint256" }, { name: "_totalAiQueries", type: "uint256" }, { name: "_apyBasisPoints", type: "uint256" }] },
  { name: "contractBalance",     type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "", type: "uint256" }] },
  { name: "fundRewardReserve",   type: "function", stateMutability: "payable",    inputs: [],                                            outputs: [] },
  { name: "setAPY",              type: "function", stateMutability: "nonpayable", inputs: [{ name: "newApyBps", type: "uint256" }],      outputs: [] },
  { name: "apyBasisPoints",      type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "", type: "uint256" }] },
  { name: "totalStaked",         type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "", type: "uint256" }] },
  { name: "owner",               type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "", type: "address" }] },
  { name: "rewardReserve",       type: "function", stateMutability: "view",       inputs: [],                                            outputs: [{ name: "", type: "uint256" }] },
  { name: "Staked",              type: "event",                                   inputs: [{ indexed: true, name: "user", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }] },
  { name: "Unstaked",            type: "event",                                   inputs: [{ indexed: true, name: "user", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }] },
  { name: "RewardsClaimed",      type: "event",                                   inputs: [{ indexed: true, name: "user", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }] },
  { name: "AIAdvisoryRequested", type: "event",                                   inputs: [{ indexed: true, name: "user", type: "address" }, { name: "requestId", type: "uint256" }] },
];

// Sections for sidebar nav
const SECTIONS = [
  { id: "overview",   label: "What is InferStake" },
  { id: "quickstart", label: "Quick Start" },
  { id: "yield",      label: "How Yield Works" },
  { id: "ai",         label: "AI Advisor" },
  { id: "contract",   label: "Contract Reference" },
  { id: "network",    label: "Network & RPC" },
  { id: "faq",        label: "FAQ" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="copy-btn" onClick={copy}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "solidity", title }: { code: string; lang?: string; title?: string }) {
  return (
    <div className="code-block">
      {title && (
        <div className="code-header">
          <span className="code-dots">
            <span /><span /><span />
          </span>
          <span className="code-title">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="code-pre"><code>{code}</code></pre>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="doc-section">
      <div className="section-eyebrow">{eyebrow}</div>
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [abiCopied, setAbiCopied] = useState(false);

  const copyAbi = async () => {
    await navigator.clipboard.writeText(JSON.stringify(CONTRACT_ABI, null, 2));
    setAbiCopied(true);
    setTimeout(() => setAbiCopied(false), 2000);
  };

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
          --code-bg:     #1A1A14;
          --serif: 'Playfair Display', Georgia, serif;
          --mono:  'DM Mono', monospace;
          --sans:  'DM Sans', system-ui, sans-serif;
          --sidebar-w: 240px;
        }

        body {
          background: var(--cream);
          color: var(--ink);
          font-family: var(--sans);
          min-height: 100vh;
        }

        /* ── NAV ── */
        .docs-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 60px;
          background: rgba(245,240,232,0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--cream-deep);
          display: flex; align-items: center;
          padding: 0 2rem;
          justify-content: space-between;
        }
        .docs-nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--serif); font-size: 1rem; font-weight: 600;
          color: var(--ink); text-decoration: none;
        }
        .docs-nav-logo img { height: 30px; width: 30px; object-fit: contain; }
        .docs-nav-badge {
          font-family: var(--mono); font-size: 0.65rem;
          background: var(--green-pale); color: var(--green);
          padding: 3px 10px; border-radius: 20px; letter-spacing: 0.06em;
        }
        .docs-nav-links { display: flex; gap: 1.5rem; }
        .docs-nav-links a {
          font-size: 0.85rem; color: var(--ink-muted);
          text-decoration: none; transition: color 0.2s;
        }
        .docs-nav-links a:hover { color: var(--green); }
        .docs-nav-links a.active { color: var(--green); font-weight: 500; }

        /* ── LAYOUT ── */
        .docs-layout {
          display: grid;
          grid-template-columns: var(--sidebar-w) 1fr;
          min-height: 100vh;
          padding-top: 60px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .docs-layout { grid-template-columns: 1fr; }
          .docs-sidebar { display: none; }
        }

        /* ── SIDEBAR ── */
        .docs-sidebar {
          position: sticky; top: 60px;
          height: calc(100vh - 60px);
          overflow-y: auto;
          padding: 2rem 0;
          border-right: 1px solid var(--cream-deep);
        }
        .sidebar-label {
          font-family: var(--mono); font-size: 0.62rem;
          color: var(--ink-light); letter-spacing: 0.12em;
          text-transform: uppercase; padding: 0 1.5rem;
          margin-bottom: 0.75rem; display: block;
        }
        .sidebar-links { list-style: none; }
        .sidebar-links a {
          display: block; padding: 0.45rem 1.5rem;
          font-size: 0.85rem; color: var(--ink-muted);
          text-decoration: none; border-left: 2px solid transparent;
          transition: all 0.15s;
        }
        .sidebar-links a:hover { color: var(--green); background: var(--cream-dark); }
        .sidebar-links a.active {
          color: var(--green); border-left-color: var(--green);
          background: var(--green-pale); font-weight: 500;
        }

        /* ── MAIN CONTENT ── */
        .docs-content {
          padding: 3rem 4rem 6rem 3rem;
          max-width: 760px;
        }
        @media (max-width: 900px) { .docs-content { padding: 2rem 1.5rem; } }

        /* ── DOC SECTION ── */
        .doc-section {
          padding-bottom: 4rem;
          border-bottom: 1px solid var(--cream-deep);
          margin-bottom: 4rem;
        }
        .doc-section:last-child { border-bottom: none; }

        .section-eyebrow {
          font-family: var(--mono); font-size: 0.65rem;
          color: var(--green); letter-spacing: 0.12em;
          text-transform: uppercase;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 0.75rem;
        }
        .section-eyebrow::before { content:''; width:14px; height:1px; background:var(--green); }

        .section-title {
          font-family: var(--serif); font-size: 1.9rem; font-weight: 500;
          letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 1.5rem;
          color: var(--ink);
        }

        .section-body { display: flex; flex-direction: column; gap: 1.25rem; }

        p {
          font-size: 0.95rem; color: var(--ink-muted); line-height: 1.75;
          font-weight: 300;
        }
        p strong { color: var(--ink); font-weight: 500; }

        h3 {
          font-family: var(--serif); font-size: 1.15rem; font-weight: 500;
          color: var(--ink); margin-top: 0.5rem; margin-bottom: -0.25rem;
          letter-spacing: -0.01em;
        }

        /* ── CALLOUT ── */
        .callout {
          border-left: 3px solid var(--green);
          background: var(--green-pale);
          padding: 1rem 1.25rem;
          border-radius: 0 2px 2px 0;
        }
        .callout p { color: var(--ink-muted); margin: 0; }
        .callout-label {
          font-family: var(--mono); font-size: 0.65rem;
          color: var(--green); letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 0.35rem; display: block;
        }

        /* ── CODE BLOCK ── */
        .code-block {
          background: var(--code-bg);
          border-radius: 3px;
          overflow: hidden;
          font-family: var(--mono);
          font-size: 0.8rem;
        }
        .code-header {
          background: #252520;
          padding: 0.65rem 1rem;
          display: flex; align-items: center; gap: 0.75rem;
          border-bottom: 1px solid #333;
        }
        .code-dots { display: flex; gap: 5px; }
        .code-dots span {
          width: 10px; height: 10px; border-radius: 50%;
        }
        .code-dots span:nth-child(1) { background: #FF6058; }
        .code-dots span:nth-child(2) { background: #FFBD2E; }
        .code-dots span:nth-child(3) { background: #28CA41; }
        .code-title {
          font-family: var(--mono); font-size: 0.7rem;
          color: #666; letter-spacing: 0.06em; flex: 1;
        }
        .copy-btn {
          font-family: var(--mono); font-size: 0.65rem;
          color: #666; background: transparent; border: 1px solid #444;
          padding: 3px 10px; border-radius: 2px; cursor: pointer;
          letter-spacing: 0.04em; transition: all 0.2s;
        }
        .copy-btn:hover { color: #7FC9A0; border-color: #7FC9A0; }
        .code-pre {
          padding: 1.25rem; overflow-x: auto; margin: 0;
          color: #D4D4D4; line-height: 1.65;
          white-space: pre;
        }
        .code-pre code { background: none; padding: 0; font-size: inherit; }

        /* Inline code */
        code {
          font-family: var(--mono); font-size: 0.82em;
          background: var(--cream-deep); color: var(--green);
          padding: 2px 6px; border-radius: 2px;
        }

        /* ── FORMULA BOX ── */
        .formula-box {
          border: 1px solid var(--cream-deep);
          background: var(--cream-dark);
          padding: 1.5rem;
          text-align: center;
        }
        .formula {
          font-family: var(--mono); font-size: 0.9rem;
          color: var(--ink); line-height: 2;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .formula-bar {
          width: 100%; max-width: 400px; height: 1px;
          background: var(--ink); margin: 4px 0;
        }
        .formula-label {
          font-family: var(--mono); font-size: 0.65rem;
          color: var(--ink-light); letter-spacing: 0.1em;
          text-transform: uppercase; margin-top: 0.75rem;
        }

        /* ── FUNCTION CARDS ── */
        .fn-grid { display: flex; flex-direction: column; gap: 1px; background: var(--cream-deep); border: 1px solid var(--cream-deep); }
        .fn-card { background: var(--cream); padding: 1.25rem 1.5rem; }
        .fn-signature {
          font-family: var(--mono); font-size: 0.82rem;
          color: var(--green); margin-bottom: 0.5rem;
        }
        .fn-desc { font-size: 0.875rem; color: var(--ink-muted); line-height: 1.65; font-weight: 300; }
        .fn-badge {
          display: inline-block;
          font-family: var(--mono); font-size: 0.6rem;
          padding: 2px 7px; border-radius: 10px; margin-left: 8px;
          letter-spacing: 0.06em; vertical-align: middle;
        }
        .fn-badge.payable    { background: #FFF3CD; color: #856404; }
        .fn-badge.view       { background: var(--green-pale); color: var(--green); }
        .fn-badge.nonpayable { background: var(--cream-deep); color: var(--ink-light); }
        .fn-badge.owner      { background: #FDECEA; color: #C0392B; }

        /* ── NETWORK TABLE ── */
        .net-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .net-table th {
          font-family: var(--mono); font-size: 0.65rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--ink-light);
          text-align: left; padding: 0.65rem 1rem;
          background: var(--cream-dark); border-bottom: 1px solid var(--cream-deep);
        }
        .net-table td {
          padding: 0.8rem 1rem; border-bottom: 1px solid var(--cream-deep);
          color: var(--ink-muted); font-weight: 300; vertical-align: top;
        }
        .net-table td:first-child { font-family: var(--mono); font-size: 0.8rem; color: var(--ink); }
        .net-table tr:last-child td { border-bottom: none; }

        /* ── CONTRACT ADDRESS ── */
        .addr-box {
          display: flex; align-items: center; gap: 0;
          border: 1px solid var(--cream-deep); overflow: hidden;
        }
        .addr-text {
          flex: 1; padding: 0.875rem 1rem;
          font-family: var(--mono); font-size: 0.78rem;
          color: var(--ink); letter-spacing: 0.04em;
          word-break: break-all;
        }
        .addr-actions { display: flex; border-left: 1px solid var(--cream-deep); }
        .addr-btn {
          padding: 0 1rem; font-family: var(--mono); font-size: 0.7rem;
          color: var(--ink-muted); background: var(--cream-dark);
          border: none; border-right: 1px solid var(--cream-deep);
          cursor: pointer; height: 100%; transition: all 0.2s;
          white-space: nowrap; letter-spacing: 0.04em;
        }
        .addr-btn:last-child { border-right: none; }
        .addr-btn:hover { background: var(--green-pale); color: var(--green); }

        /* ── FAQ ── */
        .faq-item { border-bottom: 1px solid var(--cream-deep); }
        .faq-q {
          width: 100%; text-align: left; padding: 1.1rem 0;
          font-family: var(--sans); font-size: 0.95rem; font-weight: 400;
          color: var(--ink); background: transparent; border: none;
          cursor: pointer; display: flex; justify-content: space-between;
          align-items: center; gap: 1rem;
        }
        .faq-q:hover { color: var(--green); }
        .faq-icon { font-size: 1.1rem; transition: transform 0.2s; flex-shrink: 0; }
        .faq-icon.open { transform: rotate(45deg); }
        .faq-a { padding: 0 0 1.1rem; font-size: 0.875rem; color: var(--ink-muted); line-height: 1.7; font-weight: 300; }

        /* ── STEP LIST ── */
        .steps { display: flex; flex-direction: column; gap: 0; }
        .step-item {
          display: flex; gap: 1.25rem; padding: 1.25rem 0;
          border-bottom: 1px solid var(--cream-deep);
        }
        .step-item:last-child { border-bottom: none; }
        .step-num {
          width: 28px; height: 28px; flex-shrink: 0;
          border: 1px solid var(--green); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 0.7rem; color: var(--green);
          margin-top: 1px;
        }
        .step-content { flex: 1; }
        .step-title { font-weight: 500; color: var(--ink); margin-bottom: 0.3rem; font-size: 0.95rem; }
        .step-desc  { font-size: 0.875rem; color: var(--ink-muted); line-height: 1.65; font-weight: 300; }

        /* ── ABI VIEWER ── */
        .abi-viewer {
          background: var(--code-bg); border-radius: 3px;
          overflow: hidden; max-height: 320px; position: relative;
        }
        .abi-scroll {
          overflow-y: auto; padding: 1.25rem;
          font-family: var(--mono); font-size: 0.75rem;
          color: #9ECBFF; line-height: 1.7; max-height: 280px;
        }
        .abi-scroll::-webkit-scrollbar { width: 3px; }
        .abi-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .abi-actions {
          padding: 0.75rem 1rem; border-top: 1px solid #333;
          display: flex; gap: 0.75rem; background: #252520;
        }
        .abi-btn {
          font-family: var(--mono); font-size: 0.7rem; padding: 5px 14px;
          border-radius: 2px; cursor: pointer; letter-spacing: 0.04em; transition: all 0.2s;
        }
        .abi-btn.copy-abi { background: var(--green); color: var(--cream); border: none; }
        .abi-btn.copy-abi:hover { background: var(--green-light); }
        .abi-btn.explorer { background: transparent; color: #9ECBFF; border: 1px solid #444; }
        .abi-btn.explorer:hover { border-color: #9ECBFF; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="docs-nav">
        <a href="/" className="docs-nav-logo">
          <img src="/logo.png" alt="InferStake" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          InferStake
          <span className="docs-nav-badge">Docs</span>
        </a>
        <div className="docs-nav-links">
          <a href="/">Home</a>
          <a href="/app">Launch App</a>
          <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener">Explorer ↗</a>
        </div>
      </nav>

      <div className="docs-layout">

        {/* ── SIDEBAR ── */}
        <aside className="docs-sidebar">
          <span className="sidebar-label">Documentation</span>
          <ul className="sidebar-links">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={activeSection === s.id ? "active" : ""}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── CONTENT ── */}
        <main className="docs-content">

          {/* ── OVERVIEW ── */}
          <Section id="overview" eyebrow="Introduction" title="What is InferStake?">
            <p>
              <strong>InferStake</strong> is an AI-powered native token staking protocol deployed on <strong>Ritual Chain</strong> (Chain ID {CHAIN_ID}). Users stake native <strong>RITUAL</strong> tokens directly from their wallet and earn yield at a configurable APY — currently <strong>15%</strong> annualised.
            </p>
            <p>
              What makes InferStake unique is its integration with <strong>Ritual Infernet</strong> — an on-chain AI inference layer. Using the <code>0x080C</code> precompile address, the protocol can submit staking data to off-chain AI nodes and receive cryptographically verifiable advisory results without leaving the chain.
            </p>
            <div className="callout">
              <span className="callout-label">Native Token</span>
              <p>InferStake uses native RITUAL — no ERC-20 approval step needed. Just send RITUAL with your transaction and you're staked.</p>
            </div>
            <p>
              The contract is immutable (no proxy pattern), open-source, and all reward calculations are executed deterministically on-chain — every number you see in the dashboard is computed directly from contract state.
            </p>
          </Section>

          {/* ── QUICK START ── */}
          <Section id="quickstart" eyebrow="Getting Started" title="Quick Start">
            <div className="steps">
              {[
                { n: "1", t: "Add Ritual Chain to MetaMask", d: `Open MetaMask → Add Network → fill in: Network Name: Ritual Chain · RPC: ${RPC_HTTP} · Chain ID: ${CHAIN_ID} · Symbol: RITUAL · Explorer: ${EXPLORER}` },
                { n: "2", t: "Get RITUAL tokens",            d: "Obtain native RITUAL from the faucet or bridge. Ensure your wallet has at least 0.01 RITUAL (minimum stake) plus a small amount for gas fees." },
                { n: "3", t: "Connect wallet",               d: "Go to /app and click \"Connect Wallet\". InferStake will auto-detect your chain — if you're not on Ritual Chain, it will prompt you to switch." },
                { n: "4", t: "Stake RITUAL",                 d: "Enter the amount you wish to stake and click \"Stake RITUAL →\". Your RITUAL is sent as msg.value — no approve() step needed. Rewards begin accruing immediately." },
                { n: "5", t: "Claim rewards",                d: "Your claimable rewards update in real-time in the dashboard. Click \"Claim →\" at any time to withdraw accrued yield to your wallet." },
                { n: "6", t: "Request AI Advisory",          d: "In the AI Advisor panel, click \"Request AI Advisory\" to submit your staking data to the Infernet network and receive a personalised recommendation." },
              ].map(s => (
                <div className="step-item" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-content">
                    <div className="step-title">{s.t}</div>
                    <div className="step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── YIELD ── */}
          <Section id="yield" eyebrow="Economics" title="How Yield Works">
            <p>
              InferStake uses a simple, transparent, time-weighted reward formula. There are no lock-up periods, no vesting schedules, and no compounding complexity — rewards accrue every second and can be claimed at any time.
            </p>

            <h3>Reward Formula</h3>
            <div className="formula-box">
              <div className="formula">
                <span>stakedAmount &times; apyBasisPoints &times; timeElapsed</span>
                <div className="formula-bar" />
                <span>10,000 &times; 365 days (in seconds)</span>
              </div>
              <div className="formula-label">Where apyBasisPoints = 1500 means 15.00% APY</div>
            </div>

            <h3>Example Calculation</h3>
            <p>
              Staking <strong>100 RITUAL</strong> for <strong>30 days</strong> at <strong>15% APY</strong>:
            </p>
            <CodeBlock
              title="Reward calculation"
              code={`staked     = 100 RITUAL
APY        = 15%  →  1500 basis points
timeElapsed = 30 days  →  2,592,000 seconds

reward = (100 × 1500 × 2,592,000) / (10,000 × 31,536,000)
       = 388,800,000,000 / 315,360,000,000
       ≈ 1.2328 RITUAL`}
            />

            <h3>Reward Accrual</h3>
            <p>
              Rewards accrue continuously and are snapshotted into <code>accruedRewards</code> whenever you stake more or unstake. This prevents reward dilution — your earned yield is never lost when changing your position.
            </p>

            <h3>Reward Reserve</h3>
            <p>
              The contract owner pre-funds a native RITUAL reserve via <code>fundRewardReserve()</code>. When you claim, rewards come from this reserve. If the reserve is insufficient, claims will revert — check <code>rewardReserve()</code> on the contract before claiming.
            </p>

            <div className="callout">
              <span className="callout-label">APY Updates</span>
              <p>The owner can update the APY via <code>setAPY(newApyBps)</code>. APY changes affect future accrual only — already-accrued rewards are always preserved in <code>accruedRewards</code>.</p>
            </div>
          </Section>

          {/* ── AI ADVISOR ── */}
          <Section id="ai" eyebrow="Ritual Infernet" title="AI Advisor">
            <p>
              InferStake integrates with <strong>Ritual's Infernet</strong> network — a decentralised AI inference layer built into Ritual Chain. The <code>0x080C</code> precompile address exposes a <code>requestCompute()</code> function that submits AI jobs to off-chain Infernet nodes.
            </p>

            <h3>How it works</h3>
            <div className="steps">
              {[
                { n: "1", t: "User calls requestAIAdvisory()",   d: "The contract encodes your staked amount, accrued rewards, APY, and time staked into an ABI-encoded payload." },
                { n: "2", t: "Payload sent to Infernet (0x080C)", d: "The IInfernetCoordinator precompile receives the payload and emits it to the Infernet P2P network." },
                { n: "3", t: "Off-chain node runs the model",    d: "An Infernet node runs the inferstake-advisor-v1 model against your payload. The model analyses your position and generates a recommendation." },
                { n: "4", t: "Result returned via callback",     d: "The node delivers the result via an on-chain callback or an off-chain indexer. The dApp reads the result and displays it in the AI Advisor panel." },
              ].map(s => (
                <div className="step-item" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-content">
                    <div className="step-title">{s.t}</div>
                    <div className="step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3>Infernet payload structure</h3>
            <CodeBlock
              title="requestAIAdvisory() — payload encoding"
              code={`bytes memory payload = abi.encode(
    msg.sender,                          // address: user
    info.stakedAmount,                   // uint256: wei staked
    info.accruedRewards + pendingRewards, // uint256: total claimable wei
    apyBasisPoints,                       // uint256: e.g. 1500 = 15%
    block.timestamp - info.stakeTimestamp // uint256: seconds staked
);

IInfernetCoordinator(0x000...080C).requestCompute(
    "inferstake-advisor-v1",  // model ID
    payload,
    200_000                   // callback gas limit
);`}
            />

            <div className="callout">
              <span className="callout-label">Verifiable AI</span>
              <p>Every Infernet result is tied to a unique <code>requestId</code> emitted in the <code>AIAdvisoryRequested</code> event. You can verify the computation on Ritual's Infernet explorer using this ID.</p>
            </div>
          </Section>

          {/* ── CONTRACT REFERENCE ── */}
          <Section id="contract" eyebrow="Solidity" title="Contract Reference">

            <h3>Contract Address</h3>
            <div className="addr-box">
              <div className="addr-text">{CONTRACT_ADDRESS}</div>
              <div className="addr-actions">
                <button className="addr-btn" onClick={() => navigator.clipboard.writeText(CONTRACT_ADDRESS)}>
                  Copy
                </button>
                <a
                  href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
                  target="_blank" rel="noopener"
                  className="addr-btn"
                  style={{ display:"flex", alignItems:"center", textDecoration:"none", color:"inherit" }}
                >
                  Explorer ↗
                </a>
              </div>
            </div>

            <h3 style={{ marginTop:"0.5rem" }}>Functions</h3>
            <div className="fn-grid">
              {[
                { sig: "stake()",                            badge: "payable",    note: "nonpayable" as const,  desc: "Stake native RITUAL. Send RITUAL as msg.value. No approve() needed. Rewards begin accruing immediately." },
                { sig: "unstake(uint256 amount)",            badge: "write",      note: "nonpayable" as const,  desc: "Withdraw staked RITUAL. Rewards are snapshotted to accruedRewards first. Call claimRewards() separately." },
                { sig: "claimRewards()",                     badge: "write",      note: "nonpayable" as const,  desc: "Claim all accrued native RITUAL rewards. Sends from the reward reserve. Reverts if reserve is insufficient." },
                { sig: "requestAIAdvisory()",                badge: "write",      note: "nonpayable" as const,  desc: "Submit staking data to the Ritual Infernet precompile (0x080C). Returns a requestId." },
                { sig: "getStakedBalance(address user)",     badge: "view",       note: "view" as const,        desc: "Returns the current staked balance (wei) for any address." },
                { sig: "getRewards(address user)",           badge: "view",       note: "view" as const,        desc: "Returns total claimable rewards (accrued + live pending) in wei." },
                { sig: "getUserDashboard(address user)",     badge: "view",       note: "view" as const,        desc: "Returns all dashboard data in a single call: stakedAmount, totalRewards, apyBps, timeStakedSeconds, lastAiRequestId." },
                { sig: "getProtocolStats()",                 badge: "view",       note: "view" as const,        desc: "Returns protocol-wide stats: totalStaked, totalStakers, totalAiQueries, apyBasisPoints." },
                { sig: "contractBalance()",                  badge: "view",       note: "view" as const,        desc: "Returns total native RITUAL held by the contract (staked + reserve)." },
                { sig: "fundRewardReserve()",                badge: "owner",      note: "payable" as const,     desc: "Owner only. Fund the reward reserve by sending native RITUAL as msg.value." },
                { sig: "setAPY(uint256 newApyBps)",          badge: "owner",      note: "nonpayable" as const,  desc: "Owner only. Update APY. 1500 = 15%, max 10000 = 100%." },
                { sig: "setMinStakeAmount(uint256 amount)",  badge: "owner",      note: "nonpayable" as const,  desc: "Owner only. Update the minimum stake threshold (wei)." },
                { sig: "setAIModelId(string newModelId)",    badge: "owner",      note: "nonpayable" as const,  desc: "Owner only. Update the Infernet model identifier string." },
                { sig: "transferOwnership(address newOwner)",badge: "owner",      note: "nonpayable" as const,  desc: "Owner only. Transfer contract ownership to a new address." },
                { sig: "emergencyWithdraw(uint256 amount)",  badge: "owner",      note: "nonpayable" as const,  desc: "Owner only. Emergency native RITUAL withdrawal. Use only for migrations." },
              ].map(fn => (
                <div className="fn-card" key={fn.sig}>
                  <div className="fn-signature">
                    {fn.sig}
                    <span className={`fn-badge ${fn.badge === "view" ? "view" : fn.badge === "payable" ? "payable" : fn.badge === "owner" ? "owner" : "nonpayable"}`}>
                      {fn.badge}
                    </span>
                  </div>
                  <div className="fn-desc">{fn.desc}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: "1rem" }}>Full ABI</h3>
            <div className="abi-viewer">
              <div className="abi-scroll">
                <pre>{JSON.stringify(CONTRACT_ABI, null, 2)}</pre>
              </div>
              <div className="abi-actions">
                <button className="abi-btn copy-abi" onClick={copyAbi}>
                  {abiCopied ? "✓ Copied" : "Copy ABI"}
                </button>
                <a
                  href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
                  target="_blank" rel="noopener"
                  className="abi-btn explorer"
                  style={{ textDecoration:"none", display:"inline-flex", alignItems:"center" }}
                >
                  View on Explorer ↗
                </a>
              </div>
            </div>

            <h3>ethers.js Integration</h3>
            <CodeBlock
              title="Connect and stake with ethers.js"
              code={`import { ethers } from "ethers";

const CONTRACT = "0x6e4463b62a2e332b007573dbe7f0Bf3B784B4838";
const ABI = [
  "function stake() external payable",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function getUserDashboard(address user) view returns (uint256,uint256,uint256,uint256,uint256)",
  "function getProtocolStats() view returns (uint256,uint256,uint256,uint256)",
];

// Connect
const provider = new ethers.BrowserProvider(window.ethereum);
const signer   = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT, ABI, signer);

// Stake 10 RITUAL (native token — no approve needed)
const tx = await contract.stake({ value: ethers.parseEther("10") });
await tx.wait();

// Read dashboard
const [staked, rewards, apyBps, timeSecs] = await contract.getUserDashboard(userAddress);
console.log("Staked:", ethers.formatEther(staked), "RITUAL");
console.log("Rewards:", ethers.formatEther(rewards), "RITUAL");
console.log("APY:", Number(apyBps) / 100, "%");

// Unstake
await contract.unstake(ethers.parseEther("5"));

// Claim
await contract.claimRewards();`}
            />
          </Section>

          {/* ── NETWORK ── */}
          <Section id="network" eyebrow="Infrastructure" title="Network & RPC">
            <table className="net-table">
              <thead>
                <tr><th>Parameter</th><th>Value</th></tr>
              </thead>
              <tbody>
                {[
                  ["Network Name",   "Ritual Chain"],
                  ["Chain ID",       String(CHAIN_ID)],
                  ["Currency",       "RITUAL (18 decimals)"],
                  ["Block Time",     "~350ms"],
                  ["RPC (HTTP)",     RPC_HTTP],
                  ["RPC (WebSocket)",RPC_WS],
                  ["Explorer",       EXPLORER],
                  ["Contract",       CONTRACT_ADDRESS],
                  ["Infernet Coord.","0x000000000000000000000000000000000000080C"],
                ].map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td><code style={{ background:"transparent", padding:0, color:"var(--ink-muted)", fontSize:"0.82rem" }}>{v}</code></td></tr>
                ))}
              </tbody>
            </table>

            <h3>MetaMask — Add Ritual Chain</h3>
            <CodeBlock
              title="wallet_addEthereumChain"
              code={`await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId:  "0x7BB",   // 1979 in hex
    chainName: "Ritual Chain",
    nativeCurrency: {
      name: "RITUAL", symbol: "RITUAL", decimals: 18
    },
    rpcUrls:            ["https://rpc.ritualfoundation.org"],
    blockExplorerUrls:  ["https://explorer.ritualfoundation.org"],
  }],
});`}
            />
          </Section>

          {/* ── FAQ ── */}
          <Section id="faq" eyebrow="Support" title="FAQ">
            {[
              { q: "Do I need to approve the contract before staking?",
                a: "No. InferStake uses native RITUAL — you simply send RITUAL as msg.value when calling stake(). There's no ERC-20 approve() step needed." },
              { q: "When do rewards start accruing?",
                a: "Immediately when your stake() transaction is confirmed. Rewards accumulate every second based on the formula: staked × APY × elapsed / 365 days." },
              { q: "Can I unstake at any time?",
                a: "Yes. There are no lock-up periods or penalties. Unstake any amount at any time. Pending rewards are snapshotted to your accruedRewards before the unstake." },
              { q: "What happens to my rewards when I unstake?",
                a: "Rewards are snapshotted into accruedRewards first, so they're never lost. You can claim them with claimRewards() even after fully unstaking." },
              { q: "What is the reward reserve and what happens if it runs out?",
                a: "The owner pre-funds a native RITUAL reserve for reward payouts. If it's insufficient when you claim, the transaction will revert with 'reserve low — owner must fundRewardReserve()'. The owner can top it up at any time." },
              { q: "How does the AI Advisor work?",
                a: "Calling requestAIAdvisory() submits your staking data (amount, duration, APY) to the Ritual Infernet precompile at 0x080C. Off-chain Infernet nodes process the request using the inferstake-advisor-v1 model and return a personalised recommendation." },
              { q: "Can the owner change the APY?",
                a: "Yes. The owner can call setAPY(newApyBps) to update the APY (max 10,000 bps = 100%). APY changes apply to future accrual only — already-earned rewards are always preserved." },
              { q: "Is the contract audited?",
                a: "InferStake is currently on Ritual testnet and has not been formally audited. Use at your own risk on testnet. An audit is recommended before any mainnet deployment." },
            ].map((item, i) => {
              const [open, setOpen] = useState(false);
              return (
                <div className="faq-item" key={i}>
                  <button className="faq-q" onClick={() => setOpen(!open)}>
                    {item.q}
                    <span className={`faq-icon ${open ? "open" : ""}`}>+</span>
                  </button>
                  {open && <div className="faq-a">{item.a}</div>}
                </div>
              );
            })}
          </Section>

        </main>
      </div>
    </>
  );
}
