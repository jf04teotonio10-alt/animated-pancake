import { useState } from 'react';
import { TROOPS } from '../game/data/troops';
import { PROFILES } from '../game/data/profiles';
import { ENEMIES, BOSS_INFO } from '../game/data/enemies';
import { spriteURL } from '../game/art/sprites';
import { portraitURL } from '../game/art/portraits';
import { META, type SaveData } from '../game/systems/save';
import { audio } from '../game/systems/audio';

type Tab = 'troops' | 'lab' | 'bestiary';
type Dossier = 'perfil' | 'design' | 'combate' | 'evolucao';
interface Props { save: SaveData; tab: Tab; setSave: (s: SaveData) => void; onBack: () => void }

const DMG_LABEL: Record<string, string> = { kinetic: 'Cinético', energy: 'Energia', explosive: 'Explosivo', emp: 'EMP', blade: 'Lâmina', fire: 'Fogo', cryo: 'Criogênico' };
const KIND_LABEL: Record<string, string> = { projectile: 'Projétil', hitscan: 'Disparo instantâneo', melee: 'Corpo a corpo', lob: 'Arremesso em arco', chain: 'Raio em cadeia', cone: 'Cone de fogo', pulse: 'Pulso em área', aura: 'Aura de suporte', summon: 'Torretas autônomas', drones: 'Drones de ataque' };
const PATH_THEME: Record<string, string[]> = {
  reaper: ['Destruição: um tiro, uma sentença', 'Velocidade: fogo contínuo', 'Tecnologia: ver antes de matar'],
  berserker: ['Carnificina: a lâmina guia', 'Sandevistan: o mundo desacelera', 'Juggernaut: a linha que não cede'],
  ghost: ['Lâmina Fantasma: execução', 'Sombra: enxame de aço', 'Infiltração: guerra de dados'],
  overclock: ['Overclock: mais tempo de arma', 'Firewall: o cérebro do time', 'Hack ofensivo: guerra de rede'],
  blood: ['Mercado Negro: crédito composto', 'Colheita: cada corpo, uma peça', 'Contratos: o lado armado'],
  scrap: ['Linha de montagem: mais torres', 'Calibre: o que sai do cano', 'Sensores: a torre que vê tudo'],
  blackout: ['Sobrecarga: apagar mais tempo', 'Pulso rápido: mais vezes', 'Desmontagem: quebrar sistemas'],
  sniper: ['Calibre pesado: um tiro, uma história', 'Semi-auto: pressão constante', 'Olho Kiroshi: ver tudo'],
  nyx: ['Combustível: queimar por mais tempo', 'Pressão: um jato maior', 'Napalm: o chão lembra'],
  boom: ['Ogivas: explosões maiores', 'Cadência: mais granadas', 'Demolição: engenharia de guerra'],
  siren: ['Amplificação: mais saltos', 'Frequência: mais batidas', 'Hipnose: a plateia obedece'],
  kitsune: ['Zero absoluto: o tempo para', 'Estilhaços: o gelo fere', 'Nove caudas: o enxame'],
  bastion: ['Escudo: segurar a linha', 'Martelo: quebrar a linha', 'Comando: liderar o posto'],
  swarm: ['Enxame: mais corpos', 'Kamikaze: cada drone é uma granada', 'Neuro-link: uma mente, muitos olhos'],
  glitch: ['Corrupção: podridão de sistema', 'Ricochete: um pacote, muitos alvos', 'Rollback: empurrar o presente'],
};

export default function Database({ save, tab: initial, setSave, onBack }: Props) {
  const [tab, setTab] = useState<Tab>(initial);
  const [sel, setSel] = useState(TROOPS[0].id);
  const [dossier, setDossier] = useState<Dossier>('perfil');
  const [enemySel, setEnemySel] = useState('psycho');
  const troop = TROOPS.find(t => t.id === sel)!;
  const prof = PROFILES[troop.id];
  const unlocked = (id: string) => TROOPS.find(t => t.id === id)!.unlockCost === 0 || save.unlocked.includes(id);

  const unlock = () => {
    if (save.chips < troop.unlockCost) { audio.play('error'); return; }
    audio.play('upgrade');
    setSave({ ...save, chips: save.chips - troop.unlockCost, unlocked: [...save.unlocked, troop.id] });
  };
  const buyMeta = (id: string) => {
    const m = META.find(m => m.id === id)!; const lvl = save.meta[id] ?? 0;
    if (lvl >= m.max || save.chips < m.cost(lvl)) { audio.play('error'); return; }
    audio.play('upgrade');
    setSave({ ...save, chips: save.chips - m.cost(lvl), meta: { ...save.meta, [id]: lvl + 1 } });
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#06040e] scanlines relative">
      <div className="flex items-center gap-2 p-3 border-b border-cyan-400/30 bg-gradient-to-b from-[#0d0a1c] to-[#07050f] shrink-0 z-10">
        <button className="btn btn-m !px-3" onClick={onBack}>◀</button>
        <div className="font-pixel text-[10px] neon-m mr-2 hidden md:block">NCPD<span className="neon-c">//</span>DATABASE</div>
        {(['troops', 'lab', 'bestiary'] as Tab[]).map(t => (
          <button key={t} className={`btn !text-[8px] ${tab === t ? '!bg-cyan-300 !text-black' : ''}`} onClick={() => { audio.play('click'); setTab(t); }}>
            {t === 'troops' ? 'MERCENÁRIOS' : t === 'lab' ? 'CYBERWARE LAB' : 'BESTIÁRIO'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="font-pixel text-[7px] text-green-400 hidden lg:inline">● LINK SEGURO</span>
          <span className="font-pixel text-[9px] neon-y">◆ {save.chips} CHIPS</span>
        </div>
      </div>

      {tab === 'troops' && (
        <div className="flex-1 flex min-h-0">
          {/* roster */}
          <div className="w-[188px] shrink-0 border-r border-white/10 overflow-y-auto bg-black/30">
            <div className="font-pixel text-[7px] text-white/40 p-2 border-b border-white/10">ROSTER DE CAMPO · {TROOPS.length} UNIDADES</div>
            <div className="grid grid-cols-2 gap-1 p-1.5">
              {TROOPS.map((t, i) => {
                const unl = unlocked(t.id);
                return (
                  <button key={t.id} onClick={() => { audio.play('click'); setSel(t.id); }}
                    className={`relative group border transition ${sel === t.id ? 'border-pink-400 shadow-[0_0_12px_#ff2bd688] -translate-y-0.5' : 'border-white/10 hover:border-cyan-300/70'}`}>
                    <img src={portraitURL(t.id, 1)} className="pixelated w-full" style={{ filter: unl ? '' : 'grayscale(1) brightness(.42)' }} />
                    {!unl && <span className="absolute inset-0 flex items-center justify-center font-pixel text-[7px] neon-y bg-black/30">◆{t.unlockCost}</span>}
                    <span className="absolute top-0 left-0 font-pixel text-[5px] bg-black/80 px-1 text-white/60">{String(i + 1).padStart(2, '0')}</span>
                    {sel === t.id && <span className="absolute bottom-0 inset-x-0 font-pixel text-[5px] bg-pink-500 text-black text-center">ATIVO</span>}
                  </button>
                );
              })}
            </div>
            <div className="p-2 text-white/40 text-sm leading-tight border-t border-white/10">Retratos 64×64 px. Cada unidade é uma pessoa com passado, dívidas e um motivo para estar no seu esquadrão.</div>
          </div>

          {/* dossier */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex flex-col lg:flex-row gap-4 p-4 pb-2">
              <div className="flex gap-3 shrink-0">
                <div className="relative">
                  <img src={portraitURL(troop.id, 3)} className="pixelated w-[176px] h-[176px] border-2" style={{ borderColor: troop.look.glow, boxShadow: `0 0 24px ${troop.look.glow}44, inset 0 0 20px #000` }} />
                  <div className="absolute top-1 left-1 font-pixel text-[6px] bg-black/80 px-1.5 py-0.5" style={{ color: troop.look.glow }}>ID-{String(TROOPS.indexOf(troop) + 1).padStart(3, '0')}</div>
                  <div className="absolute bottom-1 right-1 font-pixel text-[6px] bg-black/80 px-1.5 py-0.5 text-green-300">ACESSO ✓</div>
                </div>
                <div className="hidden xl:flex flex-col justify-between w-[92px]">
                  <div className="font-pixel text-[6px] text-white/40 space-y-2">
                    <div>SPRITE<br /><img src={spriteURL('t', troop.id, 3)} className="pixelated w-full border border-white/10 mt-1" /></div>
                    <div className="leading-tight">ESCALA<br /><span className="text-white/70">32×32</span></div>
                  </div>
                  <div className="font-pixel text-[6px] leading-relaxed" style={{ color: troop.look.glow }}>
                    {unlocked(troop.id) ? 'DISPONÍVEL' : `BLOQUEADA`}<br /><span className="text-white/50">CUSTO ◆{troop.unlockCost}</span>
                  </div>
                  {!unlocked(troop.id) && <button className="btn btn-y w-full !text-[6px] mt-1" onClick={unlock} disabled={save.chips < troop.unlockCost}>DESBLOQUEAR</button>}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-pixel text-[7px] text-white/40">{prof.codename} · {prof.age}</div>
                <div className="font-pixel text-lg md:text-xl mt-1 leading-tight" style={{ color: troop.look.glow, textShadow: `0 0 10px ${troop.look.glow}66` }}>{troop.name}</div>
                <div className="text-white/70 text-xl leading-none">{troop.title}</div>
                <p className="text-lg text-white/70 mt-2 leading-snug line-clamp-3">{prof.personality}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[troop.category, KIND_LABEL[troop.kind], DMG_LABEL[troop.dmgType], troop.base.air ? 'ANTI-AÉREO' : 'SÓ SOLO', troop.base.camo ? 'DETECÇÃO' : null].filter(Boolean).map(x => (
                    <span key={x} className="font-pixel text-[6px] px-1.5 py-1 border" style={{ color: troop.look.glow, borderColor: troop.look.glow + '66' }}>{x}</span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-base leading-none">
                  <Metric l="CUSTO" v={`$${troop.cost}`} c="#fcee0a" />
                  <Metric l="DANO" v={(troop.base.damage || troop.base.summonDmg).toString()} c="#ff8f8f" />
                  <Metric l="ALCANCE" v={troop.base.range.toString()} c="#00fff0" />
                  <Metric l="CADÊNCIA" v={`${troop.base.rate}/s`} c="#39ff88" />
                  <Metric l="PERFURA" v={troop.base.pierce.toString()} c="#ffffff" />
                  <Metric l="DESBLOQ." v={troop.unlockCost ? `◆${troop.unlockCost}` : 'INICIAL'} c="#ff2bd6" />
                </div>
                {!unlocked(troop.id) && <button className="btn btn-y mt-2 lg:hidden" onClick={unlock} disabled={save.chips < troop.unlockCost}>DESBLOQUEAR ◆{troop.unlockCost}</button>}
              </div>
            </div>

            <div className="flex gap-1 px-4 border-b border-white/10 shrink-0">
              {(['perfil', 'design', 'combate', 'evolucao'] as Dossier[]).map(d => (
                <button key={d} onClick={() => { audio.play('click'); setDossier(d); }}
                  className={`font-pixel text-[7px] px-3 py-2 border-b-2 transition ${dossier === d ? 'border-cyan-300 text-cyan-200 bg-cyan-400/10' : 'border-transparent text-white/40 hover:text-white/80'}`}>
                  {d === 'perfil' ? '01 PERFIL' : d === 'design' ? '02 CHARACTER DESIGN' : d === 'combate' ? '03 COMBATE' : '04 EVOLUÇÃO'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {dossier === 'perfil' && (
                <div className="grid md:grid-cols-2 gap-3">
                  <Block title="HISTÓRICO">{prof.history}</Block>
                  <div className="space-y-3">
                    <Block title="PERSONALIDADE">{prof.personality}</Block>
                    <Block title="MOTIVAÇÃO">{prof.motivation}</Block>
                    <Block title="CARACTERÍSTICAS MARCANTES">{prof.marks}</Block>
                    <Block title="ORIGEM">{prof.origin}</Block>
                  </div>
                </div>
              )}
              {dossier === 'design' && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <Block title="DESCRIÇÃO FÍSICA">{prof.physical}</Block>
                    <Block title="CABELO E PENTEADO">{prof.hair}</Block>
                    <Block title="ROSTO E EXPRESSÕES">{prof.face}</Block>
                    <Block title="ROUPAS E ACESSÓRIOS">{prof.outfit}</Block>
                  </div>
                  <div className="space-y-3">
                    <Block title="IMPLANTES CIBERNÉTICOS">{prof.implants}</Block>
                    <Block title="ARMAS E EQUIPAMENTOS">{prof.weapons}</Block>
                    <Block title="SILHUETA E RECONHECIMENTO">{prof.silhouette}</Block>
                    <div className="panel p-3">
                      <div className="font-pixel text-[7px] neon-c mb-2">PALETA DE IDENTIDADE</div>
                      <div className="flex gap-2">
                        {prof.palette.map(c => (
                          <div key={c} className="flex-1">
                            <div className="h-10 border border-white/20" style={{ background: c, boxShadow: `0 0 10px ${c}55` }} />
                            <div className="font-pixel text-[5px] text-white/40 mt-1 text-center">{c.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="panel p-3 flex items-center gap-3">
                      <img src={portraitURL(troop.id, 1)} className="pixelated w-16 h-16 border" style={{ borderColor: troop.look.glow }} />
                      <div className="text-sm text-white/60 leading-tight">O retrato amplia o mesmo penteado, implante e paleta do sprite de combate. Nada de arte descartável: a identidade é única e verificável em campo.</div>
                    </div>
                  </div>
                </div>
              )}
              {dossier === 'combate' && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <Block title="FUNÇÃO NO TOWER DEFENSE">{troop.title} · categoria {troop.category}. {KIND_LABEL[troop.kind]} com dano {DMG_LABEL[troop.dmgType]}.</Block>
                    <div className="grid grid-cols-2 gap-2">
                      <Block title="HABILIDADE PASSIVA">{prof.passive}</Block>
                      <Block title="HABILIDADE ATIVA / ESPECIAL">{prof.active}</Block>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="panel p-3 border-l-2 border-green-400"><div className="font-pixel text-[7px] text-green-300 mb-1">PONTOS FORTES</div><div className="text-white/80 leading-tight">{troop.strengths}</div></div>
                      <div className="panel p-3 border-l-2 border-red-400"><div className="font-pixel text-[7px] text-red-300 mb-1">PONTOS FRACOS</div><div className="text-white/80 leading-tight">{troop.weaknesses}</div></div>
                    </div>
                    <Block title="HABILIDADE EXCLUSIVA">{troop.ability}</Block>
                  </div>
                  <div className="space-y-3">
                    <div className="panel p-3">
                      <div className="font-pixel text-[7px] neon-y mb-2">SINERGIAS DE ESQUADRÃO</div>
                      {prof.synergies.map(s => {
                        const other = TROOPS.find(t => t.id === s.id);
                        return (
                          <div key={s.id} className="flex gap-2 items-center mb-1.5">
                            {other && <img src={portraitURL(other.id, 1)} className="pixelated w-9 h-9 border border-white/20 shrink-0" />}
                            <div className="text-sm leading-tight"><span className="neon-c">{other?.name ?? s.id}: </span><span className="text-white/70">{s.text}</span></div>
                          </div>
                        );
                      })}
                    </div>
                    <Block title="ESTRATÉGIA RECOMENDADA">{prof.strategy}</Block>
                    <div className="panel p-3">
                      <div className="font-pixel text-[7px] neon-m mb-1">MENTALIDADE NO CAMPO</div>
                      <div className="text-white/70 leading-snug italic">"{troop.lore}"</div>
                    </div>
                  </div>
                </div>
              )}
              {dossier === 'evolucao' && (
                <div>
                  <div className="text-sm text-white/50 mb-2">Três caminhos exclusivos, cinco níveis cada. Regra de combinação: no máximo dois caminhos ativos por tropa, e apenas um pode passar do nível 2. Evoluções de nível 3+ alteram a aparência no campo; nível 5 ganha coroa, aura e partículas.</div>
                  <div className="grid lg:grid-cols-3 gap-3">
                    {troop.paths.map((p, pi) => (
                      <div key={pi} className="panel p-3" style={{ borderColor: p.color + '66' }}>
                        <div className="font-pixel text-[8px] mb-1" style={{ color: p.color }}>CAMINHO {'ABC'[pi]} — {p.name}</div>
                        <div className="text-sm text-white/60 leading-tight mb-2">{PATH_THEME[troop.id]?.[pi] ?? prof.evolution[pi].theme}</div>
                        {p.ups.map((u, i) => {
                          const theme = prof.evolution[pi];
                          return (
                            <div key={i} className="mb-2 pl-2 border-l-2" style={{ borderColor: i === 4 ? p.color : p.color + '44' }}>
                              <div className="flex justify-between gap-1">
                                <span className={`${i === 4 ? 'font-pixel text-[7px] neon-y' : 'text-white'} leading-tight`}>{i + 1}. {u.name}</span>
                                <span className="text-white/40 text-sm shrink-0">${u.cost}</span>
                              </div>
                              <div className="text-sm text-white/60 leading-tight">{u.desc}</div>
                              <div className="text-[11px] text-cyan-200/60 leading-tight">Aparência: {theme.visual[i]}</div>
                              {i === 4 && <div className="text-[11px] text-pink-300/80 leading-tight mt-0.5">Jogo: {theme.play}</div>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'lab' && (
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="font-pixel text-[11px] neon-c">// CYBERWARE LAB — MELHORIAS PERMANENTES</h2>
          <div className="text-white/50 mb-4">Ganhe chips de dados sobrevivendo a ondas e derrotando chefes. Investir aqui fortalece todas as partidas futuras.</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {META.map(m => {
              const lvl = save.meta[m.id] ?? 0;
              return (
                <div key={m.id} className="panel p-4">
                  <div className="font-pixel text-[10px] neon-m">{m.name}</div>
                  <div className="text-white/70 text-lg mt-1">{m.desc}</div>
                  <div className="flex gap-1 my-3">{Array.from({ length: m.max }, (_, i) => <div key={i} className="h-2 flex-1" style={{ background: i < lvl ? '#ff2bd6' : '#ffffff15', boxShadow: i < lvl ? '0 0 6px #ff2bd6' : '' }} />)}</div>
                  <button className="btn btn-y w-full" disabled={lvl >= m.max || save.chips < m.cost(lvl)} onClick={() => buyMeta(m.id)}>
                    {lvl >= m.max ? 'MÁXIMO' : `INSTALAR ◆${m.cost(lvl)}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'bestiary' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start border-r border-white/10">
            {Object.values(ENEMIES).filter(e => e.id !== 'holo').map(e => (
              <button key={e.id} onClick={() => { audio.play('click'); setEnemySel(e.id); }}
                className={`aspect-square border ${enemySel === e.id ? 'border-pink-400 bg-pink-400/10' : 'border-white/10 bg-black/40'}`}>
                <img src={spriteURL('e', e.id, 2)} className="pixelated w-full" />
              </button>
            ))}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {(() => {
              const e = ENEMIES[enemySel]; const bi = BOSS_INFO[e.id];
              return (
                <div className="flex gap-6 flex-wrap">
                  <img src={spriteURL('e', e.id, e.faction === 'boss' ? 4 : 6)} className="pixelated w-48 h-48" style={{ filter: `drop-shadow(0 0 12px ${bi?.color ?? (e.faction === 'android' ? '#00fff0' : '#ff3b3b')})` }} />
                  <div className="flex-1 min-w-[260px]">
                    <div className="font-pixel text-[9px] text-white/50">{e.faction === 'boss' ? 'CHEFE' : e.faction === 'android' ? 'ANDROID' : 'CYBERPSICOPATA'}</div>
                    <div className="font-pixel text-lg mt-1" style={{ color: bi?.color ?? '#ff2bd6' }}>{e.name}</div>
                    {bi && <div className="neon-y">{bi.subtitle}</div>}
                    <p className="text-lg text-white/80 mt-2">{e.desc}</p>
                    {bi && <p className="text-lg italic text-white/60 mt-1">{bi.quote}</p>}
                    <div className="grid grid-cols-2 gap-1 mt-3 text-lg">
                      <div><span className="text-white/50">Vida base:</span> {e.hp}</div>
                      <div><span className="text-white/50">Velocidade:</span> {e.speed}</div>
                      <div><span className="text-white/50">Recompensa:</span> ${e.reward}</div>
                      <div><span className="text-white/50">Dano ao núcleo:</span> {e.faction === 'boss' ? 'ALTO' : e.lives}</div>
                      {e.camo && <div className="neon-m">Camuflado</div>}
                      {e.flying && <div className="neon-c">Aéreo</div>}
                    </div>
                    <div className="mt-3 text-lg">
                      <span className="text-white/50">Resistências: </span>
                      {Object.entries(e.resist).map(([k, v]) => (
                        <span key={k} className={`mr-3 ${v! < 1 ? 'text-red-300' : 'text-green-300'}`}>{DMG_LABEL[k]} {v! < 1 ? `-${Math.round((1 - v!) * 100)}%` : `+${Math.round((v! - 1) * 100)}%`}</span>
                      ))}
                    </div>
                    {e.id === 'butcher' && <BossMoves moves={['Investida destrutiva (velocidade x3.5)', 'Pancada sísmica: desativa tropas próximas', 'Invoca a matilha (psicopatas e explosivos)', 'Fúria abaixo de 30%: mais rápido, recargas menores']} />}
                    {e.id === 'archon' && <BossMoves moves={['Escudo energético regenerável (EMP causa x3)', 'Lança drones de suporte', 'Disparo de precisão telegrafado na tropa mais valiosa', 'Fase 2: Pulso EMP que desativa tropas em área']} />}
                    {e.id === 'saint' && <BossMoves moves={['Teletransporte curto ao longo da rota', 'Clonagem holográfica', 'Ataques de energia que desligam tropas', 'Sobrecarga cibernética: velocidade e frequência aumentadas; imune a lentidão na fase final']} />}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <div className="border border-white/10 bg-black/40 px-1 py-0.5">
      <div className="font-pixel text-[5px] text-white/40">{l}</div>
      <div className="font-pixel text-[8px]" style={{ color: c }}>{v}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="font-pixel text-[7px] neon-c mb-1">// {title}</div>
      <div className="text-white/80 text-lg leading-snug">{children}</div>
    </div>
  );
}

function BossMoves({ moves }: { moves: string[] }) {
  return <div className="mt-3"><div className="font-pixel text-[9px] neon-r mb-1">PADRÕES DE ATAQUE</div>{moves.map(m => <div key={m} className="text-lg">▸ {m}</div>)}</div>;
}
