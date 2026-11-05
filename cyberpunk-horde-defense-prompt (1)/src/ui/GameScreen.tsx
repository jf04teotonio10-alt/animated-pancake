import { useEffect, useReducer, useRef, useState } from 'react';
import { Game } from '../game/engine/Game';
import { render } from '../game/engine/render';
import { MAPS, W, H, TILE } from '../game/data/maps';
import type { SaveData } from '../game/systems/save';
import { audio } from '../game/systems/audio';
import { TopBar, Shop, TowerPanel, BossBar, BossIntro } from './GamePanels';

interface Props { mapId: string; save: SaveData; commit: (fn: (s: SaveData) => SaveData) => void; onExit: () => void }

export default function GameScreen({ mapId, save, commit, onExit }: Props) {
  const [game, setGame] = useState(() => new Game(MAPS.find(m => m.id === mapId)!, save));
  const [, force] = useReducer((x: number) => x + 1, 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const awarded = useRef(0);

  useEffect(() => game.subscribe(force), [game]);

  // main loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    let last = performance.now(); let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      game.update(dt);
      render(ctx, game, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // fit canvas
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current; if (!el) return;
      setScale(Math.max(0.5, Math.min(el.clientWidth / W, el.clientHeight / H)));
    };
    fit();
    const ro = new ResizeObserver(fit); if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // award chips + records when run ends
  const awardChips = () => {
    const earned = game.chipsEarned();
    const delta = earned - awarded.current;
    awarded.current = earned;
    commit(s => ({
      ...s, chips: s.chips + Math.max(0, delta),
      best: { ...s.best, [mapId]: Math.max(s.best[mapId] ?? 0, game.wavesCleared) },
      wins: game.state === 'won' || game.wavesCleared >= 30 ? { ...s.wins, [mapId]: (s.wins[mapId] ?? 0) + (game.state === 'won' ? 1 : 0) } : s.wins,
    }));
    return Math.max(0, delta);
  };
  const [endChips, setEndChips] = useState<number | null>(null);
  useEffect(() => {
    if ((game.state === 'won' || game.state === 'lost') && endChips === null) setEndChips(awardChips());
    if (game.state !== 'won' && game.state !== 'lost' && endChips !== null) setEndChips(null);
  });

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); game.startWave(); }
      else if (e.code === 'Escape') {
        if (game.placing || game.aiming || game.selected) { game.placing = null; game.aiming = null; game.selected = null; }
        else game.paused = !game.paused;
        game.emit();
      } else if (e.code === 'KeyF') { game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1; game.emit(); }
      else if (e.code === 'KeyP') { game.paused = !game.paused; game.emit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  const toLocal = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  };
  const onMove = (e: React.MouseEvent) => { game.hover = toLocal(e); };
  const onClick = (e: React.MouseEvent) => {
    audio.init();
    const p = toLocal(e);
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (game.aiming === 'orbital') { game.castOrbital(p.x, p.y); return; }
    if (game.placing) {
      const ok = game.place(game.placing, tx, ty);
      if (ok && !e.shiftKey) game.placing = null;
      game.emit();
      return;
    }
    if (game.clickHazard(tx, ty)) return;
    const t = game.towers.find(t => t.tx === tx && t.ty === ty);
    game.selected = t ?? null;
    if (t) audio.play('click');
    game.emit();
  };
  const onContext = (e: React.MouseEvent) => { e.preventDefault(); game.placing = null; game.aiming = null; game.selected = null; game.emit(); };

  const restart = () => { awardChips(); awarded.current = 0; setEndChips(null); setGame(new Game(MAPS.find(m => m.id === mapId)!, save)); };
  const quit = () => { if (game.state !== 'won' && game.state !== 'lost') awardChips(); onExit(); };
  const setMute = (m: boolean) => { audio.setMuted(m); commit(s => ({ ...s, settings: { ...s.settings, muted: m } })); };

  const g = game;
  return (
    <div className="w-full h-full flex flex-col bg-black">
      <TopBar g={g} onPause={() => { g.paused = true; g.emit(); }}
        onAutoChange={(on, interval) => commit(s => ({ ...s, settings: { ...s.settings, autoWave: on, autoInterval: interval } }))} />
      <div className="flex-1 flex min-h-0">
        <div ref={wrapRef} className="flex-1 relative flex items-center justify-center min-w-0 overflow-hidden bg-[#05040a]">
          <div className="relative scanlines" style={{ width: W * scale, height: H * scale }}>
            <canvas ref={canvasRef} width={W} height={H} className="pixelated w-full h-full block"
              style={{ cursor: g.placing || g.aiming ? 'crosshair' : 'default' }}
              onMouseMove={onMove} onMouseLeave={() => { g.hover = null; }} onClick={onClick} onContextMenu={onContext} />
            <BossBar g={g} />
            {/* toasts */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-10 w-[90%]">
              {g.toasts.map((t, i) => (
                <div key={i + t.text} className="font-pixel text-[8px] px-3 py-1.5 bg-black/80 border pop text-center" style={{ color: t.color, borderColor: t.color + '88', opacity: Math.min(1, t.t) }}>{t.text}</div>
              ))}
            </div>
            {g.state === 'build' && g.autoStart && g.wave > 0 && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-2 bg-black/80 border border-green-400/60 px-2 py-1 pop">
                <span className="w-2 h-2 bg-green-400 animate-pulse" />
                <div className="font-pixel text-[7px] text-green-300 leading-tight">AUTO WAVE<br /><span className="neon-c text-[9px]">PRÓXIMA EM {Math.max(0, Math.ceil(g.autoTimer))}s</span></div>
                <div className="w-16 h-1 bg-white/15"><div className="h-full bg-green-400" style={{ width: `${(1 - Math.max(0, g.autoTimer) / g.autoInterval) * 100}%` }} /></div>
              </div>
            )}
            {g.placing && <div className="absolute bottom-2 left-2 font-pixel text-[7px] text-white/70 bg-black/70 px-2 py-1 pointer-events-none">CLIQUE PARA POSICIONAR · SHIFT = VÁRIOS · BOTÃO DIREITO CANCELA</div>}
            {g.aiming && <div className="absolute bottom-2 left-2 font-pixel text-[7px] neon-m bg-black/70 px-2 py-1 pointer-events-none">SELECIONE O ALVO DO ATAQUE ORBITAL</div>}
            {g.selected && <TowerPanel g={g} t={g.selected} />}
            {g.cinematic && <BossIntro type={g.cinematic.type} />}
            {g.paused && g.state !== 'won' && g.state !== 'lost' && (
              <Overlay>
                <div className="font-pixel text-2xl neon-c mb-2">PAUSADO</div>
                <div className="text-white/60 mb-4">Onda {g.wave} · {g.kills} abates · {g.towers.length} tropas</div>
                <div className="flex flex-col gap-2 w-64">
                  <button className="btn" onClick={() => { g.paused = false; g.emit(); }}>▶ CONTINUAR</button>
                  <button className="btn btn-y" onClick={() => setMute(!save.settings.muted)}>{save.settings.muted ? '🔇 SOM OFF' : '🔊 SOM ON'}</button>
                  <button className="btn" onClick={() => { g.setAuto(!g.autoStart); commit(s => ({ ...s, settings: { ...s.settings, autoWave: g.autoStart, autoInterval: g.autoInterval } })); }}>AUTO WAVE: {g.autoStart ? 'ON' : 'OFF'}</button>
                  <button className="btn btn-m" onClick={restart}>↻ REINICIAR</button>
                  <button className="btn btn-m" onClick={quit}>⏏ SAIR PARA O MENU</button>
                </div>
              </Overlay>
            )}
            {g.state === 'won' && (
              <Overlay>
                <div className="font-pixel text-[10px] neon-y flicker">DISTRITO ASSEGURADO</div>
                <div className="font-pixel text-3xl neon-c my-3">VITÓRIA</div>
                <RunStats g={g} chips={endChips} />
                <div className="flex flex-col gap-2 w-72 mt-4">
                  <button className="btn btn-m" onClick={() => g.continueEndless()}>∞ CONTINUAR (MODO INFINITO)</button>
                  <button className="btn" onClick={restart}>↻ JOGAR NOVAMENTE</button>
                  <button className="btn btn-y" onClick={onExit}>⏏ MENU</button>
                </div>
              </Overlay>
            )}
            {g.state === 'lost' && (
              <Overlay red>
                <div className="font-pixel text-[10px] neon-r flicker">NÚCLEO COMPROMETIDO</div>
                <div className="font-pixel text-3xl neon-r my-3 glitch">FLATLINE</div>
                <RunStats g={g} chips={endChips} />
                <div className="flex flex-col gap-2 w-64 mt-4">
                  <button className="btn" onClick={restart}>↻ TENTAR NOVAMENTE</button>
                  <button className="btn btn-y" onClick={onExit}>⏏ MENU</button>
                </div>
              </Overlay>
            )}
          </div>
        </div>
        <Shop g={g} unlocked={save.unlocked} hover={hover} setHover={setHover} />
      </div>
    </div>
  );
}

function Overlay({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pop" style={{ background: red ? 'radial-gradient(circle, #3a0010cc, #000e)' : 'radial-gradient(circle, #0a1a2acc, #000e)' }}>
      {children}
    </div>
  );
}

function RunStats({ g, chips }: { g: Game; chips: number | null }) {
  return (
    <div className="panel px-6 py-3 grid grid-cols-2 gap-x-8 text-xl">
      <span className="text-white/50">Ondas sobrevividas</span><span className="neon-c text-right">{g.wavesCleared}</span>
      <span className="text-white/50">Inimigos abatidos</span><span className="neon-c text-right">{g.kills}</span>
      <span className="text-white/50">Chefes derrotados</span><span className="neon-y text-right">{g.bossesKilled}</span>
      <span className="text-white/50">Tropas em campo</span><span className="text-right">{g.towers.length}</span>
      <span className="text-white/50">Chips ganhos</span><span className="neon-m text-right">◆ {chips ?? 0}</span>
    </div>
  );
}
