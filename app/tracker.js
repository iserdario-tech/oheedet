const KEY = 'oheedet';

// самая длинная серия подряд отмеченных дней
function longestStreak(done, days) {
  let best = 0, cur = 0;
  for (let i = 0; i < days; i++) {
    if (done[i]) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}

// нативный SVG-график веса; цель — пунктиром. Возвращает '' если точек < 2.
function weightChart(weights, goal) {
  if (weights.length < 2) return '';
  const W = 320, H = 140, padL = 8, padR = 8, padT = 14, padB = 22;
  const kgs = weights.map(w => w.kg);
  let lo = Math.min(...kgs, goal ?? Infinity), hi = Math.max(...kgs, goal ?? -Infinity);
  if (hi - lo < 1) { lo -= 1; hi += 1; }                     // защита от плоского диапазона
  const x = i => padL + (i * (W - padL - padR)) / (weights.length - 1);
  const y = kg => padT + (hi - kg) * (H - padT - padB) / (hi - lo);
  const pts = weights.map((w, i) => `${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ');
  const goalLine = (goal && goal >= lo && goal <= hi)
    ? `<line x1="${padL}" y1="${y(goal).toFixed(1)}" x2="${W - padR}" y2="${y(goal).toFixed(1)}" class="ch-goal"/>
       <text x="${W - padR}" y="${(y(goal) - 4).toFixed(1)}" class="ch-goal-t" text-anchor="end">цель ${goal}</text>` : '';
  const dots = weights.map((w, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(w.kg).toFixed(1)}" r="3" class="ch-dot"/>`).join('');
  const last = weights[weights.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График веса">
    ${goalLine}
    <polyline points="${pts}" class="ch-line"/>
    ${dots}
    <text x="${x(weights.length - 1).toFixed(1)}" y="${(y(last.kg) - 7).toFixed(1)}" class="ch-last" text-anchor="end">${last.kg}</text>
  </svg>`;
}

export function renderTracker(state) {
  const box = document.getElementById('tracker');
  if (!box) return;
  const p = state.progress ?? (state.progress = {});
  p.done ??= {};
  p.weights ??= [];
  const days = (state.plan.a ?? []).length;
  const goal = state.profile?.goalWeightKg;

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  const marked = Object.values(p.done).filter(Boolean).length;
  const streak = longestStreak(p.done, days);
  const adherence = `<p class="hint">Отмечено <b>${marked} из ${days}</b> дней · лучшая серия <b>${streak}</b> подряд. Отметки — не для галочки: регулярность важнее идеальности (это самый доказанный рычаг удержания).</p>`;

  const chart = weightChart(p.weights, goal);
  const delta = p.weights.length >= 2
    ? (() => { const d = p.weights[0].kg - p.weights[p.weights.length - 1].kg;
        return `<p class="hint">С первого замера: <b>${d > 0 ? '−' : '+'}${Math.abs(d).toFixed(1)} кг</b> за ${p.weights.length} замер(ов).</p>`; })()
    : `<p class="hint">Добавь ещё хотя бы один замер, чтобы увидеть линию динамики.</p>`;

  box.innerHTML = `<h2>Отметки — съел по плану</h2>
    <div class="card">
      <div class="marks">${Array.from({ length: days }, (_, i) =>
        `<label><input type="checkbox" data-day="${i}" ${p.done[i] ? 'checked' : ''}> День ${i + 1}</label>`).join('')}</div>
      ${adherence}
    </div>
    <h2>Вес — динамика</h2>
    <div class="card">
      ${chart}
      ${delta}
      <div class="w-input"><input id="w" type="number" step="0.1" placeholder="кг"> <button id="wadd" class="btn secondary">Записать вес</button></div>
      <small class="hint">Взвешивайся раз в неделю в одно время. Одна цифра прыгает (вода/еда), а линия за недели показывает правду.</small>
    </div>`;

  box.querySelectorAll('input[data-day]').forEach(cb =>
    cb.addEventListener('change', e => { p.done[e.target.dataset.day] = e.target.checked; save(); renderTracker(state); }));

  box.querySelector('#wadd').addEventListener('click', () => {
    const kg = +box.querySelector('#w').value;
    if (!kg) return;
    p.weights.push({ date: new Date().toISOString().slice(0, 10), kg });
    save();
    renderTracker(state);
  });
}
