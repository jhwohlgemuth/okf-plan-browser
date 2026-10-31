import type { PhaseStatus } from '@/types/wiki';

export const PHASE_COLUMNS: { status: PhaseStatus; label: string }[] = [
  { status: 'planned', label: 'Planned' },
  { status: 'ready', label: 'Ready' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'waiting-on-validation', label: 'Waiting on Validation' },
  { status: 'blocked', label: 'Blocked' },
];

export const PHASE_COLUMN_HEADER: Record<PhaseStatus, string> = {
  planned: 'border-od-border text-od-muted',
  ready: 'border-od-green text-od-green',
  'in-progress': 'border-od-blue text-od-blue',
  'waiting-on-validation': 'border-od-yellow text-od-yellow',
  blocked: 'border-od-red text-od-red',
};
