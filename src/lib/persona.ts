export type Axis =
  | 'Innovation'
  | 'Stability'
  | 'Speed'
  | 'Precision'
  | 'Cost-Conscious'
  | 'Performance-First'
  | 'Autonomy'
  | 'Collaboration';

export type Impact = Partial<Record<Axis, number>>;

export function computePersona(impacts: Impact[]): Record<Axis, number> {
  // 1) Sum up all raw impact values into “totals”
  const totals = impacts.reduce((acc, imp) => {
    (Object.keys(imp) as Axis[]).forEach((a) => {
      acc[a] = (acc[a] || 0) + (imp[a] || 0);
    });
    return acc;
  }, {} as Record<Axis, number>);

  // 2) Find the maximum absolute value (so we can scale into [0..100])
  const maxV = Math.max(...Object.values(totals).map(Math.abs), 1);

  // 3) Make sure every Axis key is present in the final “norm” object.
  const allAxes: Axis[] = [
    'Innovation',
    'Stability',
    'Speed',
    'Precision',
    'Cost-Conscious',
    'Performance-First',
    'Autonomy',
    'Collaboration',
  ];

  const norm: Record<Axis, number> = {} as Record<Axis, number>;
  allAxes.forEach((axis) => {
    // If that axis never showed up, totals[axis] will be undefined → treat as 0
    const rawValue = totals[axis] ?? 0;
    // Scale rawValue ∈ [−maxV..maxV] into [0..100]
    norm[axis] = Math.round((rawValue / maxV) * 50 + 50);
  });

  return norm;
}

/**
 * Given an array of log entries (each with role + axisImpact),
 * compute a total score per C4X role. Returns e.g.:
 * { 'software-engineer': 3.2, 'data-scientist': 2.8, 'cloud-engineer': 1.5 }
 */
export function computePerRoleScores(
  logs: { role: string; axisImpact: Impact }[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  logs.forEach(({ role, axisImpact }) => {
    if (!scores[role]) scores[role] = 0;
    const total = Object.values(axisImpact).reduce(
      (sum, v) => sum + Math.abs(v ?? 0),
      0
    );
    scores[role] += total;
  });
  return scores;
}
