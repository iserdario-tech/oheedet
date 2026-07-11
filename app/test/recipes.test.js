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
