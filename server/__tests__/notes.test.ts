import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from './testApp';
import { DatabaseStorage } from '../storage';
import { db } from '../dbConfig';
import { notes, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Notes API', () => {
  let testUserId: string;
  let authToken: string;
  let testNoteId: number;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    
    // Clear mock storage for test isolation
    await request(app)
      .post('/api/test/clear-notes')
      .send();
    
    // Create test user
    const testUser = {
      id: 'test-user-notes',
      firstName: 'Test',
      lastName: 'User',
      email: 'test.notes@example.com',
      role: 'user' as const,
      isActive: true,
    };

    await db.insert(users).values(testUser).onConflictDoNothing();
    testUserId = testUser.id;
    
    // Mock authentication for tests
    authToken = 'test-token';
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(notes).where(eq(notes.createdBy, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        text: 'Test note content',
        referenceType: 'item',
        referenceId: '123',
      };

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body).toMatchObject({
        text: noteData.text,
        referenceType: noteData.referenceType,
        referenceId: noteData.referenceId,
        createdBy: testUserId,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      
      testNoteId = response.body.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/notes')
        .send({
          text: 'Test note',
          referenceType: 'item',
          referenceId: '123',
        })
        .expect(401);
    });
  });

  describe('GET /api/notes/:referenceType/:referenceId', () => {
    beforeEach(async () => {
      // Create test note via API for consistency
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Test note for retrieval',
          referenceType: 'item',
          referenceId: '123',
        });
      testNoteId = response.body.id;
    });

    it('should retrieve notes by reference', async () => {
      const response = await request(app)
        .get('/api/notes/item/123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        text: 'Test note for retrieval',
        referenceType: 'item',
        referenceId: '123',
        createdBy: testUserId,
      });
    });

    it('should return empty array for non-existent reference', async () => {
      const response = await request(app)
        .get('/api/notes/item/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('PUT /api/notes/:id', () => {
    beforeEach(async () => {
      // Create note via API to ensure consistency with mock storage
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Original note text',
          referenceType: 'item',
          referenceId: '123',
        });
      testNoteId = response.body.id;
    });

    it('should update note by author', async () => {
      const updatedData = {
        text: 'Updated note text',
      };

      const response = await request(app)
        .put(`/api/notes/${testNoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.text).toBe(updatedData.text);
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should not allow non-author to update note', async () => {
      // Create another user
      const otherUser = {
        id: 'other-user-notes',
        firstName: 'Other',
        lastName: 'User',
        email: 'other.notes@example.com',
        role: 'user' as const,
        isActive: true,
      };
      await db.insert(users).values(otherUser).onConflictDoNothing();

      // Mock different user authentication
      const otherAuthToken = 'test-token-other';

      await request(app)
        .put(`/api/notes/${testNoteId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ text: 'Unauthorized update' })
        .expect(403);

      // Clean up
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('DELETE /api/notes/:id', () => {
    beforeEach(async () => {
      // Create note via API to ensure consistency with mock storage
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Note to be deleted',
          referenceType: 'item',
          referenceId: '123',
        });
      testNoteId = response.body.id;
    });

    it('should delete note by author', async () => {
      await request(app)
        .delete(`/api/notes/${testNoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify note is deleted via API
      const response = await request(app)
        .get('/api/notes/item/123')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body).toHaveLength(0);
    });

    it('should not allow non-author to delete note', async () => {
      const otherUser = {
        id: 'other-user-delete',
        firstName: 'Other',
        lastName: 'User',
        email: 'other.delete@example.com',
        role: 'user' as const,
        isActive: true,
      };
      await db.insert(users).values(otherUser).onConflictDoNothing();

      const otherAuthToken = 'test-token-other';

      await request(app)
        .delete(`/api/notes/${testNoteId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      // Verify note still exists via API
      const response = await request(app)
        .get('/api/notes/item/123')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body).toHaveLength(1);

      // Clean up
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('GET /api/notes/count/:referenceType/:referenceId', () => {
    beforeEach(async () => {
      // Create multiple test notes via API for consistency
      await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'First note',
          referenceType: 'item',
          referenceId: '123',
        });
      await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Second note',
          referenceType: 'item',
          referenceId: '123',
        });
    });

    it('should return correct note count', async () => {
      const response = await request(app)
        .get('/api/notes/count/item/123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(2);
    });

    it('should return zero for non-existent reference', async () => {
      const response = await request(app)
        .get('/api/notes/count/item/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/notes/export', () => {
    beforeEach(async () => {
      // Create test note via API for consistency
      await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Export test note',
          referenceType: 'item',
          referenceId: '123',
        });
    });

    it('should export notes as JSON', async () => {
      const response = await request(app)
        .get('/api/notes/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Export test note');
    });

    it('should export notes as CSV', async () => {
      const response = await request(app)
        .get('/api/notes/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Export test note');
      expect(response.text).toContain('text,referenceType,referenceId'); // CSV headers
    });
  });
});
