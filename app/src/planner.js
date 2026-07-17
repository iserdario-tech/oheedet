const SPLIT = { breakfast: 0.30, lunch: 0.40, dinner: 0.30 };
const TIME  = { breakfast: '08:00', lunch: '13:00', dinner: '18:00' };
const BUDGET_RANK = { low: 1, medium: 2, high: 3 };

export function filterRecipes(recipes, c = {}) {
  const allergens = new Set(c.allergens ?? []);
  const dislikes = (c.dislikes ?? []).map(x => String(x).toLowerCase());
  const cookware = new Set(c.cookware ?? []);
  const budgetMax = BUDGET_RANK[c.budget ?? 'high'];
  const cuisines = c.cuisines ?? [];   // пусто = все кухни
  return recipes.filter(r => {
    if ((r.allergens ?? []).some(a => allergens.has(a))) return false;
    const hay = (r.name + ' ' + (r.tags ?? []).join(' ')).toLowerCase();
    // ponytail: стем по обрезке окончания ловит русские словоформы (капуста→капустой);
    // ceiling — не полноценная морфология, при промахах подключить стеммер.
    if (dislikes.some(d => d && hay.includes(d.length > 5 ? d.slice(0, -2) : d))) return false;
    if ((r.cookware ?? []).some(w => !cookware.has(w))) return false;
    if (BUDGET_RANK[r.cost_tier ?? 'medium'] > budgetMax) return false;
    // мягкий фильтр кухни: universal проходит всегда и покрывает все слоты → план не пустеет
    if (cuisines.length && r.cuisine !== 'universal' && !cuisines.includes(r.cuisine)) return false;
    return true;
  });
}

// ponytail: жадное распределение 30/40/30 + добор белка; при систематическом промахе
// по калориям/белку — это и есть триггер замены на оптимизатор (ILP).
export function generateWeek(targets, recipes, c = {}) {
  const pool = filterRecipes(recipes, c);
  const byType = t => pool.filter(r => r.meal_type === t);
  const idx = { breakfast: 0, lunch: 0, dinner: 0 };
  const days = [];

  for (let d = 0; d < 7; d++) {
    const meals = [];
    let kcal = 0, protein = 0, fiber = 0;

    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const opts = byType(slot);
      if (opts.length === 0) continue;
      const recipe = opts[idx[slot] % opts.length];
      idx[slot]++;                                   // ротация для разнообразия по дням
      const servings = Math.max(0.5, +((targets.kcalTarget * SPLIT[slot]) / recipe.kcal).toFixed(1));
      meals.push({ recipe, servings, time: TIME[slot] });
      kcal += recipe.kcal * servings;
      protein += recipe.protein_g * servings;
      fiber += recipe.fiber_g * servings;
    }

    if (protein < targets.proteinGTarget && meals.length) {
      const m = meals.reduce((a, b) => b.recipe.protein_g > a.recipe.protein_g ? b : a);
      const add = Math.ceil(((targets.proteinGTarget - protein) / m.recipe.protein_g) * 10) / 10;
      m.servings = +(m.servings + add).toFixed(1);
      protein += m.recipe.protein_g * add;
      kcal += m.recipe.kcal * add;
      fiber += m.recipe.fiber_g * add;
    }

    days.push({ meals, totals: { kcal: Math.round(kcal), protein: Math.round(protein), fiber: Math.round(fiber) } });
  }
  return days;
}
