import type { EnemyDef } from '../types';

export const ENEMIES: Record<string, EnemyDef> = {
  // ===== CYBERPSICOPATAS =====
  psycho: { id: 'psycho', name: 'Cyberpsicopata', faction: 'psycho', hp: 7, speed: 38, reward: 3, lives: 1,
    resist: { emp: 0.4 }, desc: 'Humano com implantes demais e sanidade de menos. Básico, mas em bando.' },
  runner: { id: 'runner', name: 'Psicopata Veloz', faction: 'psycho', hp: 4, speed: 88, reward: 3, lives: 1,
    resist: { emp: 0.4, cryo: 1.3 }, desc: 'Pernas Reflex-boost ilegais. Muito rápido, muito frágil.' },
  brute: { id: 'brute', name: 'Psicopata Blindado', faction: 'psycho', hp: 32, speed: 25, reward: 8, lives: 3,
    resist: { kinetic: 0.45, blade: 0.55, emp: 0.4, explosive: 1.2 }, desc: 'Placas subdérmicas militares. Resiste a balas e lâminas.', size: 1.1 },
  bomber: { id: 'bomber', name: 'Psicopata Explosivo', faction: 'psycho', hp: 11, speed: 42, reward: 5, lives: 2,
    resist: { emp: 0.4, fire: 1.4 }, desc: 'Coração substituído por uma granada. Ao morrer, desativa tropas próximas.', behavior: 'explode' },
  infiltrator: { id: 'infiltrator', name: 'Psicopata Infiltrador', faction: 'psycho', hp: 9, speed: 52, reward: 5, lives: 2,
    resist: { emp: 0.4 }, camo: true, desc: 'Camuflagem óptica instável. Invisível para tropas sem detecção.' },
  mutant: { id: 'mutant', name: 'Psicopata Mutante', faction: 'psycho', hp: 22, speed: 34, reward: 7, lives: 2,
    resist: { emp: 0.4, fire: 0.6 }, desc: 'Implantes instáveis causam surtos de velocidade. Divide-se ao morrer.', behavior: 'mutant', size: 1.05 },
  // ===== ANDROIDS =====
  combat: { id: 'combat', name: 'Android de Combate', faction: 'android', hp: 14, speed: 40, reward: 4, lives: 1,
    resist: { kinetic: 0.8, emp: 1.8, fire: 0.7 }, desc: 'Unidade padrão Militech. Vulnerável a EMP.' },
  heavy: { id: 'heavy', name: 'Android Pesado', faction: 'android', hp: 75, speed: 20, reward: 14, lives: 5,
    resist: { kinetic: 0.4, blade: 0.4, explosive: 0.75, emp: 1.6, fire: 0.6 }, desc: 'Tanque bípede. Extremamente resistente.', size: 1.25 },
  drone: { id: 'drone', name: 'Drone Aéreo', faction: 'android', hp: 9, speed: 58, reward: 4, lives: 1,
    resist: { emp: 2 }, flying: true, desc: 'Voa sobre a rota. Imune a corpo a corpo e explosivos de solo.' },
  medic: { id: 'medic', name: 'Android Médico', faction: 'android', hp: 18, speed: 36, reward: 7, lives: 2,
    resist: { emp: 1.8 }, desc: 'Repara inimigos próximos continuamente. Prioridade alta.', behavior: 'heal' },
  support: { id: 'support', name: 'Android de Suporte', faction: 'android', hp: 20, speed: 34, reward: 7, lives: 2,
    resist: { emp: 1.8, energy: 0.7 }, desc: 'Projeta escudos energéticos nos aliados próximos.', behavior: 'shield' },
  assassin: { id: 'assassin', name: 'Android Assassino', faction: 'android', hp: 16, speed: 62, reward: 8, lives: 3,
    resist: { emp: 1.5, kinetic: 0.8 }, camo: true, desc: 'Camuflado e veloz. Teleporta-se à frente periodicamente.', behavior: 'blink' },
  experimental: { id: 'experimental', name: 'Unidade Experimental', faction: 'android', hp: 55, speed: 30, reward: 15, lives: 4,
    resist: { emp: 1.3 }, desc: 'IA adaptativa: desenvolve resistência ao último tipo de dano recebido.', behavior: 'adapt', size: 1.15 },
  // ===== HOLO CLONE =====
  holo: { id: 'holo', name: 'Clone Holográfico', faction: 'android', hp: 40, speed: 50, reward: 0, lives: 3,
    resist: { emp: 3 }, desc: 'Projeção sólida do Chrome Saint.' },
  // ===== CHEFES =====
  butcher: { id: 'butcher', name: 'THE BUTCHER', faction: 'boss', hp: 600, speed: 15, reward: 300, lives: 999,
    resist: { kinetic: 0.8, emp: 0.4 }, size: 1.7,
    desc: 'Ex-açougueiro de Kabuki. Braços de prensa hidráulica. Investe, esmaga e chama a matilha.' },
  archon: { id: 'archon', name: 'ARCHON-09', faction: 'boss', hp: 1500, speed: 14, reward: 500, lives: 999,
    resist: { emp: 1.2, kinetic: 0.7, fire: 0.5 }, size: 1.7,
    desc: 'Protótipo de supremacia urbana da Kang-Tech. Escudo energético, drones e pulso EMP.' },
  saint: { id: 'saint', name: 'THE CHROME SAINT', faction: 'boss', hp: 2600, speed: 18, reward: 800, lives: 999,
    resist: { emp: 0.6 }, size: 1.7,
    desc: 'O primeiro humano 100% reconstruído. Teletransporta, clona-se e sobrecarrega.' },
};

export const BOSS_INFO: Record<string, { subtitle: string; quote: string; color: string; phaseThresholds: [number, number]; coreDamage: number }> = {
  butcher: { subtitle: 'O AÇOUGUEIRO DE KABUKI', quote: '"CARNE... E... CROMO..."', color: '#ff3b3b', phaseThresholds: [0.6, 0.3], coreDamage: 24 },
  archon: { subtitle: 'PROTÓTIPO DE SUPREMACIA URBANA', quote: '"ALVO IDENTIFICADO. PROTOCOLO DE EXTERMÍNIO ATIVO."', color: '#00fff0', phaseThresholds: [0.5, 0.2], coreDamage: 38 },
  saint: { subtitle: 'A ASCENSÃO DA CARNE AO METAL', quote: '"Eu não sou mais humano. Eu sou a resposta."', color: '#fcee0a', phaseThresholds: [0.5, 0.25], coreDamage: 56 },
};


/** Damage to the core when a boss escapes; scales with boss threat and endless reinforcement. */
export function bossCoreDamage(type: string, hard = false): number {
  const base = BOSS_INFO[type]?.coreDamage ?? 30;
  return Math.round(base * (hard ? 1.5 : 1));
}
