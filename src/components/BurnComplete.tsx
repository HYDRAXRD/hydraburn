import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  char: string;
}

const BurnComplete = ({ amount }: { amount: number }) => {
  const [phase, setPhase] = useState<"display" | "dissolve" | "void">("display");
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => {
      const amountStr = amount.toLocaleString("pt-BR");
      const chars = amountStr.split("");
      const newParticles: Particle[] = chars.map((char, i) => ({
        id: i,
        x: 50 + (i - chars.length / 2) * 2,
        delay: Math.random() * 1.5,
        char,
      }));
      setParticles(newParticles);
      setPhase("dissolve");
    }, 1500);

    const t2 = setTimeout(() => {
      setPhase("void");
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [amount]);

  if (phase === "void") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="h-5 w-[2px] bg-primary animate-cursor-blink" />
      </div>
    );
  }

  if (phase === "dissolve") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background overflow-hidden">
        <div className="relative">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute font-mono text-3xl font-bold text-primary animate-particle-fall"
              style={{
                left: `${p.x}%`,
                animationDelay: `${p.delay}s`,
              }}
            >
              {p.char}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="font-mono text-4xl font-bold text-primary">
          {amount.toLocaleString("pt-BR")}
        </p>
        <p className="mt-4 font-mono text-sm text-burn">HYDR QUEIMADOS</p>
      </div>
    </div>
  );
};

export default BurnComplete;
