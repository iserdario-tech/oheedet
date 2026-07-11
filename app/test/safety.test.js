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
