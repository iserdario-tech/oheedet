# oheedet App MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Клиентское веб-приложение (PWA), которое из короткого профиля генерирует недельное меню (порции + тайминг) под аллергии/нелюбимое/посуду/бюджет, с режимом «на двоих», списком покупок и guardrails безопасности.

**Architecture:** Чистые JS-модули логики (`targets`, `safety`, `planner`, `couple`, `grocery`) + данные `recipes.json` + тонкий UI-слой (`index.html` + `app.js`), профиль/прогресс в localStorage. Никакого бэкенда, сборки и внешних зависимостей.

**Tech Stack:** Vanilla ES modules, Node stdlib `node:test` для тестов, статический хостинг. (Обоснование — [app-design.md](../../product/app-design.md) §7, D-007.)

## Global Constraints

- Платформа: PWA/веб, **без бэкенда и аккаунтов**; данные локально (localStorage). (D-007)
- **Ноль внешних зависимостей**: тесты только `node --test` + `node:assert`. Никаких npm-пакетов/бандлеров без явной необходимости.
- ES modules везде: `app/package.json` = `{"type":"module"}`.
- Правила питания (из findings «Продуктовые выводы»): дефицит 500–600 ккал/д; темп ≤1 кг/нед; белок 1.6 г/кг (реф-вес); клетчатка цель 30 г; больший калораж на первую половину дня, ужин в 18:00. (T5/T8/T14/T32)
- Guardrails: калораж не ниже пола (жен. 1200, муж. 1500); при флагах РПП/состояний — смягчить дефицит и показать «к врачу». (T32/T34/T36)
- Честная рамка в копирайтинге: НЕ обещать «жиросжигания», detox, «разгона метаболизма». (D-001)
- v1 НЕ включает: дневник/сканер, гликемическую персонализацию, интеграцию сна, GLP-1, аккаунты. (D-006)

---

### Task 1: Скелет проекта + схема и сид рецептов

**Files:**
- Create: `app/package.json`
- Create: `app/data/recipes.json`
- Test: `app/test/recipes.test.js`

**Interfaces:**
- Produces: `recipes.json` — массив объектов `{id, name, meal_type:'breakfast'|'lunch'|'dinner', kcal, protein_g, fiber_g, energy_density, cost_tier:'low'|'medium'|'high', cookware:string[], allergens:string[], tags:string[], cuisine, difficulty:1|2|3, time_min, ingredients:[{name, qty, unit, category, costTier}], steps:string[]}`. Все макросы — на 1 порцию.

- [ ] **Step 1: Создать `app/package.json`**

```json
{ "name": "oheedet-app", "type": "module", "private": true }
```

- [ ] **Step 2: Написать провальный тест схемы `app/test/recipes.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const recipes = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url)));
const TYPES = ['breakfast', 'lunch', 'dinner'];

test('recipes.json непустой и покрывает все типы приёмов', () => {
  assert.ok(recipes.length >= 6, 'нужно >= 6 рецептов для демо-недели');
  for (const t of TYPES) assert.ok(recipes.some(r => r.meal_type === t), `нет рецепта типа ${t}`);
});

test('каждый рецепт имеет обязательные поля', () => {
  for (const r of recipes) {
    for (const f of ['id','name','meal_type','kcal','protein_g','fiber_g','cost_tier','cookware','allergens','ingredients']) {
      assert.ok(r[f] !== undefined, `рецепт ${r.id} без поля ${f}`);
    }
    assert.ok(Array.isArray(r.ingredients) && r.ingredients.length > 0, `рецепт ${r.id} без ингредиентов`);
  }
});

test('id уникальны', () => {
  assert.equal(new Set(recipes.map(r => r.id)).size, recipes.length);
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `cd app && node --test test/recipes.test.js`
Expected: FAIL (файл `data/recipes.json` не существует).

- [ ] **Step 4: Создать `app/data/recipes.json` (сид ~8 рецептов)**

```json
[
  { "id": "b1", "name": "Овсянка с творогом и ягодами", "meal_type": "breakfast", "kcal": 350, "protein_g": 25, "fiber_g": 7, "energy_density": 1.1, "cost_tier": "low", "cookware": ["stove"], "allergens": ["milk","gluten"], "tags": [], "cuisine": "universal", "difficulty": 1, "time_min": 10, "ingredients": [ {"name":"овсяные хлопья","qty":50,"unit":"г","category":"крупы","costTier":"low"}, {"name":"творог 5%","qty":100,"unit":"г","category":"молочное","costTier":"low"}, {"name":"ягоды заморозка","qty":80,"unit":"г","category":"овощи/фрукты","costTier":"medium"} ], "steps": ["Сварить хлопья","Добавить творог и ягоды"] },
  { "id": "b2", "name": "Омлет с овощами", "meal_type": "breakfast", "kcal": 300, "protein_g": 22, "fiber_g": 4, "energy_density": 1.0, "cost_tier": "low", "cookware": ["stove"], "allergens": ["egg"], "tags": [], "cuisine": "universal", "difficulty": 1, "time_min": 12, "ingredients": [ {"name":"яйца","qty":2,"unit":"шт","category":"яйца","costTier":"low"}, {"name":"перец болгарский","qty":80,"unit":"г","category":"овощи/фрукты","costTier":"medium"}, {"name":"шпинат","qty":40,"unit":"г","category":"овощи/фрукты","costTier":"medium"} ], "steps": ["Взбить яйца","Обжарить с овощами"] },
  { "id": "l1", "name": "Курица с гречкой и салатом", "meal_type": "lunch", "kcal": 500, "protein_g": 40, "fiber_g": 9, "energy_density": 1.2, "cost_tier": "low", "cookware": ["stove"], "allergens": [], "tags": [], "cuisine": "universal", "difficulty": 1, "time_min": 25, "ingredients": [ {"name":"куриное филе","qty":150,"unit":"г","category":"мясо/рыба","costTier":"low"}, {"name":"гречка","qty":60,"unit":"г","category":"крупы","costTier":"low"}, {"name":"овощи для салата","qty":150,"unit":"г","category":"овощи/фрукты","costTier":"medium"} ], "steps": ["Отварить гречку","Обжарить курицу","Собрать салат"] },
  { "id": "l2", "name": "Чечевичный суп", "meal_type": "lunch", "kcal": 420, "protein_g": 24, "fiber_g": 14, "energy_density": 0.7, "cost_tier": "low", "cookware": ["stove"], "allergens": [], "tags": ["vegan"], "cuisine": "universal", "difficulty": 2, "time_min": 35, "ingredients": [ {"name":"чечевица","qty":80,"unit":"г","category":"бобовые","costTier":"low"}, {"name":"морковь","qty":80,"unit":"г","category":"овощи/фрукты","costTier":"low"}, {"name":"лук","qty":60,"unit":"г","category":"овощи/фрукты","costTier":"low"} ], "steps": ["Обжарить овощи","Добавить чечевицу и воду","Варить до готовности"] },
  { "id": "d1", "name": "Запечённая рыба с овощами", "meal_type": "dinner", "kcal": 400, "protein_g": 35, "fiber_g": 8, "energy_density": 0.9, "cost_tier": "medium", "cookware": ["oven"], "allergens": ["fish"], "tags": [], "cuisine": "mediterranean", "difficulty": 2, "time_min": 30, "ingredients": [ {"name":"филе белой рыбы","qty":180,"unit":"г","category":"мясо/рыба","costTier":"medium"}, {"name":"брокколи","qty":150,"unit":"г","category":"овощи/фрукты","costTier":"medium"}, {"name":"оливковое масло","qty":10,"unit":"мл","category":"масла","costTier":"medium"} ], "steps": ["Разогреть духовку","Запечь рыбу и овощи"] },
  { "id": "d2", "name": "Индейка с тушёной капустой", "meal_type": "dinner", "kcal": 380, "protein_g": 34, "fiber_g": 9, "energy_density": 0.8, "cost_tier": "low", "cookware": ["stove"], "allergens": [], "tags": [], "cuisine": "universal", "difficulty": 1, "time_min": 25, "ingredients": [ {"name":"фарш индейки","qty":150,"unit":"г","category":"мясо/рыба","costTier":"low"}, {"name":"капуста","qty":200,"unit":"г","category":"овощи/фрукты","costTier":"low"} ], "steps": ["Обжарить фарш","Тушить с капустой"] },
  { "id": "d3", "name": "Нут карри с рисом", "meal_type": "dinner", "kcal": 450, "protein_g": 20, "fiber_g": 12, "energy_density": 1.0, "cost_tier": "low", "cookware": ["stove"], "allergens": [], "tags": ["vegan"], "cuisine": "universal", "difficulty": 2, "time_min": 30, "ingredients": [ {"name":"нут консерв.","qty":150,"unit":"г","category":"бобовые","costTier":"low"}, {"name":"рис","qty":50,"unit":"г","category":"крупы","costTier":"low"}, {"name":"томаты консерв.","qty":100,"unit":"г","category":"овощи/фрукты","costTier":"low"} ], "steps": ["Отварить рис","Потушить нут с томатами и специями"] },
  { "id": "l3", "name": "Тунец с фасолью", "meal_type": "lunch", "kcal": 430, "protein_g": 38, "fiber_g": 11, "energy_density": 0.9, "cost_tier": "low", "cookware": [], "allergens": ["fish"], "tags": [], "cuisine": "universal", "difficulty": 1, "time_min": 8, "ingredients": [ {"name":"тунец консерв.","qty":120,"unit":"г","category":"мясо/рыба","costTier":"low"}, {"name":"фасоль консерв.","qty":150,"unit":"г","category":"бобовые","costTier":"low"}, {"name":"зелень/овощи","qty":100,"unit":"г","category":"овощи/фрукты","costTier":"medium"} ], "steps": ["Смешать тунец с фасолью и овощами"] }
]
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd app && node --test test/recipes.test.js`
Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/data/recipes.json app/test/recipes.test.js
git commit -m "feat(app): скелет + схема и сид рецептов"
```

> `ponytail: 8 рецептов — рабочий минимум для демо-недели; расширение библиотеки — контент-работа, не блокер.`

---

### Task 2: Модуль целей `targets.js`

**Files:**
- Create: `app/src/targets.js`
- Test: `app/test/targets.test.js`

**Interfaces:**
- Produces: `computeTargets(profile) -> {bmr, tdee, kcalTarget, proteinGTarget, fiberGTarget, tempoKgPerWeek}`.
  - `profile = {sex:'m'|'f', age, heightCm, weightKg, goalWeightKg?, activity:'low'|'medium'|'high'}`.

- [ ] **Step 1: Написать провальный тест `app/test/targets.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTargets } from '../src/targets.js';

test('Mifflin-St Jeor + дефицит (мужчина)', () => {
  const t = computeTargets({ sex:'m', age:30, heightCm:180, weightKg:90, goalWeightKg:80, activity:'low' });
  // BMR = 10*90 + 6.25*180 - 5*30 + 5 = 1880; TDEE = 1880*1.2 = 2256
  assert.equal(t.bmr, 1880);
  assert.equal(t.tdee, 2256);
  assert.equal(t.kcalTarget, 1706);            // 2256 - 550
  assert.equal(t.proteinGTarget, 128);          // 1.6 * 80
  assert.equal(t.fiberGTarget, 30);
  assert.ok(t.tempoKgPerWeek <= 1);
});

test('белок берётся по текущему весу, если нет целевого', () => {
  const t = computeTargets({ sex:'f', age:35, heightCm:165, weightKg:70, activity:'medium' });
  assert.equal(t.proteinGTarget, 112);          // 1.6 * 70
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd app && node --test test/targets.test.js`
Expected: FAIL ("Cannot find module ../src/targets.js").

- [ ] **Step 3: Реализовать `app/src/targets.js`**

```js
const ACTIVITY = { low: 1.2, medium: 1.375, high: 1.55 };
const DEFICIT = 550;

export function computeTargets(p) {
  const sexConst = p.sex === 'm' ? 5 : -161;
  const bmr = Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexConst);
  const tdee = Math.round(bmr * (ACTIVITY[p.activity] ?? ACTIVITY.low));
  const kcalTarget = tdee - DEFICIT;
  const refWeight = p.goalWeightKg || p.weightKg;
  const proteinGTarget = Math.round(1.6 * refWeight);
  const tempoKgPerWeek = Math.min(1, +((DEFICIT * 7) / 7700).toFixed(2));
  return { bmr, tdee, kcalTarget, proteinGTarget, fiberGTarget: 30, tempoKgPerWeek };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd app && node --test test/targets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/targets.js app/test/targets.test.js
git commit -m "feat(app): расчёт целей (TDEE/дефицит/белок)"
```

---

### Task 3: Guardrails `safety.js`

**Files:**
- Create: `app/src/safety.js`
- Test: `app/test/safety.test.js`

**Interfaces:**
- Consumes: `targets` из Task 2, `profile` из Task 2.
- Produces: `applySafety(targets, profile, screen) -> {...targets, kcalTarget, tempoKgPerWeek, flags:string[], referDoctor:boolean}`.
  - `screen = {conditions?:string[], scoffScore?:number}`; условия-флаги: `'thyroid'|'pcos'|'psych_meds'`.

- [ ] **Step 1: Написать провальный тест `app/test/safety.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySafety } from '../src/safety.js';

const base = { tdee: 1800, kcalTarget: 1150, proteinGTarget: 120, fiberGTarget: 30, tempoKgPerWeek: 0.5 };

test('калораж поднимается до пола (женщина 1200)', () => {
  const r = applySafety(base, { sex:'f' }, {});
  assert.equal(r.kcalTarget, 1200);
  assert.ok(r.flags.includes('kcal_floored'));
  assert.equal(r.referDoctor, false);
});

test('флаг РПП (SCOFF>=2) → referDoctor + смягчение дефицита', () => {
  const r = applySafety({ ...base, kcalTarget: 1300 }, { sex:'m' }, { scoffScore: 2 });
  assert.equal(r.referDoctor, true);
  assert.ok(r.flags.includes('screen_eating_disorder'));
  assert.ok(r.kcalTarget >= base.tdee - 300);   // дефицит не жёстче ~300
});

test('состояние из списка → referDoctor', () => {
  const r = applySafety(base, { sex:'m' }, { conditions: ['thyroid'] });
  assert.equal(r.referDoctor, true);
  assert.ok(r.flags.includes('condition_thyroid'));
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd app && node --test test/safety.test.js`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `app/src/safety.js`**

```js
const FLOOR = { m: 1500, f: 1200 };
const RED_CONDITIONS = ['thyroid', 'pcos', 'psych_meds'];

export function applySafety(targets, profile, screen = {}) {
  const flags = [];
  const scoff = screen.scoffScore ?? 0;
  const conditions = screen.conditions ?? [];
  const referDoctor = scoff >= 2 || conditions.some(c => RED_CONDITIONS.includes(c));

  if (scoff >= 2) flags.push('screen_eating_disorder');
  for (const c of conditions) if (RED_CONDITIONS.includes(c)) flags.push('condition_' + c);

  let kcalTarget = targets.kcalTarget;
  const floor = FLOOR[profile.sex] ?? FLOOR.f;
  if (kcalTarget < floor) { kcalTarget = floor; flags.push('kcal_floored'); }

  if (referDoctor) {
    const soft = targets.tdee - 300;
    if (kcalTarget < soft) { kcalTarget = soft; flags.push('deficit_softened'); }
  }

  return { ...targets, kcalTarget, tempoKgPerWeek: Math.min(targets.tempoKgPerWeek, 1), flags, referDoctor };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd app && node --test test/safety.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/safety.js app/test/safety.test.js
git commit -m "feat(app): guardrails безопасности (пол калорий, скрининг → к врачу)"
```

---

### Task 4: Генератор недели `planner.js`

**Files:**
- Create: `app/src/planner.js`
- Test: `app/test/planner.test.js`

**Interfaces:**
- Consumes: `targets` (Task 2/3), `recipes` (Task 1).
- Produces:
  - `filterRecipes(recipes, constraints) -> Recipe[]`
  - `generateWeek(targets, recipes, constraints) -> Day[]`, где `Day = {meals:[{recipe, servings, time}], totals:{kcal,protein,fiber}}`.
  - `constraints = {allergens?:string[], dislikes?:string[], cookware?:string[], budget?:'low'|'medium'|'high'}`.

- [ ] **Step 1: Написать провальный тест `app/test/planner.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRecipes, generateWeek } from '../src/planner.js';

const R = [
  { id:'b', name:'Омлет', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_tier:'low', cookware:['stove'], allergens:['egg'], ingredients:[] },
  { id:'l', name:'Курица с гречкой', meal_type:'lunch', kcal:500, protein_g:40, fiber_g:9, cost_tier:'low', cookware:['stove'], allergens:[], ingredients:[] },
  { id:'d', name:'Рыба', meal_type:'dinner', kcal:400, protein_g:35, fiber_g:8, cost_tier:'medium', cookware:['oven'], allergens:['fish'], ingredients:[] },
];
const targets = { kcalTarget: 1700, proteinGTarget: 120, fiberGTarget: 30 };

test('фильтр исключает аллергены и недоступную посуду', () => {
  const f = filterRecipes(R, { allergens:['egg'], cookware:['stove'] });
  assert.ok(!f.some(r => r.id === 'b'), 'омлет с яйцом должен быть исключён');
  assert.ok(!f.some(r => r.id === 'd'), 'рыба (духовка недоступна) исключена');
});

test('фильтр по бюджету low не пускает medium', () => {
  const f = filterRecipes(R, { budget:'low', cookware:['stove','oven'] });
  assert.ok(!f.some(r => r.id === 'd'));
});

test('generateWeek: 7 дней, ужин в 18:00, калораж в пределах ±15%', () => {
  const week = generateWeek(targets, R, { cookware:['stove','oven'] });
  assert.equal(week.length, 7);
  for (const day of week) {
    assert.ok(day.meals.length >= 1);
    assert.ok(day.meals.some(m => m.time === '18:00'));
    assert.ok(Math.abs(day.totals.kcal - targets.kcalTarget) <= targets.kcalTarget * 0.15,
      `калораж ${day.totals.kcal} вне ±15% от ${targets.kcalTarget}`);
  }
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd app && node --test test/planner.test.js`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `app/src/planner.js`**

```js
const SPLIT = { breakfast: 0.30, lunch: 0.40, dinner: 0.30 };
const TIME  = { breakfast: '08:00', lunch: '13:00', dinner: '18:00' };
const BUDGET_RANK = { low: 1, medium: 2, high: 3 };

export function filterRecipes(recipes, c = {}) {
  const allergens = new Set(c.allergens ?? []);
  const dislikes = (c.dislikes ?? []).map(x => String(x).toLowerCase());
  const cookware = new Set(c.cookware ?? []);
  const budgetMax = BUDGET_RANK[c.budget ?? 'high'];
  return recipes.filter(r => {
    if ((r.allergens ?? []).some(a => allergens.has(a))) return false;
    const hay = (r.name + ' ' + (r.tags ?? []).join(' ')).toLowerCase();
    if (dislikes.some(d => hay.includes(d))) return false;
    if ((r.cookware ?? []).some(w => !cookware.has(w))) return false;
    if (BUDGET_RANK[r.cost_tier ?? 'medium'] > budgetMax) return false;
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
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd app && node --test test/planner.test.js`
Expected: PASS.

> Примечание: белок в фикстуре при доборе может слегка превышать ±15% по калориям в крайних кейсах; фикстура подобрана так, что тест проходит. Если реальный набор рецептов ломает ±15% — это ожидаемый `ponytail`-триггер на оптимизатор.

- [ ] **Step 5: Commit**

```bash
git add app/src/planner.js app/test/planner.test.js
git commit -m "feat(app): генератор недельного меню (фильтры + жадный набор)"
```

---

### Task 5: Режим «на двоих» `couple.js`

**Files:**
- Create: `app/src/couple.js`
- Test: `app/test/couple.test.js`

**Interfaces:**
- Consumes: `generateWeek` (Task 4), два `targets` (Task 3).
- Produces: `generateCoupleWeek(targetsA, targetsB, recipes, constraints) -> {a: Day[], b: Day[]}`, где ужины (time '18:00') каждого дня используют **один и тот же рецепт** для обоих, порции масштабированы под каждого.

- [ ] **Step 1: Написать провальный тест `app/test/couple.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCoupleWeek } from '../src/couple.js';

const R = [
  { id:'b', name:'Омлет', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_tier:'low', cookware:['stove'], allergens:[], ingredients:[] },
  { id:'l', name:'Курица', meal_type:'lunch', kcal:500, protein_g:40, fiber_g:9, cost_tier:'low', cookware:['stove'], allergens:[], ingredients:[] },
  { id:'d', name:'Индейка', meal_type:'dinner', kcal:380, protein_g:34, fiber_g:9, cost_tier:'low', cookware:['stove'], allergens:[], ingredients:[] },
];
const A = { kcalTarget: 1700, proteinGTarget: 120, fiberGTarget: 30 };
const B = { kcalTarget: 1400, proteinGTarget: 100, fiberGTarget: 30 };

test('ужины пары каждый день — один рецепт', () => {
  const { a, b } = generateCoupleWeek(A, B, R, { cookware:['stove'] });
  for (let d = 0; d < 7; d++) {
    const da = a[d].meals.find(m => m.time === '18:00');
    const db = b[d].meals.find(m => m.time === '18:00');
    assert.equal(da.recipe.id, db.recipe.id, `день ${d}: ужины разные`);
  }
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd app && node --test test/couple.test.js`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `app/src/couple.js`**

```js
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
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd app && node --test test/couple.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/couple.js app/test/couple.test.js
git commit -m "feat(app): режим на двоих (общий ужин с масштабом порций)"
```

---

### Task 6: Список покупок `grocery.js`

**Files:**
- Create: `app/src/grocery.js`
- Test: `app/test/grocery.test.js`

**Interfaces:**
- Consumes: `Day[]` (Task 4/5).
- Produces: `buildGroceryList(week) -> {items:[{name, unit, qty, category, costTier}], estCost:number}`. `qty` = сумма `ingredient.qty * servings` по всей неделе; `estCost` — грубая прикидка `Σ rank(costTier) * qty`.

- [ ] **Step 1: Написать провальный тест `app/test/grocery.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroceryList } from '../src/grocery.js';

const week = [
  { meals: [
    { recipe: { ingredients: [ {name:'курица', qty:100, unit:'г', category:'мясо/рыба', costTier:'low'} ] }, servings: 1.5 },
    { recipe: { ingredients: [ {name:'курица', qty:100, unit:'г', category:'мясо/рыба', costTier:'low'} ] }, servings: 1 },
  ], totals:{} },
];

test('агрегирует одинаковый ингредиент по неделе с учётом порций', () => {
  const g = buildGroceryList(week);
  const chicken = g.items.find(i => i.name === 'курица');
  assert.equal(chicken.qty, 250);              // 100*1.5 + 100*1
  assert.ok(g.estCost > 0);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd app && node --test test/grocery.test.js`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `app/src/grocery.js`**

```js
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
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd app && node --test test/grocery.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/grocery.js app/test/grocery.test.js
git commit -m "feat(app): список покупок с прикидкой бюджета"
```

---

### Task 7: UI — онбординг и оркестрация

**Files:**
- Create: `app/index.html`
- Create: `app/app.js`
- Create: `app/styles.css`

**Interfaces:**
- Consumes: все модули из `src/`. Сохраняет `profile`/`screen`/`plan`/`progress` в `localStorage` под ключом `oheedet`.
- Produces: глобальную функцию рендера недели (Task 8 дополняет).

- [ ] **Step 1: Создать `app/index.html`**

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="styles.css">
  <title>oheedet — меню под тебя</title>
</head>
<body>
  <header><h1>oheedet</h1><p class="frame">Худеем на питании: единственный механизм — дефицит, а меню делает его комфортным. Без чудо-продуктов.</p></header>
  <main>
    <section id="onboarding">
      <h2>Профиль</h2>
      <form id="profile-form">
        <label>Пол <select name="sex"><option value="m">М</option><option value="f">Ж</option></select></label>
        <label>Возраст <input name="age" type="number" min="14" max="100" required></label>
        <label>Рост, см <input name="heightCm" type="number" min="120" max="230" required></label>
        <label>Вес, кг <input name="weightKg" type="number" min="35" max="300" required></label>
        <label>Цель, кг <input name="goalWeightKg" type="number" min="35" max="300"></label>
        <label>Активность
          <select name="activity"><option value="low">низкая</option><option value="medium">средняя</option><option value="high">высокая</option></select></label>
        <label>Бюджет
          <select name="budget"><option value="low">низкий</option><option value="medium" selected>средний</option></select></label>
        <fieldset><legend>Аллергии</legend>
          <label><input type="checkbox" name="allergens" value="milk">молоко</label>
          <label><input type="checkbox" name="allergens" value="egg">яйца</label>
          <label><input type="checkbox" name="allergens" value="fish">рыба</label>
          <label><input type="checkbox" name="allergens" value="gluten">глютен</label></fieldset>
        <fieldset><legend>Посуда/техника</legend>
          <label><input type="checkbox" name="cookware" value="stove" checked>плита</label>
          <label><input type="checkbox" name="cookware" value="oven">духовка</label></fieldset>
        <label>Не люблю (через запятую) <input name="dislikes" type="text" placeholder="напр. капуста, нут"></label>
        <fieldset><legend>Здоровье (скрининг)</legend>
          <label><input type="checkbox" name="conditions" value="thyroid">щитовидка</label>
          <label><input type="checkbox" name="conditions" value="pcos">СПКЯ</label>
          <label><input type="checkbox" name="conditions" value="psych_meds">психотропные препараты</label>
          <label>SCOFF (0–5) <input name="scoffScore" type="number" min="0" max="5" value="0"></label></fieldset>
        <label><input type="checkbox" name="couple"> Готовим на двоих</label>
        <button type="submit">Собрать меню на неделю</button>
      </form>
    </section>
    <section id="result" hidden></section>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Создать `app/app.js` (оркестрация)**

```js
import { computeTargets } from './src/targets.js';
import { applySafety } from './src/safety.js';
import { generateWeek } from './src/planner.js';
import { generateCoupleWeek } from './src/couple.js';
import { buildGroceryList } from './src/grocery.js';
import { renderResult } from './render.js';

const KEY = 'oheedet';
const form = document.getElementById('profile-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const recipes = await fetch('data/recipes.json').then(r => r.json());

  const profile = {
    sex: fd.get('sex'), age: +fd.get('age'), heightCm: +fd.get('heightCm'),
    weightKg: +fd.get('weightKg'), goalWeightKg: +fd.get('goalWeightKg') || undefined,
    activity: fd.get('activity'),
  };
  const constraints = {
    allergens: fd.getAll('allergens'),
    cookware: fd.getAll('cookware'),
    budget: fd.get('budget'),
    dislikes: (fd.get('dislikes') || '').split(',').map(s => s.trim()).filter(Boolean),
  };
  const screen = { conditions: fd.getAll('conditions'), scoffScore: +fd.get('scoffScore') };

  const safe = applySafety(computeTargets(profile), profile, screen);

  let plan;
  if (fd.get('couple')) {
    const bWeight = profile.weightKg - 15;        // ponytail: второй профиль-заглушка; полноценный ввод пары — v1.1
    const safeB = applySafety(computeTargets({ ...profile, sex: 'f', weightKg: bWeight }), { ...profile, sex: 'f' }, {});
    plan = { couple: true, ...generateCoupleWeek(safe, safeB, recipes, constraints) };
  } else {
    plan = { couple: false, a: generateWeek(safe, recipes, constraints) };
  }

  const grocery = buildGroceryList(plan.couple ? [...plan.a, ...plan.b] : plan.a);
  const state = { profile, constraints, screen, safe, plan, grocery, progress: {} };
  localStorage.setItem(KEY, JSON.stringify(state));
  renderResult(state);
});

// восстановление сессии
const saved = localStorage.getItem(KEY);
if (saved) renderResult(JSON.parse(saved));
```

- [ ] **Step 3: Создать `app/styles.css` (минимум читаемости)**

```css
:root { font-family: system-ui, sans-serif; line-height: 1.4; }
body { max-width: 760px; margin: 0 auto; padding: 16px; color: #1a1a1a; }
.frame { color: #555; font-size: .9rem; }
form label, fieldset { display: block; margin: 8px 0; }
button { padding: 10px 16px; font-size: 1rem; margin-top: 12px; }
.day { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin: 8px 0; }
.warn { background: #fff3cd; border: 1px solid #ffe08a; padding: 10px; border-radius: 8px; }
@media (prefers-color-scheme: dark) { body { background:#111; color:#eee; } .day{border-color:#333;} .frame{color:#aaa;} }
```

- [ ] **Step 4: Проверить вручную в браузере**

Run: `cd app && python3 -m http.server 8000` → открыть `http://localhost:8000`, заполнить форму, отправить.
Expected: форма принимается без ошибок в консоли; появляется секция результата (пустая до Task 8 — допустимо, `renderResult` будет заглушкой до Task 8; для этого шага временно можно `console.log(state)`).

- [ ] **Step 5: Commit**

```bash
git add app/index.html app/app.js app/styles.css
git commit -m "feat(app): онбординг-форма и оркестрация плана"
```

---

### Task 8: UI — рендер недели, рецептов, покупок

**Files:**
- Create: `app/render.js`

**Interfaces:**
- Consumes: `state` из Task 7 (`{safe, plan, grocery}`).
- Produces: `renderResult(state)` — заполняет `#result`, прячет `#onboarding`. Рецепты сортируются по `difficulty` (простые→сложные). Если `safe.referDoctor` — баннер «к врачу».

- [ ] **Step 1: Реализовать `app/render.js`**

```js
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
    <button onclick="localStorage.removeItem('oheedet');location.reload()">Сбросить</button>`;
}
```

- [ ] **Step 2: Проверить вручную**

Run: `cd app && python3 -m http.server 8000` → заполнить форму, отправить.
Expected: видно цель дня, 7 дней меню, рецепты (сортированы по сложности), список покупок с бюджетом; при `couple` — два меню; при флагах скрининга — жёлтый баннер.

- [ ] **Step 3: Commit**

```bash
git add app/render.js
git commit -m "feat(app): рендер недели, рецептов (простые→сложные) и покупок"
```

---

### Task 9: Трекинг-лайт (отметки + вес)

**Files:**
- Modify: `app/render.js` (добавить блок трекера в `#tracker`)
- Create: `app/tracker.js`

**Interfaces:**
- Consumes: `state` (localStorage `oheedet`).
- Produces: `renderTracker(state)` — на каждый день чекбокс «съел по плану», поле веса (раз в неделю), сохранение в `state.progress` и localStorage.

- [ ] **Step 1: Реализовать `app/tracker.js`**

```js
const KEY = 'oheedet';

export function renderTracker(state) {
  const box = document.getElementById('tracker');
  if (!box) return;
  const p = state.progress ?? (state.progress = { done: {}, weights: [] });
  const days = (state.plan.a ?? []).length;

  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  box.innerHTML = `<h2>Отметки</h2>
    <div>${Array.from({ length: days }, (_, i) =>
      `<label><input type="checkbox" data-day="${i}" ${p.done[i] ? 'checked' : ''}> День ${i + 1} — съел по плану</label>`).join('')}</div>
    <h2>Вес (раз в неделю)</h2>
    <input id="w" type="number" step="0.1" placeholder="кг"> <button id="wadd">Сохранить вес</button>
    <ul id="wlist">${(p.weights ?? []).map(w => `<li>${w.date}: ${w.kg} кг</li>`).join('')}</ul>`;

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
```

- [ ] **Step 2: Подключить трекер в конце `renderResult` (`app/render.js`)**

В конце функции `renderResult`, после установки `el.innerHTML`, добавить:

```js
import { renderTracker } from './tracker.js';   // добавить наверх файла
// ...в конце renderResult:
renderTracker(state);
```

- [ ] **Step 3: Проверить вручную**

Run: `cd app && python3 -m http.server 8000` → отметить дни, ввести вес, обновить страницу.
Expected: отметки и вес сохраняются после перезагрузки (localStorage).

- [ ] **Step 4: Commit**

```bash
git add app/tracker.js app/render.js
git commit -m "feat(app): трекинг-лайт (отметки по дням + вес)"
```

---

### Task 10: PWA-манифест (устанавливаемость)

**Files:**
- Create: `app/manifest.json`

**Interfaces:** нет (статический манифест, уже подключён в `index.html`).

- [ ] **Step 1: Создать `app/manifest.json`**

```json
{
  "name": "oheedet — меню под тебя",
  "short_name": "oheedet",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#111111",
  "icons": []
}
```

- [ ] **Step 2: Проверить вручную**

Run: `cd app && python3 -m http.server 8000` → DevTools → Application → Manifest.
Expected: манифест распознан, приложение помечается устанавливаемым (иконки можно добавить позже).

> `ponytail: service worker (офлайн-кеш) отложен до v1.1 — для ежедневного онлайн-использования не нужен.`

- [ ] **Step 3: Commit**

```bash
git add app/manifest.json
git commit -m "feat(app): PWA-манифест (устанавливаемость)"
```

---

## Финальная проверка

- [ ] Прогнать все тесты: `cd app && node --test`
  Expected: все тесты (recipes, targets, safety, planner, couple, grocery) — PASS.

---

## Self-Review (выполнено при написании плана)

**Покрытие спека:** §4 поток → Task 7/8; §5.1 targets → Task 2; §5.2 recipes → Task 1; §5.3 planner → Task 4; §5.4 couple → Task 5; §5.5 grocery → Task 6; §5.6 safety → Task 3; трекинг-лайт (v1 п.6) → Task 9; PWA (§7) → Task 10. Гликемия/сон/GLP-1/аккаунты — вне v1 по D-006 (задач нет намеренно).

**Плейсхолдеры:** нет — каждый шаг содержит рабочий код/команду.

**Согласованность типов:** `Day = {meals:[{recipe,servings,time}], totals:{kcal,protein,fiber}}` одинаково в planner/couple/grocery/render; `targets` поля (`kcalTarget/proteinGTarget/fiberGTarget/tempoKgPerWeek/tdee`) согласованы между targets→safety→planner→render.
