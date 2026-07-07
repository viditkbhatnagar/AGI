/** Shared Tailwind class strings + helpers for the AGI Utah screens. */

export const buttonClass =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50';
export const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3';
export const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export const labelClass = 'space-y-1 text-sm';
export const labelTextClass = 'text-slate-600';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}
