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
const SUCCESS_ANIMATION_DURATION = 2600;

type BurnPhase = "idle" | "awaiting_wallet" | "success_anim";

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
  const resetTimeoutRef = useRef<number | null>(null);

  const clearResetTimeout = () => {
    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  };

  const resetBurnUi = () => {
    setBurnPhase("idle");
    setBurning(false);
    setBurnedAmount(0);
    setBurnAmount(0);
    setSliderValue([0]);
  };

  const fetchTotalBurned = async () => {
    try {
      const response = await fetch(
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
      const data = await response.json();
      const details = data?.items?.[0]?.details;

      if (details) {
        const totalMinted = parseFloat(details.total_minted || "0");
        const totalSupply = parseFloat(details.total_supply || "0");
        setTotalBurned(Math.floor(totalMinted - totalSupply));
      }
    } catch {
      setTotalBurned(null);
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

    rdt.walletApi.setRequestData(
      DataRequestBuilder.accounts().exactly(1)
    );

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
      clearResetTimeout();
      sub.unsubscribe();
      rdt.destroy();
    };
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(
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

      const data = await response.json();
      const items = data?.items?.[0]?.fungible_resources?.items || [];
      const hydra = items.find(
        (item: any) => item.resource_address === HYDRA_RESOURCE
      );

      if (hydra) {
        const amount = parseFloat(hydra.vaults?.items?.[0]?.amount || "0");
        setBalance(Math.floor(amount));
      } else {
        setBalance(0);
      }
    } catch {
      setBalance(0);
    }
  };

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setSliderValue(value);
      if (balance && balance > 0) {
        setBurnAmount(Math.floor((value[0] / 100) * balance));
      } else {
        setBurnAmount(0);
      }
    },
    [balance]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const clamped = Math.min(Math.max(val, 0), balance || 0);
    setBurnAmount(clamped);

    if (balance && balance > 0) {
      setSliderValue([(clamped / balance) * 100]);
    } else {
      setSliderValue([0]);
    }
  };

  const handleAll = () => {
    if (balance && balance > 0) {
      setBurnAmount(balance);
      setSliderValue([100]);
    }
  };

  const handleBurn = async () => {
    if (!rdtRef.current || burnAmount <= 0 || !accountAddress) return;

    clearResetTimeout();
    setBurning(true);
    setBurnPhase("awaiting_wallet");

    const currentBurnAmount = burnAmount;

    const manifest = `
CALL_METHOD
    Address("${accountAddress}")
    "withdraw"
    Address("${HYDRA_RESOURCE}")
    Decimal("${currentBurnAmount}")
;

TAKE_ALL_FROM_WORKTOP
    Address("${HYDRA_RESOURCE}")
    Bucket("bucket1")
;

BURN_RESOURCE
    Bucket("bucket1")
;
    `.trim();

    try {
      const result = await rdtRef.current.walletApi.sendTransaction({
        transactionManifest: manifest,
      });

      if (result.isOk()) {
        setBurnedAmount(currentBurnAmount);
        setBurnPhase("success_anim");
        setBurning(false);

        await fetchBalance(accountAddress);
        setTimeout(fetchTotalBurned, 3000);

        resetTimeoutRef.current = window.setTimeout(() => {
          resetBurnUi();
        }, SUCCESS_ANIMATION_DURATION);
      } else {
        setBurnPhase("idle");
        setBurning(false);
      }
    } catch (err) {
      console.error("Burn transaction failed:", err);
      setBurnPhase("idle");
      setBurning(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      <EmberParticles />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsla(16,100%,50%,0.06)_0%,_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_50%,_hsl(var(--background))_100%)]" />

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

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">
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
                    Balance: {balance !== null ? balance.toLocaleString("en-US") : "..."} HYDR ↻
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
                    className="flex-1 bg-transparent font-mono text-2xl text-primary outline-none placeholder:text-muted-foreground disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                <div className="rounded-xl border border-burn/30 bg-burn/10 p-4 text-center animate-fade-in">
                  <div className="mb-2 text-3xl animate-pulse">🔥</div>
                  <p className="font-mono text-sm text-burn">
                    Check your wallet and approve the burn
                  </p>
                </div>
              )}

              {burnPhase === "success_anim" && (
                <div className="rounded-xl border border-burn/40 bg-gradient-to-br from-burn/20 via-burn/10 to-transparent p-5 text-center animate-fade-in">
                  <div className="mb-3 text-5xl animate-pulse">🔥</div>
                  <p className="font-mono text-lg font-bold text-burn">
                    Burn completed
                  </p>
                  <p className="mt-2 font-mono text-sm text-foreground">
                    {burnedAmount.toLocaleString("en-US")} HYDR destroyed
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Returning to burn screen...
                  </p>
                </div>
              )}

              <Button
                variant="burn"
                size="lg"
                className="w-full text-base"
                disabled={burnAmount <= 0 || burning}
                onClick={handleBurn}
              >
                {burnPhase === "awaiting_wallet"
                  ? "AWAITING WALLET..."
                  : burnPhase === "success_anim"
                  ? "BURN COMPLETE"
                  : "BURN"}
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
    </div>
  );
};

export default Index;
