import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import Notes from '../pages/Notes';

// Get the mocked fetch function
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Helper function to create mock fetch response
const createMockFetchResponse = (data: any, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)], { type: 'application/json' })),
  } as Response);
};

describe('Notes Page', () => {
  const mockNotes = [
    {
      id: '1',
      text: 'First note about inventory item',
      referenceType: 'item',
      referenceId: '123',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'test-user',
    },
    {
      id: '2',
      text: 'Second note about vendor',
      referenceType: 'vendor',
      referenceId: '456',
      createdAt: '2024-01-01T11:00:00Z',
      updatedAt: '2024-01-01T11:00:00Z',
      createdBy: 'test-user',
    },
    {
      id: '3',
      text: 'Third note about order',
      referenceType: 'order',
      referenceId: '789',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      createdBy: 'test-user',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(createMockFetchResponse({
      notes: mockNotes,
      total: mockNotes.length,
    }));
  });

  it('renders notes page with correct title and subtitle', async () => {
    render(<Notes />);

    expect(screen.getByText('Notes Journal')).toBeInTheDocument();
    expect(screen.getByText('View and manage all your notes')).toBeInTheDocument();
  });

  it('displays notes list after loading', async () => {
    render(<Notes />);

    await waitFor(() => {
      expect(screen.getByText('First note about inventory item')).toBeInTheDocument();
      expect(screen.getByText('Second note about vendor')).toBeInTheDocument();
      expect(screen.getByText('Third note about order')).toBeInTheDocument();
    });
  });

  it('shows reference type badges', async () => {
    render(<Notes />);

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('vendor')).toBeInTheDocument();
      expect(screen.getByText('Order')).toBeInTheDocument();
    });
  });

  it('filters notes by reference type', async () => {
    // First call for initial load
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: mockNotes,
      total: mockNotes.length,
    }));
    
    // Second call for filter change
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: [mockNotes[0]], // Only item notes
      total: 1,
    }));

    render(<Notes />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('First note about inventory item')).toBeInTheDocument();
    });

    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: 'item' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notes?page=1&limit=20&referenceType=item');
    });
  });

  it('handles pagination', async () => {
    const paginatedMockNotes = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      text: `Note ${i + 1}`,
      referenceType: 'item',
      referenceId: `${i + 100}`,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'test-user',
    }));

    // First call for initial load
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: paginatedMockNotes.slice(0, 20),
      total: paginatedMockNotes.length,
    }));
    
    // Second call for pagination click
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: paginatedMockNotes.slice(20, 25),
      total: paginatedMockNotes.length,
    }));

    render(<Notes />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
      // Pagination should show since total > 20 and limit is 20
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notes?page=2&limit=20');
    });
  });

  it('exports notes as JSON', async () => {
    // Clear previous mocks and set up fresh sequence
    mockFetch.mockClear();
    
    // First call for loading notes
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: mockNotes,
      total: mockNotes.length,
    }));
    
    // Second call for export
    const mockBlob = new Blob(['mock json data'], { type: 'application/json' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    render(<Notes />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('First note about inventory item')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export JSON');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notes/export?format=json');
    });
  });

  it('exports notes as CSV', async () => {
    // First call for loading notes
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      notes: mockNotes,
      total: mockNotes.length,
    }));
    
    // Second call for export
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    render(<Notes />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('First note about inventory item')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notes/export?format=csv');
    });
  });

  it('shows empty state when no notes exist', async () => {
    // Clear previous mocks and set up empty response
    mockFetch.mockClear();
    mockFetch.mockResolvedValue(createMockFetchResponse({
      notes: [],
      total: 0,
    }));

    render(<Notes />);

    await waitFor(() => {
      expect(screen.getByText('No notes found')).toBeInTheDocument();
      expect(screen.getByText('Start adding notes to items, suppliers, orders, or charge codes.')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<Notes />);

    await waitFor(() => {
      // Component doesn't show error UI, just logs to console
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching notes:', expect.any(Error));
      // Should show empty state since no data was loaded
      expect(screen.getByText('No notes found')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<Notes />);

    // Loading state shows a spinner, not text
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    render(<Notes />);

    await waitFor(() => {
      // Should show formatted date in US format
      expect(screen.getByText(/1\/1\/2024, 10:00:00 AM/)).toBeInTheDocument();
    });
  });

  it('does not show pagination when there is only one page', async () => {
    render(<Notes />);

    await waitFor(() => {
      expect(screen.getByText('First note about inventory item')).toBeInTheDocument();
      // Should not show pagination since we have only 3 notes (less than limit of 10)
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });
});
