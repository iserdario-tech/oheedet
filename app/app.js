import { computeTargets } from './src/targets.js';
import { applySafety } from './src/safety.js';
import { generateWeek, filterRecipes } from './src/planner.js';
import { generateCoupleWeek } from './src/couple.js';
import { buildGroceryList } from './src/grocery.js';
import { renderResult } from './render.js';

const KEY = 'oheedet';

// переключатель темы
const root = document.documentElement;
function syncThemeButtons() {
  const dark = root.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('[data-theme-set]').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === (dark ? 'dark' : 'light'))));
}
document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.themeSet;
  if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
  localStorage.setItem('oheedet-theme', t);
  syncThemeButtons();
}));
syncThemeButtons();

const form = document.getElementById('profile-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const [recipes, treats] = await Promise.all([
    fetch('data/recipes.json').then(r => r.json()),
    fetch('data/treats.json').then(r => r.json()),
  ]);

  const profile = {
    sex: fd.get('sex'), age: +fd.get('age'), heightCm: +fd.get('heightCm'),
    weightKg: +fd.get('weightKg'), goalWeightKg: +fd.get('goalWeightKg') || undefined,
    activity: fd.get('activity'),
  };
  const csv = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const constraints = {
    allergens: fd.getAll('allergens'),
    cookware: fd.getAll('cookware'),
    budget: fd.get('budget'),
    cuisines: fd.getAll('cuisines'),
    dislikes: csv(fd.get('dislikes')),
  };
  const screen = { conditions: fd.getAll('conditions'), scoffScore: fd.getAll('scoff').length };

  const safe = applySafety(computeTargets(profile), profile, screen);

  let plan, effectiveC = constraints;
  if (fd.get('couple')) {
    const profileB = {
      sex: fd.get('sex2'), age: +fd.get('age2'), heightCm: +fd.get('heightCm2'),
      weightKg: +fd.get('weightKg2'), goalWeightKg: +fd.get('goalWeightKg2') || undefined,
      activity: fd.get('activity2'),
    };
    const safeB = applySafety(computeTargets(profileB), profileB, {});
    // общий безопасный пул: аллергии/нелюбимое обоих объединяем, чтобы общий ужин подошёл каждому
    effectiveC = {
      ...constraints,
      allergens: [...new Set([...constraints.allergens, ...fd.getAll('allergens2')])],
      dislikes: [...constraints.dislikes, ...csv(fd.get('dislikes2'))],
    };
    plan = { couple: true, ...generateCoupleWeek(safe, safeB, recipes, effectiveC) };
  } else {
    plan = { couple: false, a: generateWeek(safe, recipes, constraints) };
  }

  // десерты — по тем же аллергиям/бюджету, но без фильтра кухни (лакомство внекухонное)
  const desserts = filterRecipes(recipes, { ...effectiveC, cuisines: [] }).filter(r => r.meal_type === 'dessert');

  const grocery = buildGroceryList(plan.couple ? [...plan.a, ...plan.b] : plan.a);
  const state = { profile, constraints, screen, safe, plan, grocery, desserts, treats, progress: {} };
  localStorage.setItem(KEY, JSON.stringify(state));
  renderResult(state);
});

// блок партнёра: показываем и делаем поля обязательными только при режиме «на двоих»
const coupleToggle = document.getElementById('couple-toggle');
const partner = document.getElementById('partner');
coupleToggle.addEventListener('change', () => {
  partner.hidden = !coupleToggle.checked;
  ['age2', 'heightCm2', 'weightKg2'].forEach(n => {
    partner.querySelector(`[name="${n}"]`).required = coupleToggle.checked;
  });
});

// восстановление сессии
const saved = localStorage.getItem(KEY);
if (saved) renderResult(JSON.parse(saved));

// PWA: офлайн через service worker (нужен https или localhost)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
