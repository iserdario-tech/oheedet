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
