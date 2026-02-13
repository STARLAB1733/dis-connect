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
