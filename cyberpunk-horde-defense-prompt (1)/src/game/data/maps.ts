import type { MapDef } from '../types';

export const COLS = 20;
export const ROWS = 12;
export const TILE = 32;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const MAPS: MapDef[] = [
  {
    id: 'night', name: 'NIGHT DISTRICT', subtitle: 'Ruas decadentes de Kabuki-9', difficulty: 1, theme: 'street', rain: true,
    desc: 'Becos encharcados de néon. Rota única e sinuosa — ideal para aprender a defender.',
    paths: [[[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [20, 9]]],
    obstacles: [
      [0, 0],
      [1, 3],
      [5, 3],
      [1, 4],
      [18, 4],
      [2, 5],
      [5, 6],
      [8, 7],
      [10, 7],
      [2, 8],
      [11, 8],
      [5, 9],
      [13, 10],
      [16, 10],
      [18, 10],
      [0, 11]
    ],
    nodes: [
      [10, 4],
      [15, 4],
      [3, 6]
    ],
    hazards: [
      [8, 6],
      [5, 4],
      [5, 7]
    ],
    palette: { ground: '#14101f', ground2: '#1b1530', path: '#2a2438', path2: '#352d47', neonA: '#ff2bd6', neonB: '#00fff0', sky: '#0a0614' },
  },
  {
    id: 'foundry', name: 'FOUNDRY ZERO', subtitle: 'Complexo industrial abandonado', difficulty: 1.15, theme: 'industrial',
    desc: 'Duas esteiras de entrada convergem no coração da fundição. Divida sua defesa.',
    paths: [
      [[-1, 1], [6, 1], [6, 5], [12, 5], [12, 10], [20, 10]],
      [[-1, 9], [8, 9], [8, 5], [12, 5], [12, 10], [20, 10]],
    ],
    obstacles: [
      [1, 0],
      [5, 0],
      [9, 0],
      [11, 0],
      [10, 1],
      [16, 1],
      [5, 2],
      [14, 3],
      [4, 4],
      [0, 6],
      [17, 6],
      [6, 7],
      [16, 7],
      [5, 8],
      [15, 9],
      [2, 11]
    ],
    nodes: [
      [13, 6],
      [6, 8],
      [14, 9]
    ],
    hazards: [
      [2, 2],
      [3, 0],
      [8, 4]
    ],
    palette: { ground: '#17140f', ground2: '#221d14', path: '#3a3226', path2: '#4a3f2e', neonA: '#ff9f1c', neonB: '#fcee0a', sky: '#0d0a06' },
  },
  {
    id: 'corp', name: 'ARASAKA PLAZA', subtitle: 'Distrito comercial corporativo', difficulty: 1.25, theme: 'corp',
    desc: 'Uma espiral de mármore e hologramas até o núcleo. Rota longa, mas espaço apertado.',
    paths: [[[10, -1], [10, 1], [1, 1], [1, 10], [18, 10], [18, 3], [4, 3], [4, 8], [15, 8], [15, 5], [8, 5]]],
    obstacles: [
      [1, 0],
      [14, 0],
      [19, 1],
      [5, 2],
      [11, 2],
      [13, 2],
      [3, 3],
      [2, 6],
      [10, 7],
      [14, 7],
      [17, 7],
      [0, 8],
      [2, 9],
      [3, 11],
      [9, 11],
      [12, 11]
    ],
    nodes: [
      [6, 4],
      [8, 6],
      [7, 7]
    ],
    hazards: [
      [3, 0],
      [4, 0],
      [12, 7]
    ],
    palette: { ground: '#0e1420', ground2: '#141c2c', path: '#26324a', path2: '#2f3d5a', neonA: '#00fff0', neonB: '#ff3b3b', sky: '#060a12' },
  },
  {
    id: 'metro', name: 'LINHA 0 // METRÔ', subtitle: 'Estação subterrânea abandonada', difficulty: 1.35, theme: 'metro',
    desc: 'Dois túneis, uma saída. Os trilhos ainda carregam eletricidade.',
    paths: [
      [[-1, 3], [7, 3], [7, 1], [13, 1], [13, 6], [20, 6]],
      [[-1, 8], [5, 8], [5, 10], [15, 10], [15, 6], [20, 6]],
    ],
    obstacles: [
      [15, 0],
      [16, 0],
      [5, 1],
      [9, 2],
      [16, 2],
      [8, 3],
      [15, 4],
      [11, 5],
      [17, 5],
      [0, 6],
      [10, 6],
      [11, 6],
      [12, 6],
      [10, 9],
      [3, 10],
      [11, 11]
    ],
    nodes: [
      [7, 9],
      [8, 9],
      [16, 10]
    ],
    hazards: [
      [1, 4],
      [1, 7],
      [10, 11]
    ],
    palette: { ground: '#101414', ground2: '#161c1c', path: '#2a3030', path2: '#343c3c', neonA: '#39ff88', neonB: '#fcee0a', sky: '#060808' },
  },
  {
    id: 'lab', name: 'BIOTEK LAB-7', subtitle: 'Laboratório de experimentos cibernéticos', difficulty: 1.5, theme: 'lab',
    desc: 'Corredores estéreis em zigue-zague. Pouco tempo de reação, muitos pontos de cruzamento.',
    paths: [[[-1, 6], [3, 6], [3, 1], [8, 1], [8, 10], [12, 10], [12, 1], [16, 1], [16, 6], [20, 6]]],
    obstacles: [
      [1, 1],
      [19, 1],
      [0, 2],
      [5, 2],
      [7, 2],
      [10, 2],
      [15, 2],
      [2, 3],
      [4, 3],
      [9, 3],
      [13, 3],
      [1, 5],
      [0, 7],
      [7, 7],
      [1, 11],
      [3, 11]
    ],
    nodes: [
      [2, 2],
      [11, 4],
      [1, 7]
    ],
    hazards: [
      [12, 11],
      [9, 5],
      [0, 5]
    ],
    palette: { ground: '#0f1418', ground2: '#151d22', path: '#2a3a40', path2: '#33464e', neonA: '#9be7ff', neonB: '#c6ff00', sky: '#05080a' },
  },
  {
    id: 'favela', name: 'FAVELA CHROME', subtitle: 'Morro tecnológico de Pacifica', difficulty: 1.7, theme: 'favela', rain: true,
    desc: 'Três entradas pelos becos do morro. Caos total — para netrunners experientes.',
    paths: [
      [[5, -1], [5, 4], [10, 4], [10, 8], [20, 8]],
      [[-1, 10], [10, 10], [10, 8], [20, 8]],
      [[15, -1], [15, 8], [20, 8]],
    ],
    obstacles: [
      [0, 0],
      [2, 0],
      [11, 0],
      [0, 3],
      [1, 3],
      [3, 3],
      [18, 3],
      [11, 4],
      [16, 4],
      [2, 5],
      [16, 5],
      [7, 7],
      [18, 7],
      [17, 9],
      [11, 10],
      [5, 11]
    ],
    nodes: [
      [7, 3],
      [14, 5],
      [15, 9]
    ],
    hazards: [
      [13, 9],
      [16, 2],
      [16, 9]
    ],
    palette: { ground: '#1a1210', ground2: '#241914', path: '#3d2c24', path2: '#4a372d', neonA: '#ff2bd6', neonB: '#c6ff00', sky: '#0c0806' },
  },
];
