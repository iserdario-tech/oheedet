import { renderTracker } from './tracker.js';

const CUISINE = { universal: 'универсальная', mediterranean: 'средиземноморская', asian: 'азиатская', middleeast: 'ближневосточная', slavic: 'славянская' };
const DIFF = ['', 'просто', 'средне', 'сложно'];
const diffLabel = d => DIFF[d ?? 1] ?? 'просто';

// полная карточка рецепта для модалки
function recipeDetail(r) {
  return `
    <h3>${r.name}</h3>
    <div class="r-meta">
      <span class="badge d${r.difficulty ?? 1}">${diffLabel(r.difficulty)}</span>
      <span class="badge">${r.time_min ?? '?'} мин</span>
      <span class="badge">${CUISINE[r.cuisine] ?? 'универсальная'}</span>
    </div>
    <p class="r-macros">На порцию: ${r.kcal} ккал · белок ${r.protein_g} г · клетчатка ${r.fiber_g} г</p>
    <h4>Нужно</h4>
    <ul>${(r.ingredients ?? []).map(x => `<li>${x.name} — ${x.qty} ${x.unit}</li>`).join('')}</ul>
    <h4>Как готовить</h4>
    <ol>${(r.steps ?? []).map(s => `<li>${s}</li>`).join('')}</ol>`;
}

export function renderResult(state) {
  const { safe, plan, grocery, desserts = [], treats = [] } = state;
  const el = document.getElementById('result');
  document.getElementById('onboarding').hidden = true;
  el.hidden = false;

  const warn = safe.referDoctor
    ? `<div class="warn">По ответам скрининга стоит обсудить план с врачом/специалистом. Дефицит смягчён, экстремального ограничения нет.</div>` : '';

  const week = plan.a;
  const weekB = plan.couple ? plan.b : null;
  const treatKcal = Math.round(safe.kcalTarget * 0.12);

  // все рецепты, которые могут открыться в модалке (меню + десерты)
  const recipeMap = new Map();
  for (const r of [...week.flatMap(d => d.meals).map(m => m.recipe), ...(weekB ? weekB.flatMap(d => d.meals).map(m => m.recipe) : []), ...desserts])
    recipeMap.set(r.id, r);

  const dayHtml = (day, i) => `
    <div class="day card">
      <div class="day-head"><b>День ${i + 1}</b>
        <span class="macros">${day.totals.kcal} ккал · Б ${day.totals.protein} · Кл ${day.totals.fiber}</span></div>
      <ul class="meals">${day.meals.map(m =>
        `<li><span class="badge time">${m.time}</span> <button class="dish-link" data-rid="${m.recipe.id}">${m.recipe.name}</button><span class="serv">×${m.servings}</span></li>`).join('')}</ul>
    </div>`;

  const dessertHtml = desserts.length ? `
    <h2>Сладкое — вписываем в дефицит</h2>
    <div class="card treat-note">Сладкое не запрещено. У тебя примерно <b>${treatKcal} ккал/день</b> можно потратить на лакомство, и дефицит сохранится (правило 80/20).</div>
    <div class="treats">${desserts.map(r =>
      `<button class="treat-card card" data-rid="${r.id}"><b>${r.name}</b><span class="badge">${r.kcal} ккал</span><span class="badge">белок ${r.protein_g} г</span></button>`).join('')}</div>
    <h3 class="sub">Покупное — тоже можно, если влезает в бюджет лакомства</h3>
    <div class="card"><ul class="grocery">${treats.map(t =>
      `<li><b>${t.name}</b> · ${t.portion}<span class="cat">${t.kcal} ккал</span><br><small class="hint">${t.note}</small></li>`).join('')}</ul></div>` : '';

  el.innerHTML = `
    ${warn}
    <h2>Цель дня</h2>
    <div class="targets card">
      <div class="kpi"><div class="lab">Калории</div><div class="val acc">${safe.kcalTarget}</div></div>
      <div class="kpi"><div class="lab">Белок, г</div><div class="val">${safe.proteinGTarget}</div></div>
      <div class="kpi"><div class="lab">Клетчатка, г</div><div class="val">${safe.fiberGTarget}</div></div>
      <div class="kpi"><div class="lab">Темп, кг/нед</div><div class="val">≤${safe.tempoKgPerWeek}</div></div>
    </div>
    <p class="hint">На лакомство свободно ≈ <b>${treatKcal} ккал/день</b>. Нажми на любое блюдо, чтобы открыть рецепт.</p>
    <h2>Меню на неделю${plan.couple ? ' · ты' : ''}</h2>${week.map(dayHtml).join('')}
    ${weekB ? `<h2>Меню на неделю · партнёр</h2>${weekB.map(dayHtml).join('')}` : ''}
    ${dessertHtml}
    <h2>Список покупок</h2><div class="card"><ul class="grocery">${grocery.items.map(i =>
      `<li>${i.name} — ${i.qty} ${i.unit}<span class="cat">${i.category}</span></li>`).join('')}</ul>
      <p style="color:var(--text-muted);font-size:var(--text-caption)">Прикидка бюджета (условные ед.): <b>${grocery.estCost}</b></p></div>
    <div id="tracker"></div>
    <button id="reset" class="btn secondary" style="margin-top:var(--space-4)">Начать заново</button>
    <dialog id="rmodal" class="modal">
      <button class="modal-close" aria-label="Закрыть">✕ назад</button>
      <div id="rmodal-body"></div>
    </dialog>`;

  // модалка рецепта: клик по блюду открывает поверх, «назад» возвращает ровно на место
  const modal = el.querySelector('#rmodal');
  const body = el.querySelector('#rmodal-body');
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-rid]');
    if (!btn) return;
    const r = recipeMap.get(btn.dataset.rid);
    if (!r) return;
    body.innerHTML = recipeDetail(r);
    modal.showModal();
  });
  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });   // клик по фону

  el.querySelector('#reset').addEventListener('click', () => { localStorage.removeItem('oheedet'); location.reload(); });
  renderTracker(state);
}
