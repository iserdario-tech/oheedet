import { renderTracker } from './tracker.js';

export function renderResult(state) {
  const { safe, plan, grocery } = state;
  const el = document.getElementById('result');
  document.getElementById('onboarding').hidden = true;
  el.hidden = false;

  const warn = safe.referDoctor
    ? `<div class="warn">По ответам скрининга стоит обсудить план с врачом/специалистом. Дефицит смягчён, экстремального ограничения нет.</div>` : '';

  const week = plan.a;
  const weekB = plan.couple ? plan.b : null;

  const dayHtml = (day, i) => `
    <div class="day card">
      <div class="day-head"><b>День ${i + 1}</b>
        <span class="macros">${day.totals.kcal} ккал · Б ${day.totals.protein} · Кл ${day.totals.fiber}</span></div>
      <ul class="meals">${day.meals.map(m =>
        `<li><span class="badge time">${m.time}</span> ${m.recipe.name}<span class="serv">×${m.servings}</span></li>`).join('')}</ul>
    </div>`;

  const recipes = [...new Map(week.flatMap(d => d.meals).map(m => [m.recipe.id, m.recipe])).values()]
    .sort((a, b) => (a.difficulty ?? 1) - (b.difficulty ?? 1));
  const diffLabel = d => ['', 'просто', 'средне', 'сложно'][d ?? 1] ?? 'просто';

  const recipeHtml = recipes.map(r => `
    <div class="recipe card">
      <div class="r-head"><b>${r.name}</b>
        <span class="badge d${r.difficulty ?? 1}">${diffLabel(r.difficulty)}</span>
        <span class="badge">${r.time_min ?? '?'} мин</span></div>
      <ul>${(r.ingredients ?? []).map(x => `<li>${x.name} — ${x.qty} ${x.unit}</li>`).join('')}</ul>
      <ol>${(r.steps ?? []).map(s => `<li>${s}</li>`).join('')}</ol>
    </div>`).join('');

  const groceryHtml = `<ul class="grocery">${grocery.items.map(i =>
    `<li>${i.name} — ${i.qty} ${i.unit}<span class="cat">${i.category}</span></li>`).join('')}</ul>
    <p style="color:var(--text-muted);font-size:var(--text-caption)">Прикидка бюджета (условные ед.): <b>${grocery.estCost}</b></p>`;

  el.innerHTML = `
    ${warn}
    <h2>Цель дня</h2>
    <div class="targets card">
      <div class="kpi"><div class="lab">Калории</div><div class="val acc">${safe.kcalTarget}</div></div>
      <div class="kpi"><div class="lab">Белок, г</div><div class="val">${safe.proteinGTarget}</div></div>
      <div class="kpi"><div class="lab">Клетчатка, г</div><div class="val">${safe.fiberGTarget}</div></div>
      <div class="kpi"><div class="lab">Темп, кг/нед</div><div class="val">≤${safe.tempoKgPerWeek}</div></div>
    </div>
    <h2>Меню на неделю${plan.couple ? ' · ты' : ''}</h2>${week.map(dayHtml).join('')}
    ${weekB ? `<h2>Меню на неделю · партнёр</h2>${weekB.map(dayHtml).join('')}` : ''}
    <h2>Рецепты · от простых к сложным</h2>${recipeHtml}
    <h2>Список покупок</h2><div class="card">${groceryHtml}</div>
    <div id="tracker"></div>
    <button id="reset" class="btn secondary" style="margin-top:var(--space-4)">Начать заново</button>`;

  el.querySelector('#reset').addEventListener('click', () => { localStorage.removeItem('oheedet'); location.reload(); });
  renderTracker(state);
}
