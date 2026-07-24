import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroceryList } from '../src/grocery.js';

const week = [
  { meals: [
    { recipe: { cost_rub: 90, ingredients: [ {name:'куриное филе', qty:100, unit:'г', category:'мясо/рыба', costTier:'low'} ] }, servings: 1.5 },
    { recipe: { cost_rub: 20, ingredients: [ {name:'рис', qty:50, unit:'г', category:'крупы', costTier:'low'} ] }, servings: 1 },
  ], totals:{} },
  { meals: [
    { recipe: { cost_rub: 90, ingredients: [ {name:'куриное филе', qty:100, unit:'г', category:'мясо/рыба', costTier:'low'} ] }, servings: 1 },
    { recipe: { cost_rub: 60, ingredients: [ {name:'фасоль консервированная', qty:150, unit:'г', category:'бобовые', costTier:'low'} ] }, servings: 1 },
  ], totals:{} },
];

test('агрегирует одинаковый ингредиент по неделе с учётом порций', () => {
  const g = buildGroceryList(week);
  const chicken = g.items.find(i => i.name === 'куриное филе');
  assert.equal(chicken.qty, 250);              // 100*1.5 + 100*1
  assert.ok(g.estCost > 0);
});

test('список по дням + бюджет в ₽', () => {
  const g = buildGroceryList(week);
  assert.equal(g.byDay.length, 2);
  assert.equal(g.byDay[0].estCostRub, Math.round(90 * 1.5 + 20)); // 155
  assert.equal(g.estCostRub, g.byDay[0].estCostRub + g.byDay[1].estCostRub);
});

test('скоропорт помечается, консервы — нет', () => {
  const g = buildGroceryList(week);
  assert.equal(g.items.find(i => i.name === 'куриное филе').perishable, true);
  assert.equal(g.items.find(i => i.name === 'фасоль консервированная').perishable, false);
});
