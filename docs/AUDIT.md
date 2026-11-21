# Auditoria técnica — Persona 2

## Escopo e independência
Revisão dos módulos próprios desta versão: `main.js`, `ai.js`, `save.js`, `tiger.js`, `world.js`, `ui.js` e interface HTML/CSS. Não foram consultados ou reutilizados arquivos de outra implementação.

## Achados corrigidos

1. **Uso de estado antes da inicialização (bloqueador de execução):** `brain.position` era acessado antes da declaração `const brain`, causando `ReferenceError` no arranque. A carga/criação do estado foi movida para antes do uso; a posição restaurada também é limitada à área do mundo.
2. **Erro de sintaxe em `world.js` (crítico):** identificador `leafGeo` declarado duas vezes no mesmo escopo. Renomeada a geometria das folhas caindo. Os seis módulos passaram depois em `node --check`.
3. **Zona descartada ao definir destino (médio):** `setTarget()` não preservava o nome da zona, afetando visita/memória. A zona agora acompanha o alvo.
4. **Aprendizado de preferência incorreto (alto):** visitas de explorar, comer e beber eram contadas como brincadeira, podendo transformar lagoa/fruteira em local favorito de brincar. Agora somente ações de descanso e brincadeira treinam esses mapas; exploração só atualiza contagem de visitas.
5. **Reset podia recriar o save (alto):** `beforeunload` salvava novamente após `clearSave()`. Uma flag de reset impede a gravação durante o reload.
6. **Save malformado/incompleto e envelhecimento acumulado (médio):** brain agora aplica valores padrão/limites a necessidades, personalidade, posição, idade, preferências e memórias. Crescimento processa qualquer rollover restante. Tempo offline acumula no máximo dois dias de crescimento.
7. **Texto da memória tratado como HTML (médio):** renderização trocada por nós DOM e `textContent`, evitando execução de conteúdo alterado no localStorage.
8. **Dependência remota da engine (produto/offline):** Three.js 0.160 foi copiado para `vendor/`; removida referência CDN e incluída licença MIT.

## Verificações executadas

- `node --check` nos seis arquivos JS — todos passaram após correção.
- Smoke test Node: criação de estado, decisão Utility AI, atualização de necessidades, memória e consulta do estágio inicial — passou.
- Revisão manual de exports/imports, destinos, ações, armazenamento e ids da HUD — sem incompatibilidade estrutural conhecida.

## Riscos/limitações ainda abertos

- **Sem execução em browser gráfico nesta sessão:** WebGL, aparência final, ergonomia, `localStorage`, raycasting e comportamento real de controles precisam de validação no preview/browser.
- A colisão é um desvio heurístico circular; ainda pode prender ou aproximar o tigre de objetos. Requer teste em jogo.
- O chão tem ondulação por vértices, mas a altura do personagem é plana; algumas áreas podem mostrar leve interseção/flutuação.
- As animações são procedurais e aproximadas; não há rig ósseo nem sincronização rigorosa pata/velocidade.
- Alguns movimentos de exploração podem mirar pontos de interesse sem considerar a lagoa como obstáculo navegável; o desvio atual não é pathfinding.
- A primeira abertura requer servidor HTTP local (módulos ES não funcionam via `file://`). O jogo não necessita internet depois dos arquivos baixados.

## Veredito
**Protótipo executável estruturalmente, sem bloqueador sintático conhecido; não certificado visualmente.** Próximo gate de qualidade é a inspeção no preview e teste de interações/save pelo navegador, seguido de correção dos problemas observados antes de considerar um pacote Windows.
