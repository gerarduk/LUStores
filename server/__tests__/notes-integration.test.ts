import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from './testApp';
import { DatabaseStorage } from '../storage';
import { db } from '../dbConfig';
import { notes, users, items, categories } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Notes Integration Tests', () => {
  let testUserId: string;
  let testItemId: number;
  let authToken: string;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    
    // Clear mock storage to ensure test isolation
    await request(app)
      .delete('/api/test/clear-notes')
      .expect(200);
    
    // Create test user
    const testUser = {
      id: 'integration-user',
      firstName: 'Integration',
      lastName: 'Test',
      email: 'integration@example.com',
      role: 'user' as const,
      isActive: true,
    };

    await db.insert(users).values(testUser).onConflictDoNothing();
    testUserId = testUser.id;
    authToken = 'test-token';

    // Create test category with unique name to avoid conflicts
    const testCategory = {
      name: `Test Category ${Date.now()}`,
      description: 'Category for integration tests',
      icon: 'fas fa-test',
      color: 'blue',
    };
    const [category] = await db.insert(categories).values(testCategory).returning();

    // Create test item
    const testItem = {
      name: 'Test Item',
      sku: 'TEST-ITEM-001',
      description: 'Item for integration testing',
      categoryId: category.id,
      price: 10.99,
      vatRate: 0.20,
      vatIncluded: false,
      currentStock: 100,
      minimumStock: 10,
    };
    const [item] = await db.insert(items).values(testItem).returning();
    testItemId = item.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(notes).where(eq(notes.createdBy, testUserId));
    await db.delete(items).where(eq(items.id, testItemId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('Full Notes Workflow', () => {
    it('should handle complete CRUD workflow for item notes', async () => {
      // 1. Create a note
      const createResponse = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Initial note about test item',
          referenceType: 'item',
          referenceId: testItemId.toString(),
        })
        .expect(201);

      const noteId = createResponse.body.id;
      expect(createResponse.body.text).toBe('Initial note about test item');

      // 2. Get notes count
      const countResponse = await request(app)
        .get(`/api/notes/count/item/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(countResponse.body.count).toBe(1);

      // 3. Retrieve notes by reference
      const getResponse = await request(app)
        .get(`/api/notes/item/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].id).toBe(noteId);

      // 4. Update the note
      const updateResponse = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Updated note about test item',
        })
        .expect(200);

      expect(updateResponse.body.text).toBe('Updated note about test item');

      // 5. Get user notes with pagination
      const userNotesResponse = await request(app)
        .get('/api/notes/user?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userNotesResponse.body.notes).toHaveLength(1);
      expect(userNotesResponse.body.total).toBe(1);
      expect(userNotesResponse.body.notes[0].text).toBe('Updated note about test item');

      // 6. Search user notes
      const searchResponse = await request(app)
        .get('/api/notes/user?search=Updated&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.notes).toHaveLength(1);

      // 7. Filter by type
      const filterResponse = await request(app)
        .get('/api/notes/user?type=item&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(filterResponse.body.notes).toHaveLength(1);

      // 8. Export as JSON
      const jsonExportResponse = await request(app)
        .get('/api/notes/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(jsonExportResponse.body).toHaveLength(1);
      expect(jsonExportResponse.body[0].text).toBe('Updated note about test item');

      // 9. Export as CSV
      const csvExportResponse = await request(app)
        .get('/api/notes/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(csvExportResponse.text).toContain('Updated note about test item');
      expect(csvExportResponse.text).toContain('id,text,referenceType,referenceId,createdBy,createdAt');

      // 10. Delete the note
      await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 11. Verify deletion
      const finalCountResponse = await request(app)
        .get(`/api/notes/count/item/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalCountResponse.body.count).toBe(0);
    });

    it('should handle multiple notes for different reference types', async () => {
      // Create notes for different reference types
      const referenceTypes = [
        { type: 'item', id: testItemId.toString() },
        { type: 'vendor', id: '1' },
        { type: 'order', id: '2' },
        { type: 'chargecode', id: '3' },
        { type: 'quote', id: '4' },
        { type: 'sale', id: '5' },
      ];

      const createdNotes = [];
      for (const ref of referenceTypes) {
        const response = await request(app)
          .post('/api/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: `Note for ${ref.type} ${ref.id}`,
            referenceType: ref.type,
            referenceId: ref.id,
          })
          .expect(201);

        createdNotes.push(response.body);
      }

      // Verify all notes were created
      const userNotesResponse = await request(app)
        .get('/api/notes/user?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userNotesResponse.body.total).toBe(6);
      expect(userNotesResponse.body.notes).toHaveLength(6);

      // Test filtering by each reference type
      for (const ref of referenceTypes) {
        const filterResponse = await request(app)
          .get(`/api/notes/user?referenceType=${ref.type}&page=1&limit=10`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(filterResponse.body.notes).toHaveLength(1);
        expect(filterResponse.body.notes[0].referenceType).toBe(ref.type);
        expect(filterResponse.body.notes[0].referenceId).toBe(ref.id);
      }
    });

    it('should enforce user authorization correctly', async () => {
      // Create note with first user
      const noteResponse = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Private note',
          referenceType: 'item',
          referenceId: testItemId.toString(),
        })
        .expect(201);

      const noteId = noteResponse.body.id;

      // Create second user
      const secondUser = {
        id: 'second-integration-user',
        firstName: 'Second',
        lastName: 'User',
        email: 'second@example.com',
        role: 'user' as const,
        isActive: true,
      };
      await db.insert(users).values(secondUser).onConflictDoNothing();

      const secondAuthToken = 'test-token-other';

      // Second user should not be able to update the note
      await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({
          text: 'Unauthorized update',
        })
        .expect(403);

      // Second user should not be able to delete the note
      await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(403);

      // Second user should not see the note in their user notes
      const userNotesResponse = await request(app)
        .get('/api/notes/user?page=1&limit=10')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(200);

      expect(userNotesResponse.body.notes).toHaveLength(0);

      // But both users can see notes by reference (no cross-user viewing restrictions)
      const referenceNotesResponse = await request(app)
        .get(`/api/notes/item/${testItemId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(200);

      expect(referenceNotesResponse.body).toHaveLength(1);

      // Clean up second user
      await db.delete(users).where(eq(users.id, secondUser.id));
    });

    it('should handle pagination correctly', async () => {
      // Create 15 notes
      const notePromises = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/api/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: `Note ${i + 1}`,
            referenceType: 'item',
            referenceId: testItemId.toString(),
          })
      );

      await Promise.all(notePromises);

      // Test first page
      const page1Response = await request(app)
        .get('/api/notes/user?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1Response.body.notes).toHaveLength(10);
      expect(page1Response.body.total).toBe(15);

      // Test second page
      const page2Response = await request(app)
        .get('/api/notes/user?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2Response.body.notes).toHaveLength(5);
      expect(page2Response.body.total).toBe(15);

      // Test empty page
      const page3Response = await request(app)
        .get('/api/notes/user?page=3&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page3Response.body.notes).toHaveLength(0);
      expect(page3Response.body.total).toBe(15);
    });
  });
});
