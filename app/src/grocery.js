const COST = { low: 1, medium: 2, high: 3 };
// свежие категории — скоропорт; консервы/заморозка/сушёное хранятся долго
const FRESH = new Set(['мясо/рыба', 'молочное', 'яйца', 'овощи/фрукты']);
function isPerishable(ing) {
  const n = String(ing.name).toLowerCase();
  if (/консерв|заморож|сушён|сухой|вялен/.test(n)) return false;
  return FRESH.has(ing.category);
}

function aggregate(meals) {
  const map = new Map();
  for (const m of meals) {
    for (const ing of (m.recipe.ingredients ?? [])) {
      const key = (ing.name + '|' + ing.unit).toLowerCase().trim();   // канонизация → без дублей яйцо/яйца
      const prev = map.get(key) ?? { name: ing.name, unit: ing.unit, qty: 0, category: ing.category, costTier: ing.costTier, perishable: isPerishable(ing) };
      prev.qty += ing.qty * (m.servings ?? 1);
      map.set(key, prev);
    }
  }
  return [...map.values()]
    .map(i => ({ ...i, qty: +i.qty.toFixed(1) }))
    .sort((a, b) => String(a.category).localeCompare(String(b.category)));
}

const costRub = meals => Math.round(meals.reduce((s, m) => s + (m.recipe.cost_rub ?? 0) * (m.servings ?? 1), 0));

// week: массив дней вида { meals: [...] }
export function buildGroceryList(week) {
  const items = aggregate(week.flatMap(d => d.meals));                 // общий список (без дублей)
  const estCost = Math.round(items.reduce((s, i) => s + (COST[i.costTier] ?? 2) * i.qty, 0)); // legacy-прокси
  const byDay = week.map((d, i) => {
    const dayItems = aggregate(d.meals);
    return { day: i + 1, items: dayItems, estCostRub: costRub(d.meals), hasPerishable: dayItems.some(x => x.perishable) };
  });
  const estCostRub = byDay.reduce((s, d) => s + d.estCostRub, 0);
  return { items, estCost, estCostRub, byDay };
}

// покупки из плана: для пары объединяем день i обоих в один поход
export function groceryFromPlan(plan) {
  const gweek = plan.couple ? plan.a.map((d, i) => ({ meals: [...d.meals, ...plan.b[i].meals] })) : plan.a;
  return buildGroceryList(gweek);
}
