import { describe, it, expect } from 'vitest';
import { csvDate, toCsv } from '@/lib/csv';

describe('toCsv', () => {
  it('renders missing values as empty cells instead of throwing', () => {
    // A student with no phone on file used to crash the whole export.
    const csv = toCsv([
      ['Name', 'Phone'],
      ['Peter Parker', undefined],
      ['Mary Jane', null],
    ]);
    expect(csv).toBe('"Name","Phone"\r\n"Peter Parker",""\r\n"Mary Jane",""');
  });

  it('escapes embedded quotes, commas and newlines', () => {
    expect(toCsv([['He said "hi", then\nleft']])).toBe('"He said ""hi"", then\nleft"');
  });

  it('stringifies numbers and booleans', () => {
    expect(toCsv([[42, true, 0]])).toBe('"42","true","0"');
  });
});

describe('csvDate', () => {
  it('formats valid dates as YYYY-MM-DD', () => {
    expect(csvDate('2025-04-05T10:00:00.000Z')).toBe('2025-04-05');
  });

  it('returns an empty string for missing or invalid dates instead of throwing', () => {
    expect(csvDate(undefined)).toBe('');
    expect(csvDate(null)).toBe('');
    expect(csvDate('not a date')).toBe('');
  });
});
