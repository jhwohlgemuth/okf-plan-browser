/** Advance a force simulation within one animation frame's work allowance. */
export function advanceGraphLayout(
  simulation: { tick: () => unknown; alpha: () => number; alphaMin: () => number },
  now: () => number,
  maxTicks = 4,
  budgetMs = 6,
): boolean {
  const started = now();
  for (let ticks = 0; ticks < maxTicks && simulation.alpha() > simulation.alphaMin(); ticks++) {
    simulation.tick();
    if (now() - started >= budgetMs) break;
  }
  return simulation.alpha() > simulation.alphaMin();
}
