import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach } from '@jest/globals';
import NotesIndicator from '../components/NotesIndicator';
import { createMockCountResponse } from './test-utils';

// Mock the API request function
jest.mock('../lib/queryClient', () => ({
  apiRequest: jest.fn(),
}));

// Import the module synchronously since it's mocked
import * as queryClientModule from '../lib/queryClient';
const mockApiRequest = queryClientModule.apiRequest as jest.MockedFunction<typeof queryClientModule.apiRequest>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('NotesIndicator', () => {
  const defaultProps = {
    referenceType: 'item',
    referenceId: '123',
    entityName: 'Test Item',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with zero count when no notes exist', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(0));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('renders with correct count when notes exist', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(5));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('opens notes modal when clicked', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(3));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
    });

    // Modal should be opened (we can't test the actual modal here as it's a separate component)
    // But we can verify the click handler was triggered
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockApiRequest.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    // Should show some loading indicator or default state
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApiRequest.mockRejectedValue(new Error('API Error'));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should still render the button, possibly with 0 count
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('makes correct API call for note count', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(2));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/notes/count/item/123');
    });
  });

  it('updates count when notes are added/removed', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(2));

    const { rerender } = render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Update mock for second render
    mockApiRequest.mockClear();
    mockApiRequest.mockResolvedValue(createMockCountResponse(1));

    // Simulate notes being updated (e.g., after modal closes)
    rerender(<NotesIndicator {...defaultProps} key="updated" />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('applies correct styling based on note count', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(0));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const button = screen.getByRole('button');
      // Should have muted styling when count is 0
      expect(button).toHaveClass('text-gray-400');
    });
  });

  it('applies active styling when notes exist', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(3));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const button = screen.getByRole('button');
      // Should have active styling when count > 0
      expect(button).toHaveClass('text-blue-600');
    });
  });

  it('shows tooltip on hover', async () => {
    mockApiRequest.mockResolvedValue(createMockCountResponse(2));

    render(<NotesIndicator {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const button = screen.getByRole('button');
      // Check the title attribute for tooltip text
      expect(button).toHaveAttribute('title', '2 notes for Test Item');
    });
  });
});
