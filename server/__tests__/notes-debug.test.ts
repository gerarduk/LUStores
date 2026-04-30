import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from './testApp';
import { db } from '../dbConfig';
import { notes, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Notes API Debug', () => {
  let testUserId: string;
  let authToken: string;

  beforeEach(async () => {
    // MockStorage not needed for this debug test
    
    // Create test user
    const testUser = {
      id: 'debug-user',
      firstName: 'Debug',
      lastName: 'User',
      email: 'debug@example.com',
      role: 'user' as const,
      isActive: true,
    };

    await db.insert(users).values(testUser).onConflictDoNothing();
    testUserId = testUser.id;
    
    // Use standard test token
    authToken = 'test-token';
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(notes).where(eq(notes.createdBy, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('should debug API response', async () => {
    // console.log('🔍 Starting debug test...');
    // console.log('Auth token:', authToken);
    // console.log('Test user ID:', testUserId);
    
    const noteData = {
      text: 'Debug test note',
      referenceType: 'item',
      referenceId: '123',
    };

    // console.log('📝 Sending POST request to /api/notes...');
    
    try {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);
      
      // console.log('📊 Response status:', response.status);
      // console.log('📊 Response headers:', response.headers);
      // console.log('📊 Response body:', response.body);
      
      // Just check if we get any response
      expect(response.status).toBeDefined();
      
    } catch (error) {
      console.error('❌ Request failed:', error);
      throw error;
    }
  });
});
