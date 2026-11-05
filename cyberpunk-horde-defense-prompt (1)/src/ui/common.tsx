import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-pixel text-[11px] tracking-widest neon-c ${className}`}>{children}</h2>;
}

export function Bar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex items-center gap-2 text-sm leading-none">
      {label && <span className="w-12 text-white/60">{label}</span>}
      <div className="flex-1 h-2 bg-black/60 border border-white/10">
        <div className="h-full" style={{ width: `${pct * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
}

// Animated cyberpunk skyline backdrop for menus
export function CityBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    const W = 320, H = 180; c.width = W; c.height = H;
    const layers = [0, 1, 2].map(l => {
      const bs: { x: number; w: number; h: number; win: number[]; sign?: string }[] = [];
      let x = 0;
      while (x < W * 2) {
        const w = 14 + Math.random() * (20 + l * 8), h = 40 + Math.random() * (60 + l * 30);
        bs.push({ x, w, h, win: Array.from({ length: 40 }, () => Math.random()), sign: Math.random() < 0.3 ? ['#ff2bd6', '#00fff0', '#fcee0a'][Math.floor(Math.random() * 3)] : undefined });
        x += w + Math.random() * 6;
      }
      return bs;
    });
    const drops = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 120 + Math.random() * 80 }));
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#07030f'); g.addColorStop(0.6, '#2a0a3a'); g.addColorStop(1, '#ff2bd655');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // sun
      ctx.fillStyle = '#ff2bd6'; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(W * 0.7, H * 0.62, 40, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { ctx.fillStyle = '#07030f'; ctx.fillRect(W * 0.7 - 42, H * 0.62 + i * 6 - 4, 84, 1 + i * 0.6); }
      layers.forEach((bs, l) => {
        const sp = (l + 1) * 4;
        const shadeC = ['#120820', '#0c0618', '#05030a'][l];
        for (const b of bs) {
          const x = Math.round(((b.x - t * sp) % (W * 2) + W * 2) % (W * 2) - 40);
          if (x > W) continue;
          const y = H - b.h + l * 10;
          ctx.fillStyle = shadeC; ctx.fillRect(x, y, b.w, b.h);
          if (l > 0) for (let i = 0; i < b.win.length; i++) {
            const wx = x + 2 + (i % 4) * 4, wy = y + 4 + Math.floor(i / 4) * 6;
            if (wx > x + b.w - 3 || wy > H) continue;
            if (b.win[i] > 0.6) { ctx.fillStyle = b.win[i] > 0.9 ? '#00fff0aa' : '#fcd76a66'; ctx.fillRect(wx, wy, 2, 2); }
          }
          if (b.sign && l > 0) { const on = Math.sin(t * 4 + b.x) > -0.8; ctx.fillStyle = on ? b.sign : '#222'; ctx.fillRect(x + 2, y + 10, 2, 16); }
        }
      });
      ctx.strokeStyle = 'rgba(180,200,255,.25)'; ctx.beginPath();
      for (const d of drops) { const y = (d.y + t * d.s) % H, x = (d.x - t * 20 + W) % W; ctx.moveTo(x, y); ctx.lineTo(x - 1, y + 4); }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pixelated" />;
}
