import { renderTracker } from './tracker.js';
import { swapDish, generateDay } from './src/planner.js';
import { groceryFromPlan } from './src/grocery.js';

const KEY = 'oheedet';
const CUISINE = { universal: 'универсальная', mediterranean: 'средиземноморская', asian: 'азиатская', middleeast: 'ближневосточная', slavic: 'славянская' };
const DIFF = ['', 'просто', 'средне', 'сложно'];
const diffLabel = d => DIFF[d ?? 1] ?? 'просто';
const save = state => localStorage.setItem(KEY, JSON.stringify(state));

function recipeDetail(r) {
  return `
    <h3>${r.name}</h3>
    <div class="r-meta">
      <span class="badge d${r.difficulty ?? 1}">${diffLabel(r.difficulty)}</span>
      <span class="badge">${r.time_min ?? '?'} мин</span>
      <span class="badge">${CUISINE[r.cuisine] ?? 'универсальная'}</span>
      <span class="badge">${r.cost_rub ?? '?'} ₽</span>
    </div>
    <p class="r-macros">На порцию: ${r.kcal} ккал · белок ${r.protein_g} г · клетчатка ${r.fiber_g} г</p>
    <h4>Нужно</h4>
    <ul>${(r.ingredients ?? []).map(x => `<li>${x.name} — ${x.qty} ${x.unit}</li>`).join('')}</ul>
    <h4>Как готовить</h4>
    <ol>${(r.steps ?? []).map(s => `<li>${s}</li>`).join('')}</ol>`;
}

export function renderResult(state) {
  const { safe, plan, grocery, treats = [] } = state;
  const el = document.getElementById('result');
  document.getElementById('onboarding').hidden = true;
  el.hidden = false;

  const warn = safe.referDoctor
    ? `<div class="warn">По ответам скрининга стоит обсудить план с врачом/специалистом. Дефицит смягчён, экстремального ограничения нет.</div>` : '';

  const week = plan.a;
  const weekB = plan.couple ? plan.b : null;
  const canSwap = !plan.couple;   // ponytail: в паре общий ужин усложняет замену — пока только соло
  const hasDessert = week[0]?.meals.some(m => m.slot === 'dessert');

  const recipeMap = new Map();
  for (const r of [...week.flatMap(d => d.meals), ...(weekB ? weekB.flatMap(d => d.meals) : [])].map(m => m.recipe))
    recipeMap.set(r.id, r);

  const mealHtml = (m, di, mi, swap) => `
    <li>
      <span class="badge time">${m.time}</span>
      <button class="dish-link" data-rid="${m.recipe.id}">${m.recipe.name}</button>
      ${m.slot === 'dessert' ? '<span class="badge treat-tag">десерт</span>' : ''}
      <span class="serv">×${m.servings}</span>
      ${swap ? `<button class="swap-btn" aria-label="Заменить блюдо: ${m.recipe.name}" title="Заменить блюдо" data-swap-dish="${di}:${mi}">↻</button>` : ''}
    </li>`;

  const dayHtml = (day, i, swap) => `
    <div class="day card">
      <div class="day-head"><b>День ${i + 1}</b>
        <span class="macros">${day.totals.kcal} ккал · Б ${day.totals.protein} · Кл ${day.totals.fiber}</span>
        ${swap ? `<button class="swap-btn day" aria-label="Заменить все блюда дня ${i + 1}" title="Заменить все блюда дня" data-swap-day="${i}">↻ день</button>` : ''}</div>
      <ul class="meals">${day.meals.map((m, mi) => mealHtml(m, i, mi, swap)).join('')}</ul>
    </div>`;

  // список покупок по дням
  const perishNote = d => (d.day >= 4 && d.hasPerishable)
    ? `<div class="perish">🕒 Есть скоропорт — купи ближе к этому дню или сразу заморозь.</div>` : '';
  const dayGrocery = d => `
    <div class="gday card">
      <div class="gday-head"><b>День ${d.day}</b><span class="macros">≈ ${d.estCostRub} ₽</span></div>
      ${perishNote(d)}
      <ul class="grocery">${d.items.map(i =>
        `<li>${i.perishable ? '<span class="dot-fresh" title="скоропорт"></span>' : ''}${i.name} — ${i.qty} ${i.unit}<span class="cat">${i.category}</span></li>`).join('')}</ul>
    </div>`;

  const treatsHtml = treats.length ? `
    <details class="treats-box"><summary>Хочется покупного сладкого? Тоже можно — вот варианты в бюджет лакомства</summary>
      <div class="treat-list">${treats.map(t =>
        `<div class="treat-row"><div class="treat-main"><b>${t.name}</b><span class="badge">${t.kcal} ккал</span></div>
          <div class="treat-sub">${t.portion}</div><div class="treat-note">${t.note}</div></div>`).join('')}</div>
    </details>` : '';

  el.innerHTML = `
    ${warn}
    <h2>Цель дня</h2>
    <div class="targets card">
      <div class="kpi"><div class="lab">Калории</div><div class="val acc">${safe.kcalTarget}</div></div>
      <div class="kpi"><div class="lab">Белок, г</div><div class="val">${safe.proteinGTarget}</div></div>
      <div class="kpi"><div class="lab">Клетчатка, г</div><div class="val">${safe.fiberGTarget}</div></div>
      <div class="kpi"><div class="lab">Темп, кг/нед</div><div class="val">≤${safe.tempoKgPerWeek}</div></div>
    </div>
    <p class="hint">${hasDessert ? 'Каждый день в меню есть <b>десерт в 16:00</b> — он уже вписан в норму калорий, так что сладкое не нарушает дефицит. ' : ''}Нажми на блюдо, чтобы открыть рецепт${canSwap ? '; кнопка ↻ рядом с блюдом — заменить его' : ''}.</p>

    <h2>Меню на неделю${plan.couple ? ' · ты' : ''}</h2>${week.map((d, i) => dayHtml(d, i, canSwap)).join('')}
    ${weekB ? `<h2>Меню на неделю · партнёр</h2>${weekB.map((d, i) => dayHtml(d, i, false)).join('')}` : ''}

    <h2>Список покупок по дням</h2>
    <p class="hint">Итого за неделю ≈ <b>${grocery.estCostRub} ₽</b>. Скоропорт помечен точкой — бери его ближе к дню готовки.</p>
    ${grocery.byDay.map(dayGrocery).join('')}
    <details class="full-list"><summary>Показать весь список одним походом (${grocery.items.length} позиций)</summary>
      <div class="card"><ul class="grocery">${grocery.items.map(i =>
        `<li>${i.perishable ? '<span class="dot-fresh"></span>' : ''}${i.name} — ${i.qty} ${i.unit}<span class="cat">${i.category}</span></li>`).join('')}</ul></div>
    </details>
    ${treatsHtml}

    <div id="tracker"></div>
    <button id="reset" class="btn secondary" style="margin-top:var(--space-4)">Начать заново</button>
    <dialog id="rmodal" class="modal">
      <button class="modal-close" aria-label="Закрыть">✕ назад</button>
      <div id="rmodal-body"></div>
    </dialog>`;

  // модалка рецепта
  const modal = el.querySelector('#rmodal');
  const body = el.querySelector('#rmodal-body');
  const rerender = () => { const y = window.scrollY; save(state); renderResult(state); window.scrollTo(0, y); };

  el.addEventListener('click', e => {
    const dishBtn = e.target.closest('[data-rid]');
    if (dishBtn) { const r = recipeMap.get(dishBtn.dataset.rid); if (r) { body.innerHTML = recipeDetail(r); modal.showModal(); } return; }

    const sd = e.target.closest('[data-swap-dish]');
    if (sd) {
      const [di, mi] = sd.dataset.swapDish.split(':').map(Number);
      if (swapDish(plan.a[di], mi, safe, state.pool)) { state.grocery = groceryFromPlan(plan); rerender(); }
      return;
    }
    const sday = e.target.closest('[data-swap-day]');
    if (sday) {
      const di = +sday.dataset.swapDay;
      plan.a[di] = generateDay(safe, state.pool, Math.floor(Math.random() * 997));
      state.grocery = groceryFromPlan(plan);
      rerender();
      return;
    }
  });
  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

  el.querySelector('#reset').addEventListener('click', () => { localStorage.removeItem('oheedet'); location.reload(); });
  renderTracker(state);
}
