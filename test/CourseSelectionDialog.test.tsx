import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseSelectionDialog } from '../client/src/components/admin/CourseSelectionDialog';
import { ISandboxCourse } from '../server/models/sandboxCourse';

// Mock data for testing
const mockSandboxCourses: ISandboxCourse[] = [
  {
    slug: 'test-course-1',
    title: 'Test Course 1',
    type: 'standalone',
    description: 'A test course for unit testing',
    liveClassConfig: {
      enabled: false,
      frequency: 'weekly',
      dayOfWeek: 'Monday',
      durationMin: 60
    },
    mbaModules: [],
    modules: [
      {
        title: 'Module 1',
        videos: [
          { title: 'Video 1', url: 'http://example.com/video1', duration: 300 }
        ],
        documents: [
          {
            title: 'Document 1',
            fileUrl: 'http://example.com/doc1.pdf',
            fileName: 'doc1.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            publicId: 'doc1_public_id'
          }
        ],
        quiz: { questions: [] },
        quizId: null,
        toObject: () => ({})
      }
    ]
  },
  {
    slug: 'test-course-2',
    title: 'Test Course 2',
    type: 'with-mba',
    description: 'Another test course',
    liveClassConfig: {
      enabled: true,
      frequency: 'weekly',
      dayOfWeek: 'Tuesday',
      durationMin: 90
    },
    mbaModules: [],
    modules: [
      {
        title: 'Module 2',
        videos: [],
        documents: [],
        quiz: { questions: [] },
        quizId: null,
        toObject: () => ({})
      }
    ]
  }
];

describe('CourseSelectionDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    sandboxCourses: mockSandboxCourses,
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with course list', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    expect(screen.getByText('Copy Sandbox Courses to Main Courses')).toBeInTheDocument();
    expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    expect(screen.getByText('Test Course 2')).toBeInTheDocument();
  });

  it('filters courses based on search query', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search courses by name, type, or module...');
    fireEvent.change(searchInput, { target: { value: 'Test Course 1' } });
    
    expect(screen.getByText('Test Course 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Course 2')).not.toBeInTheDocument();
  });

  it('allows selecting and deselecting courses', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    const course1Checkbox = screen.getByLabelText('Test Course 1');
    fireEvent.click(course1Checkbox);
    
    expect(screen.getByText('1 course selected')).toBeInTheDocument();
    
    fireEvent.click(course1Checkbox);
    expect(screen.queryByText('1 course selected')).not.toBeInTheDocument();
  });

  it('enables confirm button only when courses are selected', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /Copy.*Course.*to Main Courses/ });
    expect(confirmButton).toBeDisabled();
    
    const course1Checkbox = screen.getByLabelText('Test Course 1');
    fireEvent.click(course1Checkbox);
    
    expect(confirmButton).toBeEnabled();
  });

  it('calls onConfirm with selected course slugs', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    const course1Checkbox = screen.getByLabelText('Test Course 1');
    fireEvent.click(course1Checkbox);
    
    const confirmButton = screen.getByRole('button', { name: /Copy.*Course.*to Main Courses/ });
    fireEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledWith(['test-course-1']);
  });

  it('handles select all functionality', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    const selectAllCheckbox = screen.getByLabelText('Select All (2)');
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.getByText('2 courses selected')).toBeInTheDocument();
    
    fireEvent.click(selectAllCheckbox);
    expect(screen.queryByText('2 courses selected')).not.toBeInTheDocument();
  });

  it('displays course statistics correctly', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    expect(screen.getAllByText('1 modules')).toHaveLength(2);
    expect(screen.getByText('1 documents')).toBeInTheDocument();
    expect(screen.getByText('1 videos')).toBeInTheDocument();
  });

  it('shows course type badges', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    expect(screen.getByText('Standalone')).toBeInTheDocument();
    expect(screen.getByText('With MBA')).toBeInTheDocument();
  });

  it('shows live classes badge when enabled', () => {
    render(<CourseSelectionDialog {...defaultProps} />);
    
    expect(screen.getByText('Live Classes')).toBeInTheDocument();
  });
});