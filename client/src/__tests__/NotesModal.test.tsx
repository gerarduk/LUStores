import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach } from '@jest/globals';
import NotesModal from '../components/NotesModal';
import { createMockResponse } from './test-utils';

// Mock the API request function
jest.mock('../lib/queryClient', () => ({
  apiRequest: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
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

describe('NotesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    referenceType: 'item',
    referenceId: '123',
    entityName: 'Test Item',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockClear();
    mockApiRequest.mockReset();
    // Set default empty response for all tests
    mockApiRequest.mockResolvedValue(createMockResponse([]));
  });

  it('renders modal when open', async () => {
    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Notes for Test Item')).toBeInTheDocument();
    
    // Wait for loading to complete and form to appear
    await waitFor(() => {
      expect(screen.getByText('Add a note')).toBeInTheDocument();
    });
  });

  it('does not render modal when closed', () => {
    render(<NotesModal {...defaultProps} isOpen={false} />, { wrapper: createWrapper() });
    
    expect(screen.queryByText('Notes for Test Item')).not.toBeInTheDocument();
  });

  it('displays existing notes', async () => {
    const mockNotes = [
      {
        id: '1',
        text: 'First note',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        createdBy: 'user1',
        referenceType: 'item',
        referenceId: '123',
      },
      {
        id: '2',
        text: 'Second note',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z',
        createdBy: 'user1',
        referenceType: 'item',
        referenceId: '123',
      },
    ];

    mockApiRequest.mockResolvedValue(createMockResponse(mockNotes));

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('First note')).toBeInTheDocument();
      expect(screen.getByText('Second note')).toBeInTheDocument();
    });
  });

  it('allows adding a new note', async () => {
    const newNote = {
      id: '3',
      text: 'New test note',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    };

    mockApiRequest
      .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
      .mockResolvedValueOnce(createMockResponse(newNote)) // Create note
      .mockResolvedValueOnce(createMockResponse([newNote])); // Reload notes

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    // Wait for loading to complete and click "Add a note" button
    await waitFor(() => {
      expect(screen.getByText('Add a note')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add a note'));
    
    // Now the form should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Add a note...');
    const addButton = screen.getByText('Add Note');

    fireEvent.change(textarea, { target: { value: 'New test note' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/notes', {
        text: 'New test note',
        referenceType: 'item',
        referenceId: '123',
      });
    });
  });

  it('allows editing an existing note', async () => {
    const existingNote = {
      id: '1',
      text: 'Original note',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'user1',
      referenceType: 'item',
      referenceId: '123',
    };

    const updatedNote = {
      ...existingNote,
      text: 'Updated note',
      updatedAt: '2024-01-01T12:00:00Z',
    };

    mockApiRequest
      .mockResolvedValueOnce(createMockResponse([existingNote])) // Initial load
      .mockResolvedValueOnce(createMockResponse(updatedNote)) // Update note
      .mockResolvedValueOnce(createMockResponse([updatedNote])); // Reload notes

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Original note')).toBeInTheDocument();
    });

    const editButton = screen.getByLabelText('Edit note');
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue('Original note');
    fireEvent.change(textarea, { target: { value: 'Updated note' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/api/notes/1', {
        text: 'Updated note',
      });
    });
  });

  it('allows deleting a note', async () => {
    const existingNote = {
      id: '1',
      text: 'Note to delete',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      createdBy: 'user1',
      referenceType: 'item',
      referenceId: '123',
    };

    // Mock confirm dialog to return true
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    // Clear any previous mocks first
    mockApiRequest.mockClear();
    mockApiRequest
      .mockResolvedValueOnce(createMockResponse([existingNote])) // Initial load
      .mockResolvedValueOnce(createMockResponse(undefined)) // Delete note
      .mockResolvedValueOnce(createMockResponse([])); // Reload notes

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Note to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete note');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/api/notes/1');
    });

    // Clean up mock
    mockConfirm.mockRestore();
  });

  it('handles API errors gracefully', async () => {
    mockApiRequest.mockRejectedValue(new Error('Network error'));

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    // Clear any previous mocks and make API call reject
    mockApiRequest.mockClear();
    mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notes exist', async () => {
    // Clear any previous mocks and set up fresh empty response
    mockApiRequest.mockClear();
    mockApiRequest.mockResolvedValue(createMockResponse([]));

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    // Wait for loading to complete first
    await waitFor(() => {
      expect(screen.getByText('Add a note')).toBeInTheDocument();
    });

    // Then check for empty state text
    await waitFor(() => {
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(screen.getByText('Add the first note for this item')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    const onClose = jest.fn();
    render(<NotesModal {...defaultProps} onClose={onClose} />, { wrapper: createWrapper() });

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('validates note text before submission', async () => {
    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    // Wait for loading to complete and click "Add a note" button
    await waitFor(() => {
      expect(screen.getByText('Add a note')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add a note'));
    
    // Now the form should be visible
    await waitFor(() => {
      expect(screen.getByText('Add Note')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Note');
    fireEvent.click(addButton);

    // Should not make API call with empty text
    expect(mockApiRequest).not.toHaveBeenCalledWith('POST', '/api/notes', expect.anything());
  });

  it('shows loading state while creating note', async () => {
    mockApiRequest
      .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(createMockResponse({ id: '1', text: 'Test note' })), 100))); // Slow create

    render(<NotesModal {...defaultProps} />, { wrapper: createWrapper() });

    // Wait for loading to complete and click "Add a note" button
    await waitFor(() => {
      expect(screen.getByText('Add a note')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add a note'));
    
    // Now the form should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Add a note...');
    const addButton = screen.getByText('Add Note');

    fireEvent.change(textarea, { target: { value: 'Test note' } });
    fireEvent.click(addButton);

    // Should show some loading state during creation
    expect(addButton).toBeDisabled();
  });
});
