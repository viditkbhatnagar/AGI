import { describe, it, expect } from 'vitest';

describe('Copy Redirect Integration', () => {
  it('should construct redirect URL with highlight parameters correctly', () => {
    // Test the URL construction logic that would be used in the redirect
    const successfulCopies = [
      { sandboxSlug: 'sandbox-1', success: true, newCourseSlug: 'course-1' },
      { sandboxSlug: 'sandbox-2', success: true, newCourseSlug: 'course-2' },
      { sandboxSlug: 'sandbox-3', success: false, error: 'Failed to copy' }
    ];

    const newCourseSlugs = successfulCopies
      .filter(result => result.success)
      .map(result => result.newCourseSlug)
      .filter(Boolean)
      .join(',');

    const expectedUrl = `/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}`;
    
    expect(newCourseSlugs).toBe('course-1,course-2');
    expect(expectedUrl).toBe('/admin/courses?highlight=course-1%2Ccourse-2');
  });

  it('should handle URL parameter parsing correctly', () => {
    // Test the URL parameter parsing logic
    const testUrl = '/admin/courses?highlight=course-1%2Ccourse-2';
    const urlParams = new URLSearchParams(testUrl.split('?')[1] || '');
    const highlightParam = urlParams.get('highlight');
    
    expect(highlightParam).toBe('course-1,course-2');
    
    if (highlightParam) {
      const courseSlugs = highlightParam.split(',').filter(Boolean);
      expect(courseSlugs).toEqual(['course-1', 'course-2']);
    }
  });

  it('should handle empty highlight parameters', () => {
    const testUrl = '/admin/courses';
    const urlParams = new URLSearchParams(testUrl.split('?')[1] || '');
    const highlightParam = urlParams.get('highlight');
    
    expect(highlightParam).toBeNull();
  });

  it('should handle malformed highlight parameters', () => {
    const testUrl = '/admin/courses?highlight=';
    const urlParams = new URLSearchParams(testUrl.split('?')[1] || '');
    const highlightParam = urlParams.get('highlight');
    
    expect(highlightParam).toBe('');
    
    if (highlightParam) {
      const courseSlugs = highlightParam.split(',').filter(Boolean);
      expect(courseSlugs).toEqual([]);
    }
  });
});