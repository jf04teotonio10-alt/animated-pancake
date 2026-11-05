import { useEffect, useState } from 'react';
import MainMenu from './ui/MainMenu';
import MapSelect from './ui/MapSelect';
import Database from './ui/Database';
import GameScreen from './ui/GameScreen';
import { loadSave, writeSave, type SaveData } from './game/systems/save';
import { audio } from './game/systems/audio';

type Screen = { id: 'menu' } | { id: 'maps' } | { id: 'db'; tab: 'troops' | 'lab' | 'bestiary' } | { id: 'game'; map: string; key: number };

export default function App() {
  const [save, setSaveState] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ id: 'menu' });

  const setSave = (s: SaveData) => { setSaveState(s); writeSave(s); };
  const commit = (fn: (s: SaveData) => SaveData) => setSaveState(prev => { const n = fn(prev); writeSave(n); return n; });

  useEffect(() => { audio.setMuted(save.settings.muted); }, [save.settings.muted]);

  // unlock audio on first interaction
  useEffect(() => {
    const h = () => { audio.init(); audio.setMuted(save.settings.muted); audio.startMusic(); };
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  return (
    <div className="w-full h-full">
      {screen.id === 'menu' && (
        <MainMenu save={save}
          onPlay={() => { audio.play('click'); setScreen({ id: 'maps' }); }}
          onDatabase={tab => { audio.play('click'); setScreen({ id: 'db', tab }); }}
          onToggleMute={() => setSave({ ...save, settings: { ...save.settings, muted: !save.settings.muted } })} />
      )}
      {screen.id === 'maps' && <MapSelect save={save} onBack={() => setScreen({ id: 'menu' })} onPick={id => { audio.play('wave'); setScreen({ id: 'game', map: id, key: Date.now() }); }} />}
      {screen.id === 'db' && <Database save={save} tab={screen.tab} setSave={setSave} onBack={() => setScreen({ id: 'menu' })} />}
      {screen.id === 'game' && <GameScreen key={screen.key} mapId={screen.map} save={save} commit={commit} onExit={() => setScreen({ id: 'menu' })} />}
    </div>
  );
}
