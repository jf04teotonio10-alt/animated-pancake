// Interface — HUD, balão de pensamento, memórias e interações.
import { stageOf, moodOf, thoughtOf, ZONES } from './ai.js';

const $ = (id) => document.getElementById(id);
const els = {};
['ui-age','ui-state','ui-mood','ui-pos','bar-hunger','bar-thirst','bar-energy','bar-curiosity','bar-comfort',
 'p-curiosity','p-courage','p-shyness','p-sociability','p-independence','p-playfulness',
 'memory-list','ui-pref','thought','toast','save-indicator','loading'].forEach(id => els[id] = $(id));

export function initUI(onAction, onReset) {
  document.querySelectorAll('#actions button').forEach(btn => {
    btn.addEventListener('click', () => onAction(btn.dataset.action));
  });
  $('btn-reset').addEventListener('click', () => { if (confirm('Recomeçar a vida da Alba? O progresso salvo será apagado.')) onReset(); });
  window.addEventListener('keydown', (e) => {
    const map = { '1': 'pet', '2': 'toy', '3': 'feed', '4': 'drink', '5': 'sleep', '6': 'call' };
    if (map[e.key]) onAction(map[e.key]);
  });
}

export function updateHUD(brain, pos) {
  const st = stageOf(brain.ageDays);
  els['ui-age'].textContent = `${st.label} · Dia ${brain.ageDays}`;
  els['ui-state'].textContent = brain.state;
  els['ui-mood'].textContent = moodOf(brain);
  els['ui-pos'].textContent = '📍 ' + zoneName(pos);
  setBar(els['bar-hunger'], brain.needs.hunger);
  setBar(els['bar-thirst'], brain.needs.thirst);
  setBar(els['bar-energy'], brain.needs.energy);
  setBar(els['bar-curiosity'], brain.needs.curiosity);
  setBar(els['bar-comfort'], brain.needs.comfort);
  setBar(els['p-curiosity'], brain.personality.curiosity);
  setBar(els['p-courage'], brain.personality.courage);
  setBar(els['p-shyness'], brain.personality.shyness);
  setBar(els['p-sociability'], brain.personality.sociability);
  setBar(els['p-independence'], brain.personality.independence);
  setBar(els['p-playfulness'], brain.personality.playfulness);
  // Memórias (últimas 5)
  const list = els['memory-list'];
  list.replaceChildren();
  const mems = brain.memories.slice(-5).reverse();
  if (!mems.length) {
    const empty = document.createElement('li');
    empty.className = 'empty'; empty.textContent = 'Nenhuma memória ainda…'; list.append(empty);
  } else {
    for (const memory of mems) {
      const item = document.createElement('li');
      const mark = document.createElement('span');
      mark.textContent = memory.valence > 0 ? '💚 ' : memory.valence < 0 ? '💔 ' : '🤍 ';
      const text = document.createElement('span'); text.textContent = String(memory.text || 'Experiência lembrada');
      const day = document.createElement('small'); day.textContent = ` (dia ${Number(memory.day) || 1})`;
      item.append(mark, text, day); list.append(item);
    }
  }
  const fav = brain.preferences.favoriteRest ? ZONES[brain.preferences.favoriteRest]?.name : '—';
  els['ui-pref'].textContent = `⭐ Local favorito: ${fav}`;
  els['thought'].textContent = thoughtOf(brain);
}

export function projectThought(tigerPos, camera, renderer) {
  const v = tigerPos.clone(); v.y += 2.2;
  v.project(camera);
  if (v.z > 1) { els['thought'].classList.add('hidden'); return; }
  els['thought'].classList.remove('hidden');
  els['thought'].style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
  els['thought'].style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
}

export function showToast(msg, ms = 4500) {
  els['toast'].textContent = msg;
  els['toast'].classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els['toast'].classList.add('hidden'), ms);
}

export function hideLoading() { els['loading']?.classList.add('hidden'); }
export function setSaved() { els['save-indicator'].textContent = '💾 salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

function setBar(el, v) { el.style.width = Math.max(0, Math.min(100, v)) + '%'; el.classList.toggle('low', v < 30); }
function zoneName(pos) {
  let best = 'Clareira', bd = 1e9;
  for (const k in ZONES) { const d = Math.hypot(pos.x - ZONES[k].x, pos.z - ZONES[k].z); if (d < bd) { bd = d; best = ZONES[k].name; } }
  return bd < 7 ? best : 'Floresta';
}
