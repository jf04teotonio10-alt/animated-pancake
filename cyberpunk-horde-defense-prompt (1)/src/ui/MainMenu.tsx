import { CityBackdrop } from './common';
import { TROOPS } from '../game/data/troops';
import { portraitURL } from '../game/art/portraits';
import type { SaveData } from '../game/systems/save';

interface Props { save: SaveData; onPlay: () => void; onDatabase: (tab: 'troops' | 'lab' | 'bestiary') => void; onToggleMute: () => void }

export default function MainMenu({ save, onPlay, onDatabase, onToggleMute }: Props) {
  return (
    <div className="relative w-full h-full overflow-hidden scanlines">
      <CityBackdrop />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 px-4">
        <div className="text-center slidein">
          <div className="font-pixel text-[10px] tracking-[0.4em] neon-y mb-3 flicker">NIGHT CITY // 2087 // SETOR 9</div>
          <h1 className="font-pixel text-4xl md:text-6xl leading-tight">
            <span className="neon-m glitch inline-block">NEON</span>{' '}
            <span className="neon-c">HORDE</span>
          </h1>
          <div className="font-pixel text-[10px] md:text-xs mt-3 text-white/80 tracking-widest">CYBERPUNK HORDE DEFENSE</div>
        </div>

        <div className="flex items-end justify-center gap-0 my-2 flex-wrap max-w-5xl">
          {TROOPS.map((t, i) => (
            <button key={t.id} onClick={() => onDatabase('troops')} title={`${t.name} — ${t.title}`}
              className="relative group -mx-0.5" style={{ animation: `pop .4s ${i * 0.04}s both` }}>
              <img src={portraitURL(t.id, 1)} alt={t.name}
                className="pixelated w-14 h-14 md:w-[68px] md:h-[68px] border border-transparent group-hover:border-pink-400 group-hover:z-10 group-hover:-translate-y-1 transition-all"
                style={{ filter: save.unlocked.includes(t.id) || t.unlockCost === 0 ? '' : 'grayscale(1) brightness(.45)' }} />
              <span className="absolute inset-x-0 bottom-0 hidden group-hover:block font-pixel text-[5px] bg-black/90 text-center py-0.5" style={{ color: t.look.glow }}>{t.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-72">
          <button className="btn text-xs py-4" onClick={onPlay}>▶ INICIAR INVASÃO</button>
          <button className="btn btn-m" onClick={() => onDatabase('troops')}>BANCO DE MERCENÁRIOS</button>
          <button className="btn btn-y" onClick={() => onDatabase('lab')}>CYBERWARE LAB</button>
          <button className="btn btn-m" onClick={() => onDatabase('bestiary')}>BESTIÁRIO</button>
          <button className="btn" onClick={onToggleMute}>{save.settings.muted ? '🔇 SOM: OFF' : '🔊 SOM: ON'}</button>
        </div>

        <div className="flex items-center gap-4 font-pixel text-[9px] mt-2">
          <span className="neon-y">◆ {save.chips} CHIPS</span>
          <span className="text-white/40">AUTO WAVE {save.settings.autoWave ? <span className="text-green-300">ON</span> : <span className="text-white/50">OFF</span>}</span>
          <span className="text-white/25">v2.0 // EXPANSÃO DE DOSSIÊ</span>
        </div>
        <div className="text-white/40 text-base text-center max-w-xl">
          Megacorporações soltaram androides nas ruas. Cyberpsicopatas tomaram os becos. Monte seu esquadrão de mercenários, conheça cada um no banco de dados e defenda o núcleo.
        </div>
      </div>
    </div>
  );
}
