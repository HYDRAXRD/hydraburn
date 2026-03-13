import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadixDappToolkit,
  DataRequestBuilder,
  RadixNetwork,
} from "@radixdlt/radix-dapp-toolkit";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import EmberParticles from "@/components/EmberParticles";

const HYDRA_RESOURCE =
  "resource_rdx1t4kc2yjdcqprwu70tahua3p8uwvjej9q3rktpxdr8p5pmcp4almd6r";
const DAPP_ACCOUNT =
  "account_rdx128thzxyzcsts99j7cudr492tg0r2wwdx32ay5qafa4r524mp0k0p8y";
const HYDRA_LOGO = "https://arweave.net/dYJSMjZlaoVSttypbD46PJumutb0Nb-x1Zz8e7PdqA0";
const POLL_INTERVAL = 15000;

type BurnPhase = "idle" | "awaiting_wallet" | "success_anim";

const EMBER_COLORS = [
  "#ff4500", "#ff6a00", "#ff8c00", "#ffb300", "#fff176", "#ff3d00",
];

const SOCIAL_LINKS = [
  { href: "https://x.com/HYDRAXRD", label: "X", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  )},
  { href: "https://t.me/hydraxrd", label: "Telegram", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
  )},
  { href: "https://youtube.com/@hydraxrd", label: "YouTube", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[1.6]" fill="none">
      <polygon points="10 9 10 15 15 12 10 9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21,15.8a3,3,0,0,1-2.76,3c-1.49.11-3.56.21-6.24.21s-4.75-.1-6.24-.21A3,3,0,0,1,3,15.8V8.2a3,3,0,0,1,2.76-3C7.25,5.1,9.32,5,12,5s4.75.1,6.24.21A3,3,0,0,1,21,8.2Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: "https://instagram.com/hydraxrd", label: "Instagram", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17.34,5.46h0a1.2,1.2,0,1,0,1.2,1.2A1.2,1.2,0,0,0,17.34,5.46Zm4.6,2.42a7.59,7.59,0,0,0-.46-2.43,4.94,4.94,0,0,0-1.16-1.77,4.7,4.7,0,0,0-1.77-1.15,7.3,7.3,0,0,0-2.43-.47C15.06,2,14.72,2,12,2s-3.06,0-4.12.06a7.3,7.3,0,0,0-2.43.47A4.78,4.78,0,0,0,3.68,3.68,4.7,4.7,0,0,0,2.53,5.45a7.3,7.3,0,0,0-.47,2.43C2,8.94,2,9.28,2,12s0,3.06.06,4.12a7.3,7.3,0,0,0,.47,2.43,4.7,4.7,0,0,0,1.15,1.77,4.78,4.78,0,0,0,1.77,1.15,7.3,7.3,0,0,0,2.43.47C8.94,22,9.28,22,12,22s3.06,0,4.12-.06a7.3,7.3,0,0,0,2.43-.47,4.7,4.7,0,0,0,1.77-1.15,4.85,4.85,0,0,0,1.16-1.77,7.59,7.59,0,0,0,.46-2.43c0-1.06.06-1.4.06-4.12S22,8.94,21.94,7.88ZM20.14,16a5.61,5.61,0,0,1-.34,1.86,3.06,3.06,0,0,1-.75,1.15,3.19,3.19,0,0,1-1.15.75,5.61,5.61,0,0,1-1.86.34c-1,.05-1.37.06-4,.06s-3,0-4-.06A5.73,5.73,0,0,1,6.1,19.8,3.27,3.27,0,0,1,5,19.05a3,3,0,0,1-.74-1.15A5.54,5.54,0,0,1,3.86,16c0-1-.06-1.37-.06-4s0-3,.06-4A5.54,5.54,0,0,1,4.21,6.1,3,3,0,0,1,5,5,3.14,3.14,0,0,1,6.1,4.2,5.73,5.73,0,0,1,8,3.86c1,0,1.37-.06,4-.06s3,0,4,.06a5.61,5.61,0,0,1,1.86.34A3.06,3.06,0,0,1,19.05,5,3.06,3.06,0,0,1,19.8,6.1,5.61,5.61,0,0,1,20.14,8c.05,1,.06,1.37.06,4S20.19,15,20.14,16ZM12,6.87A5.13,5.13,0,1,0,17.14,12,5.12,5.12,0,0,0,12,6.87Zm0,8.46A3.33,3.33,0,1,1,15.33,12,3.33,3.33,0,0,1,12,15.33Z"/>
    </svg>
  )},
  { href: "https://tiktok.com/@hydraxrd", label: "TikTok", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[1.2]" fill="none">
      <path d="M21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8Z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 12C8.34315 12 7 13.3431 7 15C7 16.6569 8.34315 18 10 18C11.6569 18 13 16.6569 13 15V6C13.3333 7 14.6 9 17 9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: "https://www.pinterest.com/hydraxrd", label: "Pinterest", icon: (
    <svg viewBox="-2 -2 24 24" className="w-4 h-4 fill-current" preserveAspectRatio="xMinYMin">
      <path d="M9.355 11.614C9.1 12.99 8.79 14.31 7.866 15c-.284-2.08.419-3.644.745-5.303-.556-.964.067-2.906 1.24-2.427 1.445.588-1.25 3.586.56 3.96 1.888.392 2.66-3.374 1.488-4.6-1.692-1.768-4.927-.04-4.529 2.492.097.62.718.807.248 1.661-1.083-.247-1.406-1.127-1.365-2.3.067-1.92 1.675-3.263 3.289-3.45 2.04-.235 3.954.772 4.219 2.748.297 2.23-.921 4.646-3.103 4.472-.59-.047-.84-.35-1.303-.64z"/>
      <path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0-2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z"/>
    </svg>
  )},
  { href: "https://hydraxrd.com", label: "Website", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[1.5]" fill="none">
      <rect x="3" y="4" width="18" height="12" rx="1"/>
      <rect x="10" y="16" width="5" height="4.5"/>
      <line x1="8.5" y1="9.5" x2="10.5" y2="9.5"/>
      <line x1="4.5" y1="16.5" x2="14.5" y2="16.5"/>
    </svg>
  )},
  { href: "https://hydraxrd.com/bubbles", label: "Bubbles", icon: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[1.4]" fill="none">
      <circle cx="16" cy="16" r="5"/>
      <path d="M16 13c.7 0 1.4.35 1.8.9"/>
      <circle cx="7" cy="7" r="3"/>
      <circle cx="4" cy="15" r="2.5"/>
      <line x1="13" y1="2" x2="13" y2="5"/>
      <line x1="18" y1="8" x2="15" y2="8"/>
      <line x1="16.5" y1="4" x2="14.5" y2="6"/>
    </svg>
  )},
];

/* ─── Overlay de sucesso ─────────────────────────────── */
function BurnSuccessOverlay({
  amount,
  onDone,
}: {
  amount: number;
  onDone: () => void;
}) {
  const [tick, setTick] = useState(false);

  const [embers] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      color: EMBER_COLORS[i % EMBER_COLORS.length],
      size: Math.random() * 10 + 5,
      x: Math.random() * 340 - 170,
      delay: Math.random() * 0.4,
      dur: 0.7 + Math.random() * 0.5,
    }))
  );

  useEffect(() => {
    const t1 = setTimeout(() => setTick(true), 80);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={onDone}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {embers.map((e) => (
          <span
            key={e.id}
            className="anim-ember-burst block absolute rounded-full"
            style={{
              left: `calc(50% + ${e.x}px)`,
              bottom: "40%",
              width: e.size,
              height: e.size,
              background: e.color,
              boxShadow: `0 0 ${e.size * 2}px ${e.color}`,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 0.15, 0.3].map((delay, i) => (
          <div
            key={i}
            className="anim-ring-pulse absolute rounded-full border-2 border-orange-500"
            style={{ width: 180, height: 180, marginLeft: -90, marginTop: -90, animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      <div
        className={`relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-orange-500/40 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10 shadow-[0_0_60px_hsla(16,100%,45%,0.35)] ${tick ? "anim-pop-in" : "opacity-0 scale-50"}`}
        style={{ minWidth: 280 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDone}
          className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close"
        >✕</button>

        <div className="relative flex items-center justify-center">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(0 0% 20%)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="50" fill="none" stroke="#ff4500" strokeWidth="6"
              strokeLinecap="round" strokeDasharray="314" strokeDashoffset="314"
              className={tick ? "anim-progress-fill" : ""}
              style={{ animationDuration: "2000ms" }}
            />
          </svg>
          <img
            src={HYDRA_LOGO} alt="Hydra"
            className={`absolute w-14 h-14 rounded-full object-cover ${tick ? "anim-shake" : ""}`}
            style={{ animationDelay: "0.1s" }}
          />
        </div>

        <p className="font-mono text-xl font-black tracking-tight text-orange-500">BURNED!</p>
        <p className="font-mono text-2xl font-bold text-white tabular-nums">
          {amount.toLocaleString("en-US")}
          <span className="ml-2 text-sm text-zinc-400">HYDR</span>
        </p>
        <p className="font-mono text-xs text-zinc-500">Tap anywhere to close</p>
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────── */
const Index = () => {
  const [connected, setConnected] = useState(false);
  const [accountAddress, setAccountAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [burnAmount, setBurnAmount] = useState(0);
  const [sliderValue, setSliderValue] = useState([0]);
  const [burning, setBurning] = useState(false);
  const [burnPhase, setBurnPhase] = useState<BurnPhase>("idle");
  const [burnedAmount, setBurnedAmount] = useState(0);
  const [totalBurned, setTotalBurned] = useState<number | null>(null);
  const rdtRef = useRef<RadixDappToolkit | null>(null);

  const resetBurnUi = useCallback(() => {
    setBurnPhase("idle");
    setBurning(false);
    setBurnedAmount(0);
    setBurnAmount(0);
    setSliderValue([0]);
  }, []);

  const fetchTotalBurned = async () => {
    try {
      const res = await fetch("https://mainnet.radixdlt.com/state/entity/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: [HYDRA_RESOURCE], aggregation_level: "Global" }),
      });
      const data = await res.json();
      const details = data?.items?.[0]?.details;
      if (details) {
        const minted = parseFloat(details.total_minted || "0");
        const supply = parseFloat(details.total_supply || "0");
        setTotalBurned(Math.floor(minted - supply));
      }
    } catch {
      setTotalBurned(null);
    }
  };

  const fetchBalance = async (address: string) => {
    try {
      const res = await fetch("https://mainnet.radixdlt.com/state/entity/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: [address],
          aggregation_level: "Vault",
          opt_ins: { explicit_metadata: [] },
        }),
      });
      const data = await res.json();
      const items = data?.items?.[0]?.fungible_resources?.items || [];
      const hydra = items.find((i: any) => i.resource_address === HYDRA_RESOURCE);
      setBalance(hydra ? Math.floor(parseFloat(hydra.vaults?.items?.[0]?.amount || "0")) : 0);
    } catch {
      setBalance(0);
    }
  };

  useEffect(() => {
    fetchTotalBurned();
    const interval = setInterval(fetchTotalBurned, POLL_INTERVAL);

    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: DAPP_ACCOUNT,
      networkId: RadixNetwork.Mainnet,
      applicationName: "HYDRA Burn",
      applicationVersion: "1.0.0",
    });
    rdtRef.current = rdt;
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().exactly(1));

    const sub = rdt.walletApi.walletData$.subscribe((walletData) => {
      if (walletData.accounts.length > 0) {
        const addr = walletData.accounts[0].address;
        setAccountAddress(addr);
        setConnected(true);
        fetchBalance(addr);
      } else {
        setConnected(false);
        setAccountAddress("");
        setBalance(null);
        resetBurnUi();
      }
    });

    return () => {
      clearInterval(interval);
      sub.unsubscribe();
      rdt.destroy();
    };
  }, [resetBurnUi]);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setSliderValue(value);
      setBurnAmount(balance && balance > 0 ? Math.floor((value[0] / 100) * balance) : 0);
    },
    [balance]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const clamped = Math.min(Math.max(val, 0), balance || 0);
    setBurnAmount(clamped);
    setSliderValue(balance && balance > 0 ? [(clamped / balance) * 100] : [0]);
  };

  const handleAll = () => {
    if (balance && balance > 0) {
      setBurnAmount(balance);
      setSliderValue([100]);
    }
  };

  const handleBurn = async () => {
    if (!rdtRef.current || burnAmount <= 0 || !accountAddress) return;
    setBurning(true);
    setBurnPhase("awaiting_wallet");
    const amount = burnAmount;

    const manifest = `
CALL_METHOD
    Address("${accountAddress}")
    "withdraw"
    Address("${HYDRA_RESOURCE}")
    Decimal("${amount}")
;
TAKE_ALL_FROM_WORKTOP
    Address("${HYDRA_RESOURCE}")
    Bucket("bucket1")
;
BURN_RESOURCE
    Bucket("bucket1")
;`.trim();

    try {
      const result = await rdtRef.current.walletApi.sendTransaction({ transactionManifest: manifest });
      console.log("Burn result:", result);
      setBurnedAmount(amount);
      setBurnPhase("success_anim");
      setBurning(false);
      fetchBalance(accountAddress);
      setTimeout(fetchTotalBurned, 3000);
    } catch (err) {
      console.error("Burn failed:", err);
      setBurnPhase("idle");
      setBurning(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      {burnPhase === "success_anim" && (
        <BurnSuccessOverlay amount={burnedAmount} onDone={resetBurnUi} />
      )}

      <EmberParticles />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsla(16,100%,50%,0.06)_0%,_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_50%,_hsl(var(--background))_100%)]" />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src={HYDRA_LOGO} alt="Hydra" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-mono text-lg font-bold text-primary tracking-tight">HYDRA</span>
          <span className="rounded bg-burn/20 px-2 py-0.5 font-mono text-[10px] font-bold text-burn uppercase tracking-widest">Burn</span>
        </div>
        <div>
          {/* @ts-ignore */}
          <radix-connect-button />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="mb-10 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Total HYDR Burned
          </p>
          <div className="relative">
            <h1 className="font-mono text-5xl font-black tracking-tight text-burn tabular-nums sm:text-7xl">
              {totalBurned !== null ? totalBurned.toLocaleString("en-US") : "···"}
            </h1>
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-burn/5 blur-2xl" />
          </div>
          <p className="mt-3 text-sm tracking-wide text-foreground/60">tokens permanently destroyed</p>
        </div>

        <div className="w-full max-w-md">
          {!connected ? (
            <div className="space-y-4 rounded-xl border border-border/50 bg-card/60 p-8 text-center backdrop-blur-sm">
              <img src={HYDRA_LOGO} alt="Hydra" className="w-12 h-12 rounded-full object-cover mx-auto animate-pulse-burn" />
              <p className="font-mono text-sm tracking-wide text-muted-foreground">
                Connect your wallet to burn HYDR tokens
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-border bg-card p-4 transition-all focus-within:border-burn/40 focus-within:shadow-[0_0_20px_hsla(16,100%,50%,0.1)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Burn amount</span>
                  <button
                    onClick={() => fetchBalance(accountAddress)}
                    className="font-mono text-xs text-muted-foreground transition-colors hover:text-burn"
                    title="Refresh balance"
                  >
                    Balance: {balance !== null ? balance.toLocaleString("en-US") : "..."} HYDR ↻
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img src={HYDRA_LOGO} alt="Hydra" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <input
                    type="number"
                    value={burnAmount || ""}
                    onChange={handleInputChange}
                    placeholder="0"
                    min={0}
                    max={balance || 0}
                    disabled={burning}
                    className="flex-1 bg-transparent font-mono text-2xl text-primary outline-none placeholder:text-muted-foreground disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="font-mono text-sm text-foreground">HYDR</span>
                  <button
                    onClick={handleAll}
                    disabled={burning}
                    className="rounded bg-burn/20 px-3 py-1 font-mono text-xs font-bold text-burn transition-colors hover:bg-burn/30 disabled:opacity-50"
                  >MAX</button>
                </div>
              </div>

              <Slider
                value={sliderValue}
                onValueChange={handleSliderChange}
                max={100}
                step={1}
                disabled={burning}
                className="py-2"
              />

              <p className="text-center font-mono text-xs text-muted-foreground">
                {sliderValue[0].toFixed(0)}% of balance
              </p>

              {burnPhase === "awaiting_wallet" && (
                <div className="animate-fade-in rounded-xl border border-burn/30 bg-burn/10 p-4 text-center">
                  <img src={HYDRA_LOGO} alt="Hydra" className="w-8 h-8 rounded-full object-cover mx-auto mb-2 animate-pulse" />
                  <p className="font-mono text-sm text-burn">Check your Radix Wallet and approve the burn</p>
                </div>
              )}

              <Button
                variant="burn"
                size="lg"
                className="w-full text-base"
                disabled={burnAmount <= 0 || burning}
                onClick={handleBurn}
              >
                {burnPhase === "awaiting_wallet" ? "AWAITING WALLET..." : "BURN"}
              </Button>

              {burnAmount > 0 && burnPhase === "idle" && (
                <p className="animate-fade-in text-center font-mono text-xs text-muted-foreground">
                  {burnAmount.toLocaleString("en-US")} HYDR will be permanently destroyed
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé com redes sociais */}
      <div className="relative z-20 flex items-center justify-center gap-4 px-6 py-5 border-t border-border/30">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className="text-muted-foreground hover:text-burn transition-colors duration-200"
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
};

export default Index;
