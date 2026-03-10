import { useEffect, useRef } from "react";

const EMBER_COUNT = 25;

const EmberParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      life: number;
      maxLife: number;
    }

    const embers: Ember[] = [];

    const createEmber = (): Ember => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      size: Math.random() * 2 + 0.5,
      speedY: -(Math.random() * 0.8 + 0.2),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      life: 0,
      maxLife: Math.random() * 400 + 200,
    });

    for (let i = 0; i < EMBER_COUNT; i++) {
      const ember = createEmber();
      ember.y = Math.random() * canvas.height;
      ember.life = Math.random() * ember.maxLife;
      embers.push(ember);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.x += e.speedX;
        e.y += e.speedY;
        e.life++;

        const progress = e.life / e.maxLife;
        const alpha = e.opacity * (1 - progress);

        if (e.life >= e.maxLife || e.y < -10) {
          embers[i] = createEmber();
          continue;
        }

        // Warm color gradient from deep red to orange
        const r = 255;
        const g = Math.floor(40 + progress * 30);
        const b = 0;

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
};

export default EmberParticles;
