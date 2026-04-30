import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import NotesModal from './NotesModal';
import { apiRequest } from '../lib/queryClient';

interface NotesIndicatorProps {
  referenceType: string;
  referenceId: string;
  entityName?: string;
  className?: string;
  initialCount?: number; // Pre-fetched count to avoid API call
  onNotesUpdated?: () => void; // Callback when notes are updated
}

export default function NotesIndicator({ referenceType, referenceId, entityName, className = '', initialCount, onNotesUpdated }: NotesIndicatorProps) {
  const [notesCount, setNotesCount] = useState(initialCount ?? 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(initialCount === undefined);

  useEffect(() => {
    // Only fetch if we don't have an initial count
    if (initialCount === undefined) {
      checkForNotes();
    } else {
      setNotesCount(initialCount);
      setLoading(false);
    }
  }, [referenceType, referenceId, initialCount]);

  const checkForNotes = async () => {
    try {
      const response = await apiRequest('GET', `/api/notes/count/${referenceType}/${referenceId}`);
      const data = await response.json();
      setNotesCount(data.count);
    } catch {
      // Silently handle errors - likely server is busy or endpoint unavailable
      // Default to no notes rather than showing errors
      setNotesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Refresh the notes count when modal closes
    checkForNotes();
    // Call the callback if provided
    if (onNotesUpdated) {
      onNotesUpdated();
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className={`relative p-1 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent ${className}`}
        title="Loading..."
      >
        <div className="animate-pulse">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </div>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`relative p-1 rounded transition-colors ${
          notesCount > 0 
            ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        } ${className}`}
        title={notesCount > 0 && entityName ? `${notesCount} note${notesCount !== 1 ? 's' : ''} for ${entityName}` : 'Add a note'}
      >
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {/* Show count as visible text for tests */}
          <span className="text-xs font-medium">{notesCount}</span>
        </div>
      </button>

      <NotesModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        referenceType={referenceType}
        referenceId={referenceId}
        entityName={entityName}
      />
    </>
  );
}
