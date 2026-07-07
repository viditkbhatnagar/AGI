import { describe, it, expect } from 'vitest';
import { classifyEvent, isContactEvent } from './contactClassification';

describe('classifyEvent', () => {
  it('counts live attendance and faculty RSI as contact', () => {
    expect(classifyEvent('live.attended')).toBe('contact');
    expect(classifyEvent('discussion.posted')).toBe('contact');
    expect(classifyEvent('feedback.published')).toBe('contact');
    expect(classifyEvent('assessment.graded')).toBe('contact');
  });

  it('never counts AI tutor or content views as contact', () => {
    expect(classifyEvent('aitutor.interaction')).toBe('engagement');
    expect(classifyEvent('module.viewed')).toBe('engagement');
    expect(isContactEvent('aitutor.interaction')).toBe(false);
  });

  it('classifies unknown events as other', () => {
    expect(classifyEvent('catalog.applied')).toBe('other');
  });
});
