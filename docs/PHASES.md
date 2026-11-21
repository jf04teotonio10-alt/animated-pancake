# Registro de desenvolvimento por fases

## Fase 0 — Auditoria e planejamento técnico
- **Implementado:** inspecionado o ambiente (Debian 12, Node.js 22, Python 3.11, ~3,8 GiB RAM; Godot não instalado). Referência recebida: criatura low-poly arredondada, silhueta simples, olhos expressivos e clareira verde clara.
- **Decisão:** Three.js 0.160 + ES modules. A engine Three.js fica vendorizada localmente; execução via servidor HTTP local, sem CDN/serviços externos em runtime. Módulos separados por responsabilidade.
- **Arquivos:** `index.html`, `css/style.css`, `js/*.js`, `vendor/three.module.js`.
- **Teste:** inspeção de ambiente e referência; não foi instalada engine incompatível.
- **Pendência:** empacotador instalável Windows (Electron/Tauri) não faz parte desta entrega.

## Fase 1 — Protótipo 3D
- **Implementado:** modelo procedural do tigre albino Alba; floresta em clareira limitada; câmera orbital com zoom e modo livre/seguindo; sugestão de destino por duplo clique; desvio básico de obstáculos.
- **Arquivos:** `js/tiger.js`, `js/world.js`, `js/main.js`.
- **Teste:** análise estática/sintática dos seis módulos JavaScript concluída. O navegador gráfico não está disponível no ambiente de execução do agente, então inspeção visual interativa continua pendente.

## Fase 2 — Animações
- **Implementado:** ciclo de caminhada/corrida, respiração, balanço de cauda, piscar, orelhas atentas, farejar, beber, dormir e pulo de brincadeira.
- **Arquivos:** `js/tiger.js`, orquestração em `js/main.js`.
- **Teste:** revisão de fluxo e sintaxe. Transições/foot sliding precisam de avaliação visual em navegador e ajuste fino após feedback.

## Fase 3 — Necessidades e personalidade
- **Implementado:** fome, sede, energia, curiosidade e conforto; seis dimensões de personalidade. Utility AI pontua dormir, beber, comer, explorar, brincar, observar e interação social. Personalidade e contexto alteram as decisões.
- **Arquivos:** `js/ai.js`, `js/main.js`, `js/ui.js`.
- **Teste:** teste Node executado para criar brain, decidir ação, avançar necessidades e validar estágio inicial; resultados sem erro.

## Fase 4 — Memória e aprendizado
- **Implementado:** até 30 memórias, visitas por zona, favoritos de descanso/brincadeira e ajuste gradual de personalidade por experiências. Visitas exploratórias não são mais confundidas com preferências de brincadeira.
- **Arquivos:** `js/ai.js`, `js/main.js`, `js/ui.js`.
- **Teste:** fluxo de memória exercitado no teste Node; revisão manual dos tipos de ação/preferência.

## Fase 5 — Crescimento
- **Implementado:** filhote, em desenvolvimento e jovem; escala/velocidade mudam gradualmente. Um dia de jogo a cada 180 segundos ativos. Tempo offline envelhece com desaceleração e limite de dois dias por ausência (além do teto de necessidades offline de 8 horas).
- **Arquivos:** `js/ai.js`, `js/save.js`, `js/main.js`.
- **Teste:** transição inicial `stageOf()` validada no teste Node; rollover de múltiplos dias protegido por loop.

## Fase 6 — Interface e persistência
- **Implementado:** HUD responsivo, barras, estado/humor/local, memórias, preferências, pensamento, seis interações por botão/teclas 1–6, salvamento local, restauração e progresso offline. Reset confirmado antes de apagar; evento `beforeunload` não recria o save apagado. Texto de memórias usa `textContent` em vez de HTML.
- **Arquivos:** `index.html`, `css/style.css`, `js/ui.js`, `js/save.js`, `js/main.js`.
- **Teste:** além da revisão do caminho save/load/reset, smoke test Node com `localStorage` simulado cobriu save/load, decaimento offline, teto de 8h, avanço de idade e clear. Integração no browser real permanece pendente.

## Fase 7 — Otimização e polimento
- **Implementado:** recursos geométricos compartilhados, InstancedMesh para grama/folhas, limite de pixel ratio e mapa de sombras moderado; Three.js vendorizado para remover dependência de CDN.
- **Auditoria Persona 2:** corrigidos acesso ao brain antes da inicialização (bloqueador), `leafGeo` duplicado (erro sintático), zona perdida ao definir destino, preferências contaminadas por visitas de exploração, valores inválidos em save, idade offline acumulada sem rollover, reset que poderia salvar novamente no `beforeunload`, e renderização de memória via HTML.
- **Testes finais registrados:** `node --check` passou nos seis módulos (`ai`, `main`, `save`, `tiger`, `ui`, `world`); smoke tests de IA e save/load passaram; servidor HTTP respondeu 200 para página, JS, CSS, Three.js e documentação; `git diff --check` sem erros. Teste visual e desempenho FPS em navegador ainda não executados nesta sessão.
- **Pendências:** executar inspeção visual/browser (HUD, WebGL, interações, salvar/reabrir, resize e mobile), avaliar FPS em PC modesto, validar fisicamente os pontos de interesse/caminhos e ajustar qualquer artefato visual observado.
