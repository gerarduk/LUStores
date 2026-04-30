import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit2, Trash2, Save, MessageSquare } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Note {
  id: number;
  text: string;
  referenceType: string;
  referenceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceType: string;
  referenceId: string;
  entityName?: string;
}

export default function NotesModal({ isOpen, onClose, referenceType, referenceId, entityName }: NotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, referenceType, referenceId]);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', `/api/notes/${referenceType}/${referenceId}`);
      const data = await response.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNoteText.trim()) return;

    setIsCreatingNote(true);
    try {
      const response = await apiRequest('POST', '/api/notes', {
        text: newNoteText,
        referenceType,
        referenceId,
      });
      const newNote = await response.json();
      setNotes([newNote, ...notes]);
      setNewNoteText('');
      setIsAddingNote(false);
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const updateNote = async (noteId: number, text: string) => {
    try {
      const response = await apiRequest('PUT', `/api/notes/${noteId}`, { text });
      const updatedNote = await response.json();
      setNotes(notes.map(note => note.id === noteId ? updatedNote : note));
      setEditingNoteId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await apiRequest('DELETE', `/api/notes/${noteId}`);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  // Render as portal to avoid conflicts with nested dialogs
  return ReactDOM.createPortal(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <DialogTitle>
              Notes{entityName ? ` for ${entityName}` : ''}
            </DialogTitle>
          </div>
          <DialogDescription>
            View and manage notes for this item
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 dark:text-red-400">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add note form */}
              {isAddingNote ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNoteText('');
                      }}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createNote}
                      disabled={!newNoteText.trim() || isCreatingNote}
                      className="px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingNote ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add a note
                </button>
              )}

              {/* Notes list */}
              {error ? (
                <div className="text-center py-8 text-red-500 dark:text-red-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{error}</p>
                </div>
              ) : notes.length === 0 && !isAddingNote ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notes yet</p>
                  <p className="text-sm mt-1">Add the first note for this item</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      {editingNoteId === note.id ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => updateNote(note.id, editingText)}
                              disabled={!editingText.trim()}
                              className="px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 mb-2">
                            {note.text}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              Created: {formatDate(note.createdAt)}
                              {note.updatedAt !== note.createdAt && (
                                <span className="ml-2">
                                  (Updated: {formatDate(note.updatedAt)})
                                </span>
                              )}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditing(note)}
                                className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit note"
                                aria-label="Edit note"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete note"
                                aria-label="Delete note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>,
    document.body
  );
}
