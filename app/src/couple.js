import { generateWeek } from './planner.js';

// ponytail: делим только ужин; полный двойной планировщик — если попросят.
export function generateCoupleWeek(targetsA, targetsB, recipes, c = {}) {
  const a = generateWeek(targetsA, recipes, c);
  const b = generateWeek(targetsB, recipes, c);

  for (let d = 0; d < 7; d++) {
    const da = a[d].meals.find(m => m.time === '18:00');
    const db = b[d].meals.find(m => m.time === '18:00');
    if (!da || !db) continue;
    const servings = Math.max(0.5, +((targetsB.kcalTarget * 0.30) / da.recipe.kcal).toFixed(1));
    b[d].totals.kcal    += Math.round(da.recipe.kcal * servings     - db.recipe.kcal * db.servings);
    b[d].totals.protein += Math.round(da.recipe.protein_g * servings - db.recipe.protein_g * db.servings);
    b[d].totals.fiber   += Math.round(da.recipe.fiber_g * servings   - db.recipe.fiber_g * db.servings);
    db.recipe = da.recipe;
    db.servings = servings;
  }
  return { a, b };
}
