import { useEffect, useRef, useState } from 'react';
import MainMenu from './ui/MainMenu';
import MapSelect from './ui/MapSelect';
import Database from './ui/Database';
import GameScreen from './ui/GameScreen';
import SettingsPanel from './ui/SettingsPanel';
import { loadSaveResult, writeSave, type SaveData } from './game/systems/save';
import { audio } from './game/systems/audio';

type Screen = { id: 'menu' } | { id: 'maps' } | { id: 'db'; tab: 'troops' | 'lab' | 'bestiary' } | { id: 'game'; map: string; key: number };

export default function App() {
  const [initialSave] = useState(loadSaveResult);
  const [save, setSaveState] = useState<SaveData>(initialSave.data);
  const [saveWarning, setSaveWarning] = useState<string | null>(initialSave.warning);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ id: 'menu' });
  const settingsRef = useRef(save.settings);

  const setSave = (s: SaveData) => setSaveState(s);
  const commit = (fn: (s: SaveData) => SaveData) => setSaveState(fn);

  useEffect(() => { setSaveWarning(writeSave(save)); }, [save]);
  useEffect(() => {
    settingsRef.current = save.settings;
    audio.configure(save.settings);
  }, [save.settings]);

  // unlock audio on first interaction
  useEffect(() => {
    const h = () => { audio.init(); audio.configure(settingsRef.current); audio.startMusic(); };
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  return (
    <div className="w-full h-full">
      {saveWarning && (
        <div role="alert" className="fixed z-50 top-0 left-0 right-0 bg-red-950 text-white text-center px-4 py-2 border-b border-red-400">
          ⚠ {saveWarning}
          <button className="btn btn-y !py-0 !px-2 ml-2" onClick={() => setSaveWarning(writeSave(save))}>TENTAR NOVAMENTE</button>
        </div>
      )}
      {screen.id === 'menu' && (
        <MainMenu save={save}
          onPlay={() => { audio.play('click'); setScreen({ id: 'maps' }); }}
          onDatabase={tab => { audio.play('click'); setScreen({ id: 'db', tab }); }}
          onToggleMute={() => setSave({ ...save, settings: { ...save.settings, muted: !save.settings.muted } })}
          onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {screen.id === 'maps' && <MapSelect save={save} onBack={() => setScreen({ id: 'menu' })} onPick={id => { audio.play('wave'); setScreen({ id: 'game', map: id, key: Date.now() }); }} />}
      {screen.id === 'db' && <Database save={save} tab={screen.tab} setSave={setSave} onBack={() => setScreen({ id: 'menu' })} />}
      {screen.id === 'game' && <GameScreen key={screen.key} mapId={screen.map} save={save} commit={commit} onExit={() => setScreen({ id: 'menu' })} onOpenSettings={() => setSettingsOpen(true)} />}
      {settingsOpen && <SettingsPanel save={save} commit={commit} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
