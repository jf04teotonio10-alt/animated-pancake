import { useMemo } from 'react';
import { MAPS } from '../game/data/maps';
import { buildLayout } from '../game/engine/layout';
import { renderMapArt } from '../game/art/mapArt';
import type { SaveData } from '../game/systems/save';
import { Title } from './common';

const previews = new Map<string, string>();
function preview(id: string) {
  if (!previews.has(id)) {
    const m = MAPS.find(m => m.id === id)!;
    previews.set(id, renderMapArt(m, buildLayout(m)).bg.toDataURL());
  }
  return previews.get(id)!;
}

export default function MapSelect({ save, onPick, onBack }: { save: SaveData; onPick: (id: string) => void; onBack: () => void }) {
  const imgs = useMemo(() => MAPS.map(m => preview(m.id)), []);
  return (
    <div className="w-full h-full overflow-y-auto scanlines relative bg-[#07050f]">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title>// SELEÇÃO DE DISTRITO</Title>
            <div className="text-white/50">Escolha o setor da cidade para defender. Cada mapa altera a estratégia de posicionamento.</div>
          </div>
          <button className="btn btn-m" onClick={onBack}>◀ VOLTAR</button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MAPS.map((m, i) => (
            <button key={m.id} onClick={() => onPick(m.id)} className="panel text-left p-3 group hover:scale-[1.02] transition pop" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="relative overflow-hidden border border-white/10">
                <img src={imgs[i]} className="w-full pixelated group-hover:brightness-125 transition" alt={m.name} />
                <div className="absolute top-1 right-1 font-pixel text-[8px] px-2 py-1 bg-black/80" style={{ color: m.palette.neonA }}>
                  {'★'.repeat(Math.round((m.difficulty - 0.9) * 6))}
                </div>
                {save.wins[m.id] ? <div className="absolute top-1 left-1 font-pixel text-[8px] px-2 py-1 bg-black/80 neon-y">✓ CONQUISTADO</div> : null}
              </div>
              <div className="font-pixel text-[11px] mt-3" style={{ color: m.palette.neonA, textShadow: `0 0 6px ${m.palette.neonA}` }}>{m.name}</div>
              <div className="text-white/70">{m.subtitle}</div>
              <div className="text-white/50 text-base leading-tight mt-1">{m.desc}</div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="neon-c">ROTAS: {m.paths.length}</span>
                <span className="text-white/60">VIDA INIMIGA x{m.difficulty.toFixed(2)}</span>
                <span className="neon-y">RECORDE: {save.best[m.id] ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
