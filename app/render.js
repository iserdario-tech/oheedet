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
    <div class="day"><b>День ${i + 1}</b> — ${day.totals.kcal} ккал · белок ${day.totals.protein} г · клетчатка ${day.totals.fiber} г
      <ul>${day.meals.map(m => `<li>${m.time} — ${m.recipe.name} ×${m.servings} порц.</li>`).join('')}</ul></div>`;

  const recipes = [...new Map(week.flatMap(d => d.meals).map(m => [m.recipe.id, m.recipe])).values()]
    .sort((a, b) => (a.difficulty ?? 1) - (b.difficulty ?? 1));

  const recipeHtml = recipes.map(r => `
    <div class="day"><b>${r.name}</b> (сложность ${r.difficulty ?? 1}, ${r.time_min ?? '?'} мин)
      <ul>${(r.ingredients ?? []).map(x => `<li>${x.name} — ${x.qty} ${x.unit}</li>`).join('')}</ul>
      <ol>${(r.steps ?? []).map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('');

  const groceryHtml = `<ul>${grocery.items.map(i => `<li>${i.name} — ${i.qty} ${i.unit} <small>(${i.category})</small></li>`).join('')}</ul>
    <p>Прикидка бюджета (условные ед.): <b>${grocery.estCost}</b></p>`;

  el.innerHTML = `
    ${warn}
    <h2>Цель дня</h2>
    <p>${safe.kcalTarget} ккал · белок ${safe.proteinGTarget} г · клетчатка ${safe.fiberGTarget} г · темп ≤ ${safe.tempoKgPerWeek} кг/нед</p>
    <h2>Меню на неделю${plan.couple ? ' (ты)' : ''}</h2>${week.map(dayHtml).join('')}
    ${weekB ? `<h2>Меню на неделю (партнёр)</h2>${weekB.map(dayHtml).join('')}` : ''}
    <h2>Рецепты (от простых к сложным)</h2>${recipeHtml}
    <h2>Список покупок</h2>${groceryHtml}
    <div id="tracker"></div>
    <button id="reset">Сбросить</button>`;

  el.querySelector('#reset').addEventListener('click', () => { localStorage.removeItem('oheedet'); location.reload(); });
  renderTracker(state);
}
