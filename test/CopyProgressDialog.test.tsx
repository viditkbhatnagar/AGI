import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CopyProgressDialog } from '../client/src/components/admin/CopyProgressDialog';

// Mock the UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

describe('CopyProgressDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders dialog when open', () => {
    const progress = {
      total: 3,
      completed: 1,
      current: 'test-course',
      results: []
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Copy Progress');
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '33.33333333333333');
  });

  it('does not render dialog when closed', () => {
    const progress = {
      total: 3,
      completed: 1,
      current: 'test-course',
      results: []
    };

    render(
      <CopyProgressDialog
        isOpen={false}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows in progress status when not complete', () => {
    const progress = {
      total: 3,
      completed: 1,
      current: 'test-course',
      results: []
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Processing: test-course')).toBeInTheDocument();
    expect(screen.getByTestId('button')).toBeDisabled();
  });

  it('shows completed status when all courses processed successfully', () => {
    const progress = {
      total: 2,
      completed: 2,
      current: undefined,
      results: [
        {
          sandboxSlug: 'course-1',
          success: true,
          newCourseSlug: 'course-1-copy'
        },
        {
          sandboxSlug: 'course-2',
          success: true,
          newCourseSlug: 'course-2-copy'
        }
      ]
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Operation complete')).toBeInTheDocument();
    expect(screen.getByText('2 Successful')).toBeInTheDocument();
    
    // Check for both buttons when operation completes successfully
    const buttons = screen.getAllByTestId('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Stay Here');
    expect(buttons[1]).toHaveTextContent('View Courses (3)');
    buttons.forEach(button => expect(button).not.toBeDisabled());
    
    // Check for auto-redirect notification
    expect(screen.getByText(/Redirecting to courses page in \d+ seconds.../)).toBeInTheDocument();
  });

  it('shows partial success status when some courses fail', () => {
    const progress = {
      total: 2,
      completed: 2,
      current: undefined,
      results: [
        {
          sandboxSlug: 'course-1',
          success: true,
          newCourseSlug: 'course-1-copy'
        },
        {
          sandboxSlug: 'course-2',
          success: false,
          error: 'Failed to transform document structure'
        }
      ]
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Partial Success')).toBeInTheDocument();
    expect(screen.getByText('1 Successful')).toBeInTheDocument();
    expect(screen.getByText('1 Failed')).toBeInTheDocument();
  });

  it('displays individual course results with success indicators', () => {
    const progress = {
      total: 2,
      completed: 2,
      current: undefined,
      results: [
        {
          sandboxSlug: 'successful-course',
          success: true,
          newCourseSlug: 'successful-course-copy',
          duplicateHandled: true
        },
        {
          sandboxSlug: 'failed-course',
          success: false,
          error: 'Database connection failed'
        }
      ]
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('successful-course')).toBeInTheDocument();
    expect(screen.getByText('successful-course-copy')).toBeInTheDocument();
    expect(screen.getByText('Course successfully copied to main courses tab')).toBeInTheDocument();
    expect(screen.getByText('Duplicate name detected - suffix added automatically')).toBeInTheDocument();

    expect(screen.getByText('failed-course')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    const progress = {
      total: 4,
      completed: 3,
      current: 'current-course',
      results: []
    };

    render(
      <CopyProgressDialog
        isOpen={true}
        progress={progress}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '75');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});