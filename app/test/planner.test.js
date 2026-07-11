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

test('нелюбимое ловит русские словоформы (капуста → капустой)', () => {
  const RR = [{ id:'k', name:'Индейка с тушёной капустой', meal_type:'dinner', kcal:380, protein_g:34, fiber_g:9, cost_tier:'low', cookware:['stove'], allergens:[], ingredients:[] }];
  const f = filterRecipes(RR, { dislikes:['капуста'], cookware:['stove'] });
  assert.equal(f.length, 0);
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
