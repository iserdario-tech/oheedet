const COST = { low: 1, medium: 2, high: 3 };

// ponytail: стоимость — прокси rank(costTier)*qty; заменить на реальные цены, если понадобится.
export function buildGroceryList(week) {
  const map = new Map();
  for (const day of week) {
    for (const m of day.meals) {
      for (const ing of (m.recipe.ingredients ?? [])) {
        const key = ing.name + '|' + ing.unit;
        const prev = map.get(key) ?? { name: ing.name, unit: ing.unit, qty: 0, category: ing.category, costTier: ing.costTier };
        prev.qty += ing.qty * m.servings;
        map.set(key, prev);
      }
    }
  }
  const items = [...map.values()]
    .map(i => ({ ...i, qty: +i.qty.toFixed(1) }))
    .sort((a, b) => String(a.category).localeCompare(String(b.category)));
  const estCost = Math.round(items.reduce((s, i) => s + (COST[i.costTier] ?? 2) * i.qty, 0));
  return { items, estCost };
}
