import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRecipes, generateWeek, generateDay, swapDish } from '../src/planner.js';

const R = [
  { id:'b', name:'Омлет', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_rub:80, cookware:['stove'], allergens:['egg'], cuisine:'universal', ingredients:[] },
  { id:'l', name:'Курица с гречкой', meal_type:'lunch', kcal:500, protein_g:40, fiber_g:9, cost_rub:120, cookware:['stove'], allergens:[], cuisine:'universal', ingredients:[] },
  { id:'d', name:'Рыба', meal_type:'dinner', kcal:400, protein_g:35, fiber_g:8, cost_rub:160, cookware:['oven'], allergens:['fish'], cuisine:'universal', ingredients:[] },
];
const targets = { kcalTarget: 1700, proteinGTarget: 120, fiberGTarget: 30 };

test('фильтр исключает аллергены и недоступную посуду', () => {
  const f = filterRecipes(R, { allergens:['egg'], cookware:['stove'] });
  assert.ok(!f.some(r => r.id === 'b'), 'омлет с яйцом должен быть исключён');
  assert.ok(!f.some(r => r.id === 'd'), 'рыба (духовка недоступна) исключена');
});

test('бюджет small не пускает дорогое блюдо (₽)', () => {
  const RR = [
    { id:'cheap', name:'Каша', meal_type:'breakfast', kcal:300, protein_g:20, fiber_g:5, cost_rub:80, cookware:['stove'], allergens:[], cuisine:'universal', ingredients:[] },
    { id:'pricey', name:'Лосось', meal_type:'dinner', kcal:400, protein_g:35, fiber_g:6, cost_rub:380, cookware:['stove'], allergens:[], cuisine:'universal', ingredients:[] },
  ];
  const f = filterRecipes(RR, { budget:'small', cookware:['stove'] });
  assert.ok(f.some(r => r.id === 'cheap'));
  assert.ok(!f.some(r => r.id === 'pricey'), '380 ₽ выше потолка маленького бюджета');
});

test('нелюбимое ловит русские словоформы (капуста → капустой)', () => {
  const RR = [{ id:'k', name:'Индейка с тушёной капустой', meal_type:'dinner', kcal:380, protein_g:34, fiber_g:9, cost_rub:130, cookware:['stove'], allergens:[], cuisine:'universal', ingredients:[] }];
  const f = filterRecipes(RR, { dislikes:['капуста'], cookware:['stove'] });
  assert.equal(f.length, 0);
});

test('фильтр кухни: выбор оставляет выбранную + universal, но не роняет план', () => {
  const RR = [
    { id:'bu', name:'Завтрак-универ', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_rub:80, cookware:['stove'], allergens:[], cuisine:'universal', ingredients:[] },
    { id:'ba', name:'Завтрак-азия', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_rub:80, cookware:['stove'], allergens:[], cuisine:'asian', ingredients:[] },
    { id:'bm', name:'Завтрак-медит', meal_type:'breakfast', kcal:300, protein_g:22, fiber_g:4, cost_rub:80, cookware:['stove'], allergens:[], cuisine:'mediterranean', ingredients:[] },
  ];
  const f = filterRecipes(RR, { cuisines:['asian'], cookware:['stove'] });
  assert.ok(f.some(r => r.id === 'ba'), 'азиатский должен остаться');
  assert.ok(f.some(r => r.id === 'bu'), 'universal остаётся всегда (страховка)');
  assert.ok(!f.some(r => r.id === 'bm'), 'средиземноморский отфильтрован');
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

test('десерт вплетается в день в рамках лакомственного бюджета', () => {
  const pool = [
    { id:'b', meal_type:'breakfast', kcal:300, protein_g:20, fiber_g:5 },
    { id:'l', meal_type:'lunch', kcal:500, protein_g:40, fiber_g:9 },
    { id:'d', meal_type:'dinner', kcal:400, protein_g:35, fiber_g:8 },
    { id:'s', meal_type:'dessert', kcal:200, protein_g:20, fiber_g:3 },
  ];
  const day = generateDay(targets, pool, 0);
  assert.ok(day.meals.some(m => m.slot === 'dessert'), 'десерт должен быть в дне');
  assert.ok(Math.abs(day.totals.kcal - targets.kcalTarget) <= targets.kcalTarget * 0.15,
    `с десертом день ${day.totals.kcal} должен остаться у цели`);
});

test('swapDish меняет блюдо того же слота', () => {
  const pool = [
    { id:'b1', meal_type:'breakfast', kcal:300, protein_g:20, fiber_g:5 },
    { id:'b2', meal_type:'breakfast', kcal:320, protein_g:22, fiber_g:5 },
    { id:'l', meal_type:'lunch', kcal:500, protein_g:40, fiber_g:9 },
    { id:'d', meal_type:'dinner', kcal:400, protein_g:35, fiber_g:8 },
  ];
  const day = generateDay(targets, pool, 0);
  const i = day.meals.findIndex(m => m.slot === 'breakfast');
  const before = day.meals[i].recipe.id;
  assert.ok(swapDish(day, i, targets, pool));
  assert.notEqual(day.meals[i].recipe.id, before);
  assert.ok(day.totals.kcal > 0);
});
