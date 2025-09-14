import { describe, it, expect } from 'vitest';

describe('Copy Redirect Logic', () => {
  it('should construct redirect URL with highlight parameters correctly', () => {
    const successfulCopies = [
      { sandboxSlug: 'course-1', success: true, newCourseSlug: 'course-1-copy' },
      { sandboxSlug: 'course-2', success: true, newCourseSlug: 'course-2-copy' }
    ];

    const newCourseSlugs = successfulCopies
      .map(result => result.newCourseSlug)
      .filter(Boolean)
      .join(',');

    const redirectUrl = `/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}`;

    expect(redirectUrl).toBe('/admin/courses?highlight=course-1-copy%2Ccourse-2-copy');
  });

  it('should handle single successful copy', () => {
    const successfulCopies = [
      { sandboxSlug: 'single-course', success: true, newCourseSlug: 'single-course-copy' }
    ];

    const newCourseSlugs = successfulCopies
      .map(result => result.newCourseSlug)
      .filter(Boolean)
      .join(',');

    const redirectUrl = `/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}`;

    expect(redirectUrl).toBe('/admin/courses?highlight=single-course-copy');
  });

  it('should redirect to courses page without highlight when no successful copies', () => {
    const successfulCopies = [
      { sandboxSlug: 'failed-course', success: false, error: 'Copy failed' }
    ];

    const newCourseSlugs = successfulCopies
      .filter(result => result.success)
      .map(result => result.newCourseSlug)
      .filter(Boolean)
      .join(',');

    const redirectUrl = newCourseSlugs ? 
      `/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}` : 
      '/admin/courses';

    expect(redirectUrl).toBe('/admin/courses');
  });

  it('should handle mixed success and failure results', () => {
    const results = [
      { sandboxSlug: 'course-1', success: true, newCourseSlug: 'course-1-copy' },
      { sandboxSlug: 'course-2', success: false, error: 'Copy failed' },
      { sandboxSlug: 'course-3', success: true, newCourseSlug: 'course-3-copy' }
    ];

    const successfulCopies = results.filter(result => result.success);
    const newCourseSlugs = successfulCopies
      .map(result => result.newCourseSlug)
      .filter(Boolean)
      .join(',');

    const redirectUrl = `/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}`;

    expect(redirectUrl).toBe('/admin/courses?highlight=course-1-copy%2Ccourse-3-copy');
    expect(successfulCopies).toHaveLength(2);
  });

  it('should handle URL parameter parsing correctly', () => {
    const urlParams = new URLSearchParams('highlight=course-1-copy%2Ccourse-2-copy');
    const highlightParam = urlParams.get('highlight');
    
    expect(highlightParam).toBe('course-1-copy,course-2-copy');
    
    if (highlightParam) {
      const courseSlugs = highlightParam.split(',').filter(Boolean);
      expect(courseSlugs).toEqual(['course-1-copy', 'course-2-copy']);
    }
  });

  it('should validate redirect conditions', () => {
    const progress = {
      total: 2,
      completed: 2,
      results: [
        { sandboxSlug: 'course-1', success: true, newCourseSlug: 'course-1-copy' },
        { sandboxSlug: 'course-2', success: true, newCourseSlug: 'course-2-copy' }
      ]
    };

    const successfulCopies = progress.results.filter(result => result.success);
    const shouldRedirect = successfulCopies.length > 0 && progress.completed === progress.total;

    expect(shouldRedirect).toBe(true);
    expect(successfulCopies).toHaveLength(2);
  });

  it('should not redirect when operation is incomplete', () => {
    const progress = {
      total: 2,
      completed: 1,
      results: [
        { sandboxSlug: 'course-1', success: true, newCourseSlug: 'course-1-copy' }
      ]
    };

    const successfulCopies = progress.results.filter(result => result.success);
    const shouldRedirect = successfulCopies.length > 0 && progress.completed === progress.total;

    expect(shouldRedirect).toBe(false);
  });
});