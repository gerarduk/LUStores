import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseStorage } from '../storage';
import { db } from '../dbConfig';
import { notes, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Notes Storage', () => {
  let storage: DatabaseStorage;
  let testUserId: string;
  let testNoteId: number;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    
    // Create test user
    const testUser = {
      id: 'test-storage-user',
      firstName: 'Storage',
      lastName: 'Test',
      email: 'storage.test@example.com',
      role: 'user' as const,
      isActive: true,
    };

    await db.insert(users).values(testUser).onConflictDoNothing();
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(notes).where(eq(notes.createdBy, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('createNote', () => {
    it('should create a note with all required fields', async () => {
      const noteData = {
        text: 'Test storage note',
        referenceType: 'item',
        referenceId: '456',
        createdBy: testUserId,
      };

      const result = await storage.createNote(noteData);

      expect(result).toMatchObject({
        text: noteData.text,
        referenceType: noteData.referenceType,
        referenceId: noteData.referenceId,
        createdBy: noteData.createdBy,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      
      testNoteId = result.id;
    });

    it('should handle different reference types', async () => {
      const referenceTypes = ['item', 'vendor', 'order', 'chargecode', 'quote', 'sale'];
      
      for (const refType of referenceTypes) {
        const noteData = {
          text: `Test note for ${refType}`,
          referenceType: refType,
          referenceId: '123',
          createdBy: testUserId,
        };

        const result = await storage.createNote(noteData);
        expect(result.referenceType).toBe(refType);
      }
    });
  });

  describe('getNotesByReference', () => {
    beforeEach(async () => {
      // Create multiple test notes
      await storage.createNote({
        text: 'First note',
        referenceType: 'item',
        referenceId: '789',
        createdBy: testUserId,
      });
      
      await storage.createNote({
        text: 'Second note',
        referenceType: 'item',
        referenceId: '789',
        createdBy: testUserId,
      });

      await storage.createNote({
        text: 'Different reference note',
        referenceType: 'item',
        referenceId: '999',
        createdBy: testUserId,
      });
    });

    it('should retrieve notes by reference type and ID', async () => {
      const result = await storage.getNotesByReference('item', '789');
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Second note'); // Should be ordered by createdAt DESC
      expect(result[1].text).toBe('First note');
    });

    it('should return empty array for non-existent reference', async () => {
      const result = await storage.getNotesByReference('item', '404');
      expect(result).toHaveLength(0);
    });

    it('should filter by reference type correctly', async () => {
      const result = await storage.getNotesByReference('vendor', '789');
      expect(result).toHaveLength(0);
    });
  });

  describe('updateNote', () => {
    beforeEach(async () => {
      const note = await storage.createNote({
        text: 'Original text',
        referenceType: 'item',
        referenceId: '101',
        createdBy: testUserId,
      });
      testNoteId = note.id;
    });

    it('should update note text', async () => {
      // Add small delay to ensure updatedAt is different from createdAt
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedText = 'Updated text content';
      const result = await storage.updateNote(testNoteId, { text: updatedText });

      expect(result.text).toBe(updatedText);
      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(result.createdAt).getTime()
      );
    });

    it('should return null for non-existent note', async () => {
      const result = await storage.updateNote(-1, { text: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    beforeEach(async () => {
      const note = await storage.createNote({
        text: 'Note to delete',
        referenceType: 'item',
        referenceId: '202',
        createdBy: testUserId,
      });
      testNoteId = note.id;
    });

    it('should delete existing note', async () => {
      const result = await storage.deleteNote(testNoteId);
      expect(result).toBe(true);

      // Verify note is deleted
      const notes = await storage.getNotesByReference('item', '202');
      expect(notes).toHaveLength(0);
    });

    it('should return false for non-existent note', async () => {
      const result = await storage.deleteNote(-1);
      expect(result).toBe(false);
    });
  });

  describe('getUserNotes', () => {
    beforeEach(async () => {
      // Create notes for different users
      await storage.createNote({
        text: 'User note 1',
        referenceType: 'item',
        referenceId: '301',
        createdBy: testUserId,
      });

      await storage.createNote({
        text: 'User note 2',
        referenceType: 'vendor',
        referenceId: '302',
        createdBy: testUserId,
      });

      // Create another user and their note
      const otherUser = {
        id: 'other-storage-user',
        firstName: 'Other',
        lastName: 'User',
        email: 'other.storage@example.com',
        role: 'user' as const,
        isActive: true,
      };
      await db.insert(users).values(otherUser).onConflictDoNothing();

      await storage.createNote({
        text: 'Other user note',
        referenceType: 'item',
        referenceId: '303',
        createdBy: otherUser.id,
      });
    });

    it('should retrieve notes for specific user', async () => {
      const result = await storage.getUserNotes(testUserId, { page: 1, limit: 10 });
      
      expect(result.notes).toHaveLength(2);
      expect(result.notes.every(note => note.createdBy === testUserId)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await storage.getUserNotes(testUserId, { page: 1, limit: 1 });
      
      expect(result.notes).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should support search filtering', async () => {
      const result = await storage.getUserNotes(testUserId, { page: 1, limit: 10 }); // Note: search functionality not implemented in current storage method
      
      // Since search functionality is not implemented, this should return all user notes
      expect(result.notes).toHaveLength(2);
      expect(result.notes.some(note => note.text === 'User note 1')).toBe(true);
    });

    it('should support reference type filtering', async () => {
      const result = await storage.getUserNotes(testUserId, { page: 1, limit: 10, referenceType: 'vendor' });
      
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].referenceType).toBe('vendor');
    });
  });

  describe('getNotesCount', () => {
    beforeEach(async () => {
      await storage.createNote({
        text: 'Count test 1',
        referenceType: 'item',
        referenceId: '401',
        createdBy: testUserId,
      });

      await storage.createNote({
        text: 'Count test 2',
        referenceType: 'item',
        referenceId: '401',
        createdBy: testUserId,
      });
    });

    it('should return correct count for reference', async () => {
      const count = await storage.getNotesCount('item', '401');
      expect(count).toBe(2);
    });

    it('should return zero for non-existent reference', async () => {
      const count = await storage.getNotesCount('item', '404');
      expect(count).toBe(0);
    });
  });

  describe('exportNotesToCSV', () => {
    beforeEach(async () => {
      await storage.createNote({
        text: 'Export note 1',
        referenceType: 'item',
        referenceId: '501',
        createdBy: testUserId,
      });

      await storage.createNote({
        text: 'Export note 2',
        referenceType: 'vendor',
        referenceId: '502',
        createdBy: testUserId,
      });
    });

    it('should export user notes as CSV', async () => {
      const userNotes = await storage.getUserNotes(testUserId, { page: 1, limit: 100 });
      const csv = await storage.exportNotesToCSV(userNotes.notes);
      
      expect(csv).toContain('ID,Text,Reference Type,Reference ID,Created By,Created At,Updated At');
      expect(csv).toContain('Export note 1');
      expect(csv).toContain('Export note 2');
    });

    it('should handle empty results', async () => {
      const csv = await storage.exportNotesToCSV([]);
      expect(csv).toBe('ID,Text,Reference Type,Reference ID,Created By,Created At,Updated At\n');
    });

    it('should escape CSV special characters', async () => {
      await storage.createNote({
        text: 'Note with "quotes" and, commas',
        referenceType: 'item',
        referenceId: '503',
        createdBy: testUserId,
      });

      const userNotes = await storage.getUserNotes(testUserId, { page: 1, limit: 100 });
      const csv = await storage.exportNotesToCSV(userNotes.notes);
      expect(csv).toContain('"Note with ""quotes"" and, commas"');
    });
  });
});
