const KEY = 'oheedet';

export function renderTracker(state) {
  const box = document.getElementById('tracker');
  if (!box) return;
  const p = state.progress ?? (state.progress = {});
  p.done ??= {};
  p.weights ??= [];
  const days = (state.plan.a ?? []).length;

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  box.innerHTML = `<h2>Отметки</h2>
    <div>${Array.from({ length: days }, (_, i) =>
      `<label><input type="checkbox" data-day="${i}" ${p.done[i] ? 'checked' : ''}> День ${i + 1} — съел по плану</label>`).join('')}</div>
    <h2>Вес (раз в неделю)</h2>
    <input id="w" type="number" step="0.1" placeholder="кг"> <button id="wadd">Сохранить вес</button>
    <ul id="wlist">${p.weights.map(w => `<li>${w.date}: ${w.kg} кг</li>`).join('')}</ul>`;

  box.querySelectorAll('input[data-day]').forEach(cb =>
    cb.addEventListener('change', e => { p.done[e.target.dataset.day] = e.target.checked; save(); }));

  box.querySelector('#wadd').addEventListener('click', () => {
    const kg = +box.querySelector('#w').value;
    if (!kg) return;
    p.weights.push({ date: new Date().toISOString().slice(0, 10), kg });
    save();
    renderTracker(state);
  });
}
