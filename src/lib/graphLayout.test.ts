import { describe, expect, it } from 'vitest';
import { advanceGraphLayout } from './graphLayout';

describe('advanceGraphLayout', () => {
  it('limits each frame by tick count and time', () => {
    let alpha = 1;
    let ticks = 0;
    const simulation = { tick: () => { ticks++; alpha -= 0.1; }, alpha: () => alpha, alphaMin: () => 0.01 };
    expect(advanceGraphLayout(simulation, () => 0, 4, 6)).toBe(true);
    expect(ticks).toBe(4);
    expect(advanceGraphLayout(simulation, () => ticks * 3, 4, 6)).toBe(true);
    expect(ticks).toBe(6);
    while (advanceGraphLayout(simulation, () => 0, 4, 6)) { /* finish */ }
    expect(alpha).toBeLessThanOrEqual(0.01);
  });
});
