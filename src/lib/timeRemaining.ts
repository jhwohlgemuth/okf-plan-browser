import type { ParsedPlan, Phase } from '@/types/wiki';
import { isEpic } from './planKind';

export interface TimeEstimate {
  hours: number;
  estimated: number;
  unknown: number;
  epics: number;
}

const empty = (): TimeEstimate => ({ hours: 0, estimated: 0, unknown: 0, epics: 0 });

/** Read explicit effort fields, not incidental numbers in prose or code examples. */
function fieldHours(body: string, field: RegExp): number | undefined {
  let fence = '';
  for (const raw of body.split('\n')) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(raw)?.[1];
    if (marker) { if (!fence) fence = marker; else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ''; continue; }
    if (fence) continue;
    const line = raw.replace(/[*`]/g, '').replace(/^\s*[-+>]\s*/, '').trim();
    const split = line.indexOf(':');
    if (split < 0 || !field.test(line.slice(0, split).trim())) continue;
    let value = line.slice(split + 1).trim();
    if (/hours$/i.test(line.slice(0, split)) && /^\d+(?:\.\d+)?$/.test(value)) value += ' hours';
    const match = /^(?:(?:up to|at most|maximum|max\.?|~|≤)\s*)?(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:(?:active|agent)\s+)?(hours?|hrs?|h|minutes?|mins?|m)\b/i.exec(value);
    if (!match) return undefined;
    const upper = Math.max(Number(match[1]), Number(match[2] ?? match[1]));
    const hours = upper / (/^m/i.test(match[3] ?? '') ? 60 : 1);
    return Number.isFinite(hours) ? hours : undefined;
  }
  return undefined;
}

export function phaseTime(plan: ParsedPlan, phase: Phase): TimeEstimate {
  if (isEpic(plan)) return { ...empty(), epics: 1 };
  const remaining = fieldHours(phase.rawBody, /^(?:time remaining|remaining|remaining hours)$/i);
  const budget = fieldHours(phase.rawBody, /^budget$/i);
  const fallback = plan.frontmatter.phase_budget_hours;
  const hours = remaining ?? budget ?? (typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0 ? fallback : undefined);
  return hours === undefined ? { ...empty(), unknown: 1 } : { ...empty(), hours, estimated: 1 };
}

export function planTime(plan: ParsedPlan): TimeEstimate {
  if (isEpic(plan)) return { ...empty(), epics: 1 };
  const phases = plan.sections.flatMap(s => s.phases);
  return sum(phases.map(phase => phaseTime(plan, phase)));
}

function sum(estimates: TimeEstimate[]): TimeEstimate {
  return estimates.reduce((total, e) => ({ hours: total.hours + e.hours,
    estimated: total.estimated + e.estimated, unknown: total.unknown + e.unknown,
    epics: total.epics + e.epics }), empty());
}

export const totalTime = (plans: ParsedPlan[]) => sum(plans.map(planTime));

export function formatTime(estimate: TimeEstimate): string {
  if (!estimate.estimated && estimate.unknown) return `Not estimated (${estimate.unknown})`;
  if (!estimate.estimated && estimate.epics && !estimate.unknown) return 'N/A (Epic)';
  const minutes = Math.ceil(estimate.hours * 60 - 1e-9);
  const duration = minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`;
  return `${estimate.hours ? '~' : ''}${duration}${estimate.unknown ? ` + ${estimate.unknown} unestimated` : ''}`;
}

export const TIME_EXPLANATION = 'Estimated active work remaining: explicit phase Remaining, then phase Budget, then phase_budget_hours. Ranges use the upper bound. In-progress and blocked phases retain their budget; elapsed time and external waiting are not tracked. Epics have no phase estimate; linked plans are counted separately. Unestimated work is not counted as zero.';
