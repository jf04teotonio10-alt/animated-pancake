import type { Game } from '../game/engine/Game';
import type { Tower } from '../game/engine/entities';
import { TROOPS, TROOP_MAP } from '../game/data/troops';
import { ENEMIES, BOSS_INFO } from '../game/data/enemies';
import { spriteURL } from '../game/art/sprites';
import { portraitURL } from '../game/art/portraits';
import { canUpgrade } from '../game/engine/upgrades';
import { FINAL_WAVE } from '../game/systems/waves';
import type { TargetMode } from '../game/types';
import { audio } from '../game/systems/audio';

// ===== TOP BAR =====
export function TopBar({ g, onPause, onAutoChange }: { g: Game; onPause: () => void; onAutoChange: (on: boolean, interval: number) => void }) {
  const counts: Record<string, number> = {};
  if (g.state === 'build') for (const s of g.nextQueue) counts[s.type] = (counts[s.type] ?? 0) + 1;
  const bossNext = Object.keys(counts).find(k => ENEMIES[k].faction === 'boss');
  const countdown = g.state === 'build' && g.autoStart && g.wave > 0 ? Math.max(0, Math.ceil(g.autoTimer)) : null;
  const toggle = () => { audio.play('click'); g.setAuto(!g.autoStart); onAutoChange(g.autoStart, g.autoInterval); };
  const changeInt = (d: number) => { g.setAutoInterval(Math.max(3, Math.min(12, g.autoInterval + d))); onAutoChange(g.autoStart, g.autoInterval); };
  return (
    <div className="flex items-stretch gap-2 px-2 h-16 bg-gradient-to-b from-[#0d0a1c] to-[#080613] border-b border-cyan-400/30 shrink-0 z-20">
      <div className="flex items-center pr-2 border-r border-white/10">
        <div className="font-pixel text-[8px] leading-tight neon-m">NEON<br /><span className="neon-c">HORDE</span></div>
      </div>
      <div className="flex flex-col justify-center pr-2 border-r border-white/10 min-w-0">
        <span className="font-pixel text-[7px] neon-c whitespace-nowrap">{g.map.name}</span>
        <span className="text-white/40 text-sm leading-none truncate">{g.map.subtitle}</span>
      </div>
      <Stat label="CRÉDITOS" value={`$${Math.floor(g.credits)}`} cls="neon-y" />
      <Stat label="NÚCLEO" value={`♥ ${Math.max(0, Math.ceil(g.lives))}`} cls={g.lives < g.maxLives * 0.3 ? 'neon-r glitch' : 'neon-r'} />
      <Stat label="ONDA" value={`${g.wave}${g.endless ? '' : '/' + FINAL_WAVE}`} cls="neon-c" />
      {g.event && <div className="self-center font-pixel text-[6px] px-1.5 py-1 border flicker max-w-[110px] leading-tight" style={{ color: g.event.color, borderColor: g.event.color }}>{g.event.name}</div>}

      {/* AUTO WAVE control */}
      <div className="flex items-center gap-1 px-2 border-x border-white/10">
        <button onClick={toggle}
          className={`relative flex flex-col items-start px-2 py-1 border transition ${g.autoStart ? 'border-green-400 bg-green-400/15' : 'border-white/25 bg-black/40'}`}
          title="Inicia a próxima horda automaticamente">
          <span className={`font-pixel text-[6px] ${g.autoStart ? 'text-green-300' : 'text-white/40'}`}>AUTO WAVE</span>
          <span className={`font-pixel text-[8px] ${g.autoStart ? 'neon-c' : 'text-white/50'}`}>{g.autoStart ? '● ON' : '○ OFF'}</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[5px] text-white/40">INTERVALO</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => changeInt(-1)} className="w-4 h-4 border border-white/20 text-white/70 text-xs leading-none hover:border-cyan-300" disabled={g.autoInterval <= 3}>−</button>
            <span className="font-pixel text-[8px] neon-y w-5 text-center">{g.autoInterval}s</span>
            <button onClick={() => changeInt(1)} className="w-4 h-4 border border-white/20 text-white/70 text-xs leading-none hover:border-cyan-300" disabled={g.autoInterval >= 12}>+</button>
          </div>
        </div>
        {countdown !== null && (
          <div className="flex flex-col items-center px-1 border border-cyan-400/40 bg-cyan-400/10">
            <span className="font-pixel text-[5px] text-cyan-200/70">PRÓXIMA</span>
            <span className="font-pixel text-[10px] neon-c leading-none">{countdown}s</span>
          </div>
        )}
        {g.autoStart && g.wave === 0 && <span className="font-pixel text-[5px] text-white/40 max-w-[44px] leading-tight">INICIE A 1ª ONDA</span>}
      </div>

      <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
        {g.state === 'build' && (
          <>
            <span className="font-pixel text-[7px] text-white/50 whitespace-nowrap">PRÓXIMA:</span>
            {bossNext && <span className="font-pixel text-[7px] neon-r glitch">⚠CHEFE</span>}
            {Object.entries(counts).slice(0, 7).map(([k, n]) => (
              <div key={k} className="relative shrink-0" title={`${ENEMIES[k].name} x${n}`}>
                <img src={spriteURL('e', k, 1)} className="pixelated w-7 h-7" />
                <span className="absolute -bottom-0.5 right-0 text-xs text-white bg-black/80 px-0.5 leading-none border border-white/20">{n}</span>
              </div>
            ))}
          </>
        )}
        {g.state === 'wave' && <span className="text-white/60 text-base">Inimigos na horda: <span className="neon-r">{g.enemies.length + g.queue.length}</span></span>}
      </div>

      <button className="btn btn-y !px-2 !py-2 self-center" onClick={() => { g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 3 : 1; g.emit(); }} title="Velocidade (F)">{'▶'.repeat(g.speed)}</button>
      <button className="btn btn-m !py-3 self-center whitespace-nowrap" disabled={g.state !== 'build'} onClick={() => g.startWave()}>{g.state === 'build' ? `INICIAR ${g.wave + 1}` : 'EM COMBATE'}</button>
      <button className="btn !px-3 !py-2 self-center" onClick={onPause} title="Pausa (P)">II</button>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex flex-col justify-center leading-none pr-2 border-r border-white/10 last:border-0 min-w-0">
      <span className="text-[10px] text-white/40 font-pixel scale-75 origin-left whitespace-nowrap">{label}</span>
      <span className={`font-pixel text-[12px] whitespace-nowrap ${cls}`}>{value}</span>
    </div>
  );
}

// ===== SHOP =====
export function Shop({ g, unlocked, hover, setHover }: { g: Game; unlocked: string[]; hover: string | null; setHover: (s: string | null) => void }) {
  const info = hover ? TROOP_MAP[hover] : g.placing ? TROOP_MAP[g.placing] : null;
  return (
    <div className="w-[250px] shrink-0 bg-[#0a0716] border-l border-cyan-400/30 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-white/10">
        <span className="font-pixel text-[8px] neon-c">// MERCENÁRIOS</span>
        <span className="text-white/40 text-sm">clique e posicione</span>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2 overflow-y-auto">
        {TROOPS.map(t => {
          const isUnl = t.unlockCost === 0 || unlocked.includes(t.id);
          const cost = g.troopCost(t);
          const afford = g.credits >= cost;
          return (
            <button key={t.id} disabled={!isUnl}
              onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover(null)}
              onClick={() => { audio.play('click'); g.placing = g.placing === t.id ? null : t.id; g.selected = null; g.aiming = null; g.emit(); }}
              className={`relative border p-0.5 transition ${g.placing === t.id ? 'border-pink-400 bg-pink-500/20 -translate-y-0.5' : 'border-white/10 bg-black/40 hover:border-cyan-300'} ${!afford && isUnl ? 'opacity-50' : ''}`}>
              <img src={spriteURL('t', t.id, 2)} className="pixelated w-full" style={{ filter: isUnl ? '' : 'grayscale(1) brightness(.3)' }} />
              <div className={`text-sm leading-none text-center ${afford ? 'neon-y' : 'text-red-400'}`}>{isUnl ? `$${cost}` : '🔒'}</div>
              {t.category === 'Suporte' && <span className="absolute top-0 left-0 w-1 h-1 bg-green-400" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 border-t border-white/10 text-base leading-tight">
        {info ? (
          <div className="flex gap-2">
            <img src={portraitURL(info.id, 1)} className="pixelated w-16 h-16 shrink-0 border" style={{ borderColor: info.look.glow }} />
            <div className="min-w-0">
              <div className="font-pixel text-[8px] leading-tight" style={{ color: info.look.glow }}>{info.name}</div>
              <div className="text-white/60 leading-none">{info.title} · {info.category}</div>
              <div className="text-white/80 mt-1 leading-tight">{info.ability}</div>
              <div className="text-green-300 leading-tight">+ {info.strengths}</div>
              <div className="text-red-300 leading-tight">− {info.weaknesses}</div>
            </div>
          </div>
        ) : (
          <div className="text-white/40 leading-tight">Clique num mercenário e depois num local livre do mapa. Nós de energia (quadrados brilhantes) dão +25% dano. Barris vermelhos explodem ao clicar. Chefes que escapam causam dano proporcional à ameaça; a partida só termina quando as vidas chegam a zero.<br /><br />Atalhos: ESPAÇO inicia onda · P pausa · ESC cancela · F velocidade. Com AUTO WAVE ligado a próxima onda começa sozinha e você continua comprando e evoluindo durante o intervalo.</div>
        )}
      </div>
      <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-1">
        <button className="btn btn-m !px-1 !text-[7px]" disabled={g.orbitalCd > 0 || g.credits < g.orbitalCost()} onClick={() => { g.aiming = g.aiming ? null : 'orbital'; g.placing = null; g.emit(); }}
          title="Ataque Orbital: dano massivo em área">
          {g.orbitalCd > 0 ? `ORBITAL ${Math.ceil(g.orbitalCd)}s` : `☄ ORBITAL $${g.orbitalCost()}`}
        </button>
        <button className="btn !px-1 !text-[7px]" disabled={g.hackCd > 0 || g.credits < g.hackCost()} onClick={() => g.castHack()} title="Netrunner Override: lentidão global, atordoa androides, revela camuflados">
          {g.hackCd > 0 ? `HACK ${Math.ceil(g.hackCd)}s` : `⌁ HACK $${g.hackCost()}`}
        </button>
      </div>
    </div>
  );
}

// ===== TOWER PANEL =====
const MODES: [TargetMode, string][] = [['first', '1º'], ['last', 'ÚLT'], ['strong', 'FORTE'], ['close', 'PERTO']];

export function TowerPanel({ g, t }: { g: Game; t: Tower }) {
  const s = t.eff;
  const kind = t.def.kind;
  const dmgShown = kind === 'summon' || kind === 'drones' ? s.summonDmg : s.damage;
  const flags = [s.camo ? 'DETECTA CAMUFLADOS' : null, s.air ? 'ANTI-AÉREO' : 'SÓ SOLO', t.node ? 'NÓ +25%' : null, t.grantedCamo ? 'RADAR ALIADO' : null].filter(Boolean);
  const maxTier = Math.max(...t.tiers);
  const topPath = t.tiers.indexOf(maxTier);
  return (
    <div className="absolute left-2 right-2 bottom-2 panel p-2 flex gap-2 pop z-20" onMouseDown={e => e.stopPropagation()}>
      <div className="w-[196px] shrink-0 flex flex-col">
        <div className="flex gap-2">
          <div className="relative shrink-0">
            <img src={portraitURL(t.def.id, 1)} className="pixelated w-[72px] h-[72px] border" style={{ borderColor: t.def.look.glow, filter: `drop-shadow(0 0 5px ${t.def.look.glow}66)` }} />
            {maxTier >= 3 && <span className="absolute -bottom-1 -right-1 font-pixel text-[7px] px-1 bg-black border" style={{ color: t.def.paths[topPath].color, borderColor: t.def.paths[topPath].color }}>{'★'.repeat(Math.min(3, maxTier - 2))}</span>}
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-pixel text-[8px]" style={{ color: t.def.look.glow }}>{t.def.name}</div>
            <div className="text-white/60 text-sm">{t.def.title}</div>
            <div className="text-sm">Abates <span className="neon-y">{t.kills}</span></div>
            <div className="text-sm">Dano <span className="neon-c">{Math.round(t.dmgDone)}</span></div>
            <div className="text-sm">Investido <span className="text-white/60">${t.spent}</span></div>
          </div>
        </div>
        <div className="text-sm leading-tight mt-1 text-white/80">
          {kind !== 'aura' || s.damage > 0 ? <>DMG {dmgShown.toFixed(1)} · </> : null}ALC {Math.round(s.range)} · {kind === 'aura' ? `AURA +${Math.round(s.buffRate * 100)}% cad.` : `CAD ${s.rate.toFixed(2)}/s`}
          {s.income > 0 && <> · RENDA ${Math.round(s.income)}</>}
        </div>
        <div className="text-[11px] text-white/50 leading-tight">{flags.join(' · ')}</div>
        {kind !== 'aura' && kind !== 'pulse' && (
          <div className="grid grid-cols-4 gap-0.5 mt-1">
            {MODES.map(([m, l]) => (
              <button key={m} onClick={() => g.setMode(t, m)} className={`font-pixel text-[6px] py-1 border ${t.mode === m ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/20 text-white/70'}`}>{l}</button>
            ))}
          </div>
        )}
        <div className="flex gap-1 mt-1">
          <button className="btn btn-y flex-1 !py-1.5 !text-[7px]" onClick={() => g.sell(t)}>VENDER ${Math.round(t.spent * 0.7)}</button>
          <button className="btn !py-1.5 !px-2 !text-[7px]" onClick={() => { g.selected = null; g.emit(); }}>✕</button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
        {t.def.paths.map((p, pi) => {
          const tier = t.tiers[pi];
          const next = p.ups[tier];
          const chk = canUpgrade(t.tiers, pi);
          const afford = next && g.credits >= next.cost;
          return (
            <div key={pi} className="border bg-black/40 p-1.5 flex flex-col min-w-0" style={{ borderColor: p.color + '66' }}>
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[6px] truncate" style={{ color: p.color }}>{p.name}</span>
                <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map(i => <span key={i} className="w-2 h-2" style={{ background: i < tier ? p.color : '#ffffff18', boxShadow: i < tier ? `0 0 4px ${p.color}` : '' }} />)}</span>
              </div>
              <div className="text-[11px] text-white/50 truncate">{tier > 0 ? `✓ ${p.ups[tier - 1].name}` : '—'}</div>
              {next ? (
                <>
                  <div className={`leading-tight mt-0.5 ${tier === 4 ? 'font-pixel text-[7px] neon-y' : 'text-white text-base'}`}>{next.name}</div>
                  <div className="text-sm text-white/60 leading-tight flex-1">{next.desc}</div>
                  <button disabled={!chk.ok || !afford} onClick={() => g.upgrade(t, pi)}
                    className="mt-1 font-pixel text-[8px] py-1.5 border transition disabled:opacity-40"
                    style={{ borderColor: p.color, color: chk.ok && afford ? '#05040a' : p.color, background: chk.ok && afford ? p.color : 'transparent' }}>
                    {chk.ok ? `$${next.cost}` : chk.reason}
                  </button>
                </>
              ) : <div className="font-pixel text-[8px] neon-y mt-2 text-center">★ MÁXIMO ★</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== BOSS BAR =====
export function BossBar({ g }: { g: Game }) {
  const b = g.boss;
  if (!b) return null;
  const info = BOSS_INFO[b.type];
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[62%] z-10 pointer-events-none">
      <div className="flex justify-between items-end font-pixel text-[9px]" style={{ color: info.color, textShadow: `0 0 6px ${info.color}` }}>
        <span className="flex items-center gap-2">
          <img src={spriteURL('e', b.type, 2)} alt="" className="pixelated w-9 h-9 border bg-black/50" style={{ borderColor: info.color + '88' }} />
          {b.def.name}{b.hard ? ' MK-II' : ''}
        </span>
        <span>FASE {b.phase} / 3</span>
      </div>
      <div className="h-3 bg-black/80 border mt-1 relative" style={{ borderColor: info.color }}>
        <div className="h-full transition-all" style={{ width: `${Math.max(0, b.hp / b.maxHp) * 100}%`, background: `linear-gradient(90deg, ${info.color}, #fff)` }} />
        {b.shield > 0 && <div className="absolute top-0 left-0 h-1.5 bg-cyan-200 shadow-[0_0_6px_#7df9ff]" style={{ width: `${Math.min(100, (b.shield / b.maxHp) * 100)}%` }} />}
        {info.phaseThresholds.map(threshold => <div key={threshold} className="absolute -top-0.5 h-4 w-px bg-white/70" style={{ left: `${threshold * 100}%` }} />)}
        <div className="absolute top-0 left-0 h-full w-full pointer-events-none" style={{ background: 'repeating-linear-gradient(90deg, transparent 0 20px, #00000066 20px 21px)' }} />
      </div>
    </div>
  );
}

// ===== BOSS INTRO =====
export function BossIntro({ type }: { type: string }) {
  const info = BOSS_INFO[type]; const def = ENEMIES[type];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-x-0 top-0 h-[18%] bg-black slidein" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-black slidein" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${info.color}33, #000c 70%)` }} />
      <div className="relative flex items-center gap-8 pop">
        <img src={spriteURL('e', type, 6)} className="pixelated w-56 h-56 glitch" style={{ filter: `drop-shadow(0 0 20px ${info.color})` }} />
        <div>
          <div className="font-pixel text-[10px] neon-r flicker">⚠ AMEAÇA NÍVEL ÔMEGA DETECTADA</div>
          <div className="font-pixel text-4xl mt-3" style={{ color: info.color, textShadow: `0 0 16px ${info.color}` }}>{def.name}</div>
          <div className="font-pixel text-[10px] text-white mt-2">{info.subtitle}</div>
          <div className="text-2xl text-white/80 mt-4 italic max-w-md">{info.quote}</div>
        </div>
      </div>
    </div>
  );
}
