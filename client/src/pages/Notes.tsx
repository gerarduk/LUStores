import React, { useState, useEffect } from 'react';
import { MessageSquare, Filter, Calendar, Tag, Edit2, Trash2, Check, X } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import ExportButton from '@/components/shared/ExportButton';

interface Note {
  id: number;
  text: string;
  referenceType: string;
  referenceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesResponse {
  notes: Note[];
  total: number;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [page, filterType]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (filterType) {
        params.append('referenceType', filterType);
      }

      const response = await fetch(`/api/notes?${params}`);
      if (response.ok) {
        const data: NotesResponse = await response.json();
        setNotes(data.notes);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportNotes = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams({ format });
      if (filterType) {
        params.append('referenceType', filterType);
      }

      const response = await fetch(`/api/notes/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `notes-export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting notes:', error);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditedText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedText('');
  };

  const handleSaveEdit = async (noteId: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editedText }),
      });

      if (response.ok) {
        await fetchNotes(); // Refresh notes list
        setEditingNoteId(null);
        setEditedText('');
      } else {
        console.error('Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchNotes(); // Refresh notes list
      } else {
        console.error('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getReferenceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      item: 'Item',
      supplier: 'Supplier',
      order: 'Order',
      chargecode: 'Charge Code'
    };
    return labels[type] || type;
  };

  const getReferenceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      item: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      order: 'bg-purple-100 text-purple-800',
      chargecode: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-muted text-foreground';
  };

  const filteredNotes = notes.filter(note =>
    searchTerm === '' || 
    note.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.referenceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notes Journal</h1>
            <p className="text-muted-foreground">View and manage all your notes</p>
          </div>
        </div>

        <ExportButton
          onExport={exportNotes}
          formats={['csv', 'json']}
          label="Export"
          variant="default"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
              placeholder="Search notes..."
            />
          </div>

          {/* Filter by type */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
            >
              <option value="">All Types</option>
              <option value="item">Items</option>
              <option value="supplier">Suppliers</option>
              <option value="order">Orders</option>
              <option value="chargecode">Charge Codes</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {total} total notes
          </span>
          {filterType && (
            <span className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Filtered by {getReferenceTypeLabel(filterType)}
            </span>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No notes found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Start adding notes to items, suppliers, orders, or charge codes.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotes.map((note) => (
              <div key={note.id} className="p-4 sm:p-6 hover:bg-accent transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReferenceTypeColor(note.referenceType)}`}>
                      {getReferenceTypeLabel(note.referenceType)}
                    </span>
                    <span className="text-sm text-gray-600">
                      ID: {note.referenceId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(note.createdAt)}
                    </span>
                    {note.updatedAt !== note.createdAt && (
                      <span className="text-blue-600">
                        Updated: {formatDate(note.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-accent flex items-center gap-2 text-sm"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleEdit(note)}
                        className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm border border-blue-200"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm border border-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} notes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
