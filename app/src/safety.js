const FLOOR = { m: 1500, f: 1200 };
const RED_CONDITIONS = ['thyroid', 'pcos', 'psych_meds'];

export function applySafety(targets, profile, screen = {}) {
  const flags = [];
  const scoff = screen.scoffScore ?? 0;
  const conditions = screen.conditions ?? [];
  const referDoctor = scoff >= 2 || conditions.some(c => RED_CONDITIONS.includes(c));

  if (scoff >= 2) flags.push('screen_eating_disorder');
  for (const c of conditions) if (RED_CONDITIONS.includes(c)) flags.push('condition_' + c);

  let kcalTarget = targets.kcalTarget;
  const floor = FLOOR[profile.sex] ?? FLOOR.f;
  if (kcalTarget < floor) { kcalTarget = floor; flags.push('kcal_floored'); }

  if (referDoctor) {
    const soft = targets.tdee - 300;
    if (kcalTarget < soft) { kcalTarget = soft; flags.push('deficit_softened'); }
  }

  return { ...targets, kcalTarget, tempoKgPerWeek: Math.min(targets.tempoKgPerWeek, 1), flags, referDoctor };
}
