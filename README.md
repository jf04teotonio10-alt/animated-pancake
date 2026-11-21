# Tiger Life 3D: Albino Edition 🐯

Simulador 3D de vida animal: um filhote de tigre albino chamado **Alba** vive em uma floresta low-poly, explora, descansa, dorme, brinca, aprende e cresce — de forma autônoma, com personalidade, memória e salvamento local.

> Projeto independente (Arena AI Agent Mode). Inspiração visual ampla: criatura 3D estilizada de formas simples e arredondadas + atmosfera acolhedora de jogos de aventura low-poly. Nenhum modelo, textura ou mapa de terceiros foi copiado.

## Como jogar

Sirva a pasta por HTTP local (módulos ES não funcionam ao abrir diretamente via `file://`): no Windows, na pasta do projeto execute `py -m http.server 8000` e acesse `http://localhost:8000` no Chrome/Edge/Firefox. Funciona **sem internet** depois de baixado/extraído: Three.js está incluso em `vendor/`; a funcionalidade do jogo não usa serviços externos.

| Ação | Como |
|---|---|
| Girar câmera | Arrastar com o mouse |
| Zoom | Roda do mouse |
| Mover câmera | `WASD` |
| Câmera segue / livre | `C` |
| Sugerir destino | **Duplo clique** no chão (a Alba pode obedecer ou ignorar, conforme a personalidade dela) |
| Interagir | Botões na tela ou teclas `1–6` |

**Interações:** 🐾 Acariciar · 🧶 Jogar brinquedo · 🍓 Dar comida · 💧 Ir ao lago · 😴 Dormir · 🏠 Chamar

A Alba vive sozinha: se você não fizer nada, ela decide o que fazer com base em fome, sede, energia, curiosidade, conforto, personalidade, memórias e local favorito.

## Sistemas

- **Necessidades:** fome, sede, energia, curiosidade, conforto (decaem e se restauram com ações).
- **Personalidade:** curiosidade, coragem, timidez, sociabilidade, independência, brincalhão — moldada por experiências.
- **Memória e aprendizado:** lugares visitados, local favorito de descanso/brincadeira, eventos positivos/negativos; preferências influenciam decisões futuras (Utility AI).
- **Crescimento:** Filhote → Filhote em desenvolvimento → Jovem (1 dia a cada 3 min; escala e velocidade mudam).
- **Persistência:** `localStorage`, salvamento automático a cada 10s + ao fechar; necessidades decaem offline com teto seguro de 8h e idade avança no máximo dois dias por sessão ausente.
- **Ambiente:** clareira com árvores, arbustos, flores, pedras, troncos, lagoa, arbusto de frutas, toca, borboletas, pássaros e folhas caindo. Otimizado (geometrias compartilhadas, sombras 1024, pixel ratio limitado).

## Tecnologia

- **Three.js 0.160** (WebGL) + JavaScript modular, sem build. Escolha documentada em `docs/PHASES.md` (Fase 0): Godot 4.x indisponível no ambiente de desenvolvimento; web 3D roda no Windows via navegador e pode ser empacotada depois (Electron/Tauri) sem reescrever o jogo.
- Estrutura: `index.html` · `css/style.css` · `js/main.js` (orquestração) · `js/tiger.js` (modelo + animação procedural) · `js/world.js` (floresta) · `js/ai.js` (Utility AI + memória) · `js/ui.js` (HUD) · `js/save.js` (persistência) · `vendor/three.module.js`

## Documentação

- `docs/PHASES.md` — registro por fase (implementado, testes, problemas, correções, pendências).
- `docs/AUDIT.md` — relatório da auditoria técnica (Persona 2).

## Próximos passos sugeridos

Empacotar para Windows (Electron), novos biomas, outros animais sociais, ciclo dia/noite, sons procedurais via WebAudio.
