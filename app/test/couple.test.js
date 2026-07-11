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
