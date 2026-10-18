import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable colour for a repo based on its index. */
export const REPO_COLORS = [
  '#61afef', '#98c379', '#e5c07b', '#e06c75',
  '#c678dd', '#56b6c2', '#d19a66',
] as const;

export function repoColor(index: number): string {
  return REPO_COLORS[index % REPO_COLORS.length] ?? REPO_COLORS[0];
}

/** Truncate a string with an ellipsis. */
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

/** Debounce a function. */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function onActivateKey(fn: () => void) {
  return (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };
}
