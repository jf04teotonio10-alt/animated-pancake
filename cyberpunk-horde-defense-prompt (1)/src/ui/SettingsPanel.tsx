import { useEffect, useState } from 'react';
import type { SaveData, BackupInfo } from '../game/systems/save';
import { listBackups, restoreBackup, resetSave } from '../game/systems/save';
import { audio } from '../game/systems/audio';

interface Props {
  save: SaveData;
  commit: (fn: (s: SaveData) => SaveData) => void;
  onClose: () => void;
}
type Pending = { type: 'restore'; key: string } | { type: 'reset' } | null;

export default function SettingsPanel({ save, commit, onClose }: Props) {
  const [backups, setBackups] = useState<BackupInfo[]>(() => listBackups());
  const [pending, setPending] = useState<Pending>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => { setBackups(listBackups()); }, [save]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPending(null); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (patch: Partial<SaveData['settings']>) =>
    commit(s => ({ ...s, settings: { ...s.settings, ...patch } }));

  const confirm = () => {
    if (!pending) return;
    audio.play('click');
    const result = pending.type === 'restore' ? restoreBackup(pending.key) : resetSave();
    if (result.error) { setStatus(result.error); setPending(null); return; }
    setSaveFromResult(result.data!);
  };

  const setSaveFromResult = (data: SaveData) => {
    commit(() => data);
    setBackups(listBackups());
    setPending(null);
    setStatus(pending?.type === 'restore' ? 'Backup restaurado. O save anterior foi preservado em outro backup.' : 'Save resetado. O progresso anterior foi preservado em um backup.');
  };

  const pct = (v: number) => Math.round(v * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Configurações">
      <div className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 border-cyan-400/50">
        <div className="flex items-center justify-between mb-4">
          <div className="font-pixel text-[11px] neon-c">// CONFIGURAÇÕES</div>
          <button className="btn btn-m !px-3" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <section className="mb-5">
          <h3 className="font-pixel text-[9px] neon-y mb-3">ÁUDIO</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <button className="btn" onClick={() => update({ muted: !save.settings.muted })}>
              {save.settings.muted ? '🔇 ÁUDIO MESTRE: OFF' : '🔊 ÁUDIO MESTRE: ON'}
            </button>
            <button className="btn" onClick={() => update({ music: !save.settings.music })}>
              {save.settings.music ? '♪ MÚSICA: ON' : '♪ MÚSICA: OFF'}
            </button>
            <label className="panel p-3 flex flex-col gap-2">
              <span className="font-pixel text-[7px] text-white/70">VOLUME DA MÚSICA · {pct(save.settings.musicVolume)}%</span>
              <input type="range" min={0} max={100} value={pct(save.settings.musicVolume)} aria-label="Volume da música"
                className="w-full accent-cyan-300"
                onChange={e => update({ musicVolume: Number(e.target.value) / 100 })} />
            </label>
            <label className="panel p-3 flex flex-col gap-2">
              <span className="font-pixel text-[7px] text-white/70">VOLUME DOS EFEITOS · {pct(save.settings.sfxVolume)}%</span>
              <input type="range" min={0} max={100} value={pct(save.settings.sfxVolume)} aria-label="Volume dos efeitos"
                className="w-full accent-pink-400"
                onChange={e => update({ sfxVolume: Number(e.target.value) / 100 })} />
            </label>
          </div>
        </section>

        <section className="mb-5">
          <h3 className="font-pixel text-[9px] neon-y mb-3">AUTO WAVE</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <button className="btn" onClick={() => update({ autoWave: !save.settings.autoWave })}>
              AUTO WAVE: {save.settings.autoWave ? 'ON' : 'OFF'}
            </button>
            <label className="panel p-3 flex flex-col gap-2">
              <span className="font-pixel text-[7px] text-white/70">INTERVALO · {save.settings.autoInterval}s</span>
              <input type="range" min={3} max={12} value={save.settings.autoInterval} aria-label="Intervalo do Auto Wave"
                className="w-full accent-yellow-300"
                onChange={e => update({ autoInterval: Number(e.target.value) })} />
            </label>
          </div>
        </section>

        <section>
          <h3 className="font-pixel text-[9px] neon-y mb-2">SAVE E BACKUPS</h3>
          <div className="text-white/60 leading-tight mb-3">
            Restaurar ou resetar exige confirmação. Antes de qualquer uma das ações, o save atual é copiado para um novo backup; nenhum dado é apagado automaticamente.
          </div>
          <div className="space-y-2 mb-3">
            {backups.length === 0 && <div className="text-white/40">Nenhum backup disponível ainda.</div>}
            {backups.map(b => (
              <div key={b.key} className="panel p-2 flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <div className="font-pixel text-[7px] truncate" style={{ color: b.valid ? '#39ff88' : '#ff3b3b' }}>{b.key}</div>
                  <div className="text-white/50 text-sm">
                    {b.valid ? `Versão ${b.version} · ◆ ${b.chips} chips` : b.warning}
                  </div>
                </div>
                <button className="btn btn-y !text-[7px]" disabled={!b.valid}
                  onClick={() => { setPending({ type: 'restore', key: b.key }); setStatus(null); }}>
                  RESTAURAR
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-m w-full" onClick={() => { setPending({ type: 'reset' }); setStatus(null); }}>RESETAR SAVE</button>
          {status && <div role="status" className="mt-3 text-center text-white/80 leading-tight">{status}</div>}
        </section>

        {pending && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" role="alertdialog" aria-modal="true">
            <div className="panel p-5 max-w-md border-red-400/60">
              <div className="font-pixel text-[10px] neon-r mb-3">CONFIRMAR {pending.type === 'reset' ? 'RESET' : 'RESTAURAÇÃO'}</div>
              <div className="text-white/80 leading-tight mb-4">
                {pending.type === 'reset'
                  ? 'O progresso atual será substituído por um save novo. Uma cópia de segurança será criada antes desta ação.'
                  : `O backup ${pending.key} substituirá o save atual. Uma cópia do save atual será criada antes desta ação.`}
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn" onClick={() => setPending(null)}>CANCELAR</button>
                <button className="btn btn-m" onClick={confirm}>CONFIRMAR {pending.type === 'reset' ? 'RESET' : 'RESTAURAÇÃO'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
