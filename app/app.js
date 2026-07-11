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
    const bWeight = Math.max(40, profile.weightKg - 15);   // ponytail: второй профиль-заглушка; полноценный ввод пары — v1.1
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
