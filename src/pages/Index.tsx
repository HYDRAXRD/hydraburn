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

const POLL_INTERVAL = 15000;
const SUCCESS_DURATION = 2000;

type BurnPhase = "idle" | "awaiting_wallet" | "success_anim";

const EMBER_COLORS = [
  "#ff4500", "#ff6a00", "#ff8c00", "#ffb300", "#fff176", "#ff3d00",
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
    const t2 = setTimeout(onDone, SUCCESS_DURATION);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">

      {/* Brasas explodindo */}
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

      {/* Anéis pulsantes */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 0.15, 0.3].map((delay, i) => (
          <div
            key={i}
            className="anim-ring-pulse absolute rounded-full border-2 border-orange-500"
            style={{
              width: 180,
              height: 180,
              marginLeft: -90,
              marginTop: -90,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>

      {/* Card central */}
      <div
        className={`relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-orange-500/40 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10 shadow-[0_0_60px_hsla(16,100%,45%,0.35)] ${
          tick ? "anim-pop-in" : "opacity-0 scale-50"
        }`}
        style={{ minWidth: 280 }}
      >
        {/* Círculo de progresso SVG */}
        <div className="relative flex items-center justify-center">
          <svg width="120" height="120" className="-rotate-90">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(0 0% 20%)"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#ff4500"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="314"
              strokeDashoffset="314"
              className={tick ? "anim-progress-fill" : ""}
              style={{ animationDuration: `${SUCCESS_DURATION}ms` }}
            />
          </svg>

          <span
            className={`absolute text-5xl ${tick ? "anim-shake" : ""}`}
            style={{ animationDelay: "0.1s" }}
          >
            🔥
          </span>
        </div>

        <p className="font-mono text-xl font-black tracking-tight text-orange-500">
          BURNED!
        </p>

        <p className="font-mono text-2xl font-bold text-white tabular-nums">
          {amount.toLocaleString("en-US")}
          <span className="ml-2 text-sm text-zinc-400">HYDR</span>
        </p>

        <p
          className={`font-mono text-xs text-zinc-500 ${tick ? "anim-countdown" : ""}`}
          style={{ animationDuration: `${SUCCESS_DURATION}ms` }}
        >
          Returning to burn screen...
        </p>
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
      const res = await fetch(
        "https://mainnet.radixdlt.com/state/entity/details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: [HYDRA_RESOURCE],
            aggregation_level: "Global",
          }),
        }
      );
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
      const res = await fetch(
        "https://mainnet.radixdlt.com/state/entity/details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: [address],
            aggregation_level: "Vault",
            opt_ins: { explicit_metadata: [] },
          }),
        }
      );
      const data = await res.json();
      const items = data?.items?.[0]?.fungible_resources?.items || [];
      const hydra = items.find(
        (i: any) => i.resource_address === HYDRA_RESOURCE
      );
      setBalance(
        hydra
          ? Math.floor(parseFloat(hydra.vaults?.items?.[0]?.amount || "0"))
          : 0
      );
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
      setBurnAmount(
        balance && balance > 0
          ? Math.floor((value[0] / 100) * balance)
          : 0
      );
    },
    [balance]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const clamped = Math.min(Math.max(val, 0), balance || 0);
    setBurnAmount(clamped);
    setSliderValue(
      balance && balance > 0 ? [(clamped / balance) * 100] : [0]
    );
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
      const result = await rdtRef.current.walletApi.sendTransaction({
        transactionManifest: manifest,
      });

      if (result.isOk()) {
        setBurnedAmount(amount);
        setBurnPhase("success_anim");
        setBurning(false);
        fetchBalance(accountAddress);
        setTimeout(fetchTotalBurned, 3000);
      } else {
        setBurnPhase("idle");
        setBurning(false);
      }
    } catch (err) {
      console.error("Burn failed:", err);
      setBurnPhase("idle");
      setBurning(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">

      {/* Overlay de animação de sucesso */}
      {burnPhase === "success_anim" && (
        <BurnSuccessOverlay amount={burnedAmount} onDone={resetBurnUi} />
      )}

      <EmberParticles />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsla(16,100%,50%,0.06)_0%,_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_50%,_hsl(var(--background))_100%)]" />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-mono text-lg font-bold text-primary tracking-tight">
            HYDRA
          </span>
          <span className="rounded bg-burn/20 px-2 py-0.5 font-mono text-[10px] font-bold text-burn uppercase tracking-widest">
            Burn
          </span>
        </div>
        <div>
          {/* @ts-ignore */}
          <radix-connect-button />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">

        {/* Total queimado */}
        <div className="mb-10 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Total HYDR Burned
          </p>
          <div className="relative">
            <h1 className="font-mono text-5xl font-black tracking-tight text-burn tabular-nums sm:text-7xl">
              {totalBurned !== null
                ? totalBurned.toLocaleString("en-US")
                : "···"}
            </h1>
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-burn/5 blur-2xl" />
          </div>
          <p className="mt-3 text-sm tracking-wide text-foreground/60">
            tokens permanently destroyed
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          {!connected ? (
            <div className="space-y-4 rounded-xl border border-border/50 bg-card/60 p-8 text-center backdrop-blur-sm">
              <span className="block animate-pulse-burn text-4xl">🔥</span>
              <p className="font-mono text-sm tracking-wide text-muted-foreground">
                Connect your wallet to burn HYDR tokens
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">

              {/* Input de amount */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all focus-within:border-burn/40 focus-within:shadow-[0_0_20px_hsla(16,100%,50%,0.1)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Burn amount
                  </span>
                  <button
                    onClick={() => fetchBalance(accountAddress)}
                    className="font-mono text-xs text-muted-foreground transition-colors hover:text-burn"
                    title="Refresh balance"
                  >
                    Balance:{" "}
                    {balance !== null
                      ? balance.toLocaleString("en-US")
                      : "..."}{" "}
                    HYDR ↻
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg text-burn">🔥</span>
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
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Slider */}
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

              {/* Aviso aguardando carteira */}
              {burnPhase === "awaiting_wallet" && (
                <div className="animate-fade-in rounded-xl border border-burn/30 bg-burn/10 p-4 text-center">
                  <div className="mb-1 animate-pulse text-2xl">🔥</div>
                  <p className="font-mono text-sm text-burn">
                    Check your Radix Wallet and approve the burn
                  </p>
                </div>
              )}

              {/* Botão burn */}
              <Button
                variant="burn"
                size="lg"
                className="w-full text-base"
                disabled={burnAmount <= 0 || burning}
                onClick={handleBurn}
              >
                {burnPhase === "awaiting_wallet"
                  ? "AWAITING WALLET..."
                  : "BURN"}
              </Button>

              {burnAmount > 0 && burnPhase === "idle" && (
                <p className="animate-fade-in text-center font-mono text-xs text-muted-foreground">
                  {burnAmount.toLocaleString("en-US")} HYDR will be permanently
                  destroyed
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
