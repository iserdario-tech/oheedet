const SPLIT = { breakfast: 0.30, lunch: 0.40, dinner: 0.30 };
const TIME  = { breakfast: '08:00', lunch: '13:00', dessert: '16:00', dinner: '18:00' };
// бюджет — потолок цены одной порции блюда, ₽. Влияет на «премиальность» продуктов
// (маленький — курица/яйца/крупы/бобовые; большой — плюс лосось/говядина).
const BUDGET_MEAL_CAP = { small: 205, medium: 270, large: Infinity };

export function filterRecipes(recipes, c = {}) {
  const allergens = new Set(c.allergens ?? []);
  const dislikes = (c.dislikes ?? []).map(x => String(x).toLowerCase());
  const cookware = new Set(c.cookware ?? []);
  const cuisines = c.cuisines ?? [];
  const cap = BUDGET_MEAL_CAP[c.budget] ?? Infinity;
  return recipes.filter(r => {
    if ((r.allergens ?? []).some(a => allergens.has(a))) return false;
    const hay = (r.name + ' ' + (r.tags ?? []).join(' ')).toLowerCase();
    // ponytail: стем обрезкой окончания ловит русские словоформы (капуста→капустой); не полная морфология.
    if (dislikes.some(d => d && hay.includes(d.length > 5 ? d.slice(0, -2) : d))) return false;
    if ((r.cookware ?? []).some(w => !cookware.has(w))) return false;
    if ((r.cost_rub ?? 0) > cap) return false;
    // мягкий фильтр кухни: universal проходит всегда и покрывает все слоты → план не пустеет
    if (cuisines.length && r.cuisine !== 'universal' && !cuisines.includes(r.cuisine)) return false;
    return true;
  });
}

function recomputeTotals(day) {
  let k = 0, p = 0, f = 0;
  for (const m of day.meals) { k += m.recipe.kcal * m.servings; p += m.recipe.protein_g * m.servings; f += m.recipe.fiber_g * m.servings; }
  day.totals = { kcal: Math.round(k), protein: Math.round(p), fiber: Math.round(f) };
}

const treatKcalOf = (targets, pool) => pool.some(r => r.meal_type === 'dessert') ? Math.round(targets.kcalTarget * 0.12) : 0;

// один день: завтрак/обед/ужин 30/40/30 от (цель − бюджет лакомства) + опц. десерт в рамках лакомства.
// offset двигает выбор рецептов (разнообразие по дням и «заменить день»).
export function generateDay(targets, pool, offset = 0) {
  const byType = t => pool.filter(r => r.meal_type === t);
  const treatKcal = treatKcalOf(targets, pool);
  const mainTarget = targets.kcalTarget - treatKcal;
  const meals = [];

  for (const slot of ['breakfast', 'lunch', 'dinner']) {
    const opts = byType(slot);
    if (!opts.length) continue;
    const recipe = opts[offset % opts.length];
    const servings = Math.max(0.5, +((mainTarget * SPLIT[slot]) / recipe.kcal).toFixed(1));
    meals.push({ recipe, servings, time: TIME[slot], slot });
  }
  const desserts = byType('dessert');
  if (desserts.length) {
    const recipe = desserts[offset % desserts.length];
    const servings = Math.max(0.5, +(treatKcal / recipe.kcal).toFixed(1));
    meals.push({ recipe, servings, time: TIME.dessert, slot: 'dessert' });
  }

  const day = { meals };
  recomputeTotals(day);
  // добор белка — на самом белково-ПЛОТНОМ блюде (мин. лишних калорий),
  // но не раздувая день выше +8% цели: дефицит важнее точного попадания в белок.
  if (day.totals.protein < targets.proteinGTarget && meals.length) {
    const m = meals.reduce((a, b) => (b.recipe.protein_g / b.recipe.kcal) > (a.recipe.protein_g / a.recipe.kcal) ? b : a);
    const room = Math.max(0, targets.kcalTarget * 1.08 - day.totals.kcal);
    const byProtein = (targets.proteinGTarget - day.totals.protein) / m.recipe.protein_g;
    const byKcal = room / m.recipe.kcal;
    const add = +Math.min(byProtein, byKcal).toFixed(1);
    if (add > 0) { m.servings = +(m.servings + add).toFixed(1); recomputeTotals(day); }
  }
  meals.sort((a, b) => a.time.localeCompare(b.time));   // десерт (16:00) встаёт между обедом и ужином
  return day;
}

export function generateWeek(targets, recipes, c = {}) {
  const pool = filterRecipes(recipes, c);
  return Array.from({ length: 7 }, (_, d) => generateDay(targets, pool, d));
}

// заменить одно блюдо: следующий рецепт того же слота, порция под ту же долю калорий (баланс сохраняется)
export function swapDish(day, mealIndex, targets, pool) {
  const meal = day.meals[mealIndex];
  const opts = pool.filter(r => r.meal_type === meal.recipe.meal_type);
  if (opts.length < 2) return false;
  const cur = opts.findIndex(r => r.id === meal.recipe.id);
  const recipe = opts[(cur + 1) % opts.length];
  const treatKcal = treatKcalOf(targets, pool);
  const share = meal.slot === 'dessert' ? treatKcal : (targets.kcalTarget - treatKcal) * SPLIT[meal.slot];
  const servings = Math.max(0.5, +(share / recipe.kcal).toFixed(1));
  day.meals[mealIndex] = { recipe, servings, time: meal.time, slot: meal.slot };
  day.meals.sort((a, b) => a.time.localeCompare(b.time));
  recomputeTotals(day);
  return true;
}
