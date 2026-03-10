import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadixDappToolkit,
  DataRequestBuilder,
  RadixNetwork,
} from "@radixdlt/radix-dapp-toolkit";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import BurnComplete from "@/components/BurnComplete";
import EmberParticles from "@/components/EmberParticles";

const HYDRA_RESOURCE =
  "resource_rdx1t4kc2yjdcqprwu70tahua3p8uwvjej9q3rktpxdr8p5pmcp4almd6r";

const Index = () => {
  const [connected, setConnected] = useState(false);
  const [accountAddress, setAccountAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [burnAmount, setBurnAmount] = useState(0);
  const [sliderValue, setSliderValue] = useState([0]);
  const [burning, setBurning] = useState(false);
  const [burned, setBurned] = useState(false);
  const [burnedAmount, setBurnedAmount] = useState(0);
  const rdtRef = useRef<RadixDappToolkit | null>(null);

  useEffect(() => {
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress:
        "account_rdx12yvhjq3j3xjnrjap789gra47eh8p4av5ygx23rgch74sdndr0d2qdu",
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
      }
    });

    return () => {
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
        const amount = parseFloat(
          hydra.vaults?.items?.[0]?.amount || "0"
        );
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
      if (balance) {
        setBurnAmount(Math.floor((value[0] / 100) * balance));
      }
    },
    [balance]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const clamped = Math.min(val, balance || 0);
    setBurnAmount(clamped);
    if (balance && balance > 0) {
      setSliderValue([(clamped / balance) * 100]);
    }
  };

  const handleAll = () => {
    if (balance) {
      setBurnAmount(balance);
      setSliderValue([100]);
    }
  };

  const handleBurn = async () => {
    if (!rdtRef.current || burnAmount <= 0 || !accountAddress) return;
    setBurning(true);

    const manifest = `
CALL_METHOD
    Address("${accountAddress}")
    "withdraw"
    Address("${HYDRA_RESOURCE}")
    Decimal("${burnAmount}")
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
        setBurnedAmount(burnAmount);
        setBurned(true);
      }
    } catch (err) {
      console.error("Burn transaction failed:", err);
    } finally {
      setBurning(false);
    }
  };

  if (burned) {
    return <BurnComplete amount={burnedAmount} />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Ambient ember particles */}
      <EmberParticles />

      {/* Radial glow from bottom */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsla(16,100%,50%,0.06)_0%,_transparent_60%)]" />

      {/* Subtle top vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_50%,_hsl(var(--background))_100%)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Fire icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <span className="text-5xl block animate-pulse-burn rounded-full">🔥</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="font-mono text-4xl font-bold text-primary tracking-tight">
            $HYDR
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-burn/40" />
          <p className="mt-3 text-sm text-foreground tracking-wide">
            Burn your tokens and permanently reduce total supply
          </p>
        </div>

        {!connected ? (
          <div className="space-y-8">
            <div className="flex justify-center">
              {/* @ts-ignore */}
              <radix-connect-button />
            </div>
            <p className="text-center font-mono text-xs text-muted-foreground tracking-wider uppercase">
              Connect your wallet to begin the ritual
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Balance */}
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-foreground">Your coins</span>
              <button
                onClick={() => fetchBalance(accountAddress)}
                className="flex items-center gap-2 text-primary transition-colors hover:text-foreground"
              >
                <span>
                  {balance !== null
                    ? balance.toLocaleString("en-US")
                    : "..."}
                </span>
                <span className="text-foreground">↻</span>
              </button>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 rounded border border-border bg-card p-4 transition-all focus-within:border-burn/40 focus-within:shadow-[0_0_20px_hsla(16,100%,50%,0.1)]">
              <span className="text-burn text-lg">🔥</span>
              <input
                type="number"
                value={burnAmount || ""}
                onChange={handleInputChange}
                placeholder="0"
                className="flex-1 bg-transparent font-mono text-2xl text-primary outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="font-mono text-sm text-foreground">
                HYDR
              </span>
              <button
                onClick={handleAll}
                className="rounded bg-burn/20 px-3 py-1 font-mono text-xs font-bold text-burn transition-colors hover:bg-burn/30"
              >
                ALL
              </button>
            </div>

            {/* Slider */}
            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              max={100}
              step={1}
              className="py-2"
            />

            {/* Burn Button */}
            <Button
              variant="burn"
              size="lg"
              className="w-full text-base"
              disabled={burnAmount <= 0 || burning}
              onClick={handleBurn}
            >
              {burning ? "AWAITING WALLET..." : "BURN"}
            </Button>

            {burnAmount > 0 && (
              <p className="text-center font-mono text-xs text-muted-foreground animate-fade-in">
                {burnAmount.toLocaleString("en-US")} HYDR will be permanently destroyed
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
