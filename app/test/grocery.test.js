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
