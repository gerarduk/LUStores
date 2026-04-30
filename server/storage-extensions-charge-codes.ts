/**
 * Charge Code Assignment Storage Methods
 *
 * Add these methods to the IStorage interface and Storage class in storage.ts
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Add interface methods to IStorage interface (around line 497)
 * 2. Add implementations to Storage class (around line 2920)
 * 3. Import chargeCodeAssignments from schema at top of file
 */

import { db } from "./dbConfig";
import {
  chargeCodeAssignments,
  chargecodes,
  users
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// STEP 1: Add these to IStorage interface (around line 497 in storage.ts)
// ============================================================================

/*
  // Charge code assignment operations
  getUserChargeCodeAssignments(userId: string): Promise<Array<{
    code: string;
    title: string;
    assignedBy: string | null;
    assignedAt: Date | null;
    notes: string | null;
  }>>;

  assignChargeCodeToUser(
    userId: string,
    chargeCode: string,
    assignedBy: string,
    notes?: string
  ): Promise<void>;

  removeChargeCodeFromUser(userId: string, chargeCode: string): Promise<void>;

  getUsersForChargeCode(chargeCode: string): Promise<Array<{
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    assignedAt: Date | null;
  }>>;
*/

// ============================================================================
// STEP 2: Add these implementations to Storage class (around line 2920)
// ============================================================================

export class ChargeCodeAssignmentMethods {
  /**
   * Get all charge codes assigned to a specific user
   * Used by: Basic users to see their available charge codes
   * Used by: Admin UI to show user's assigned codes
   */
  async getUserChargeCodeAssignments(userId: string): Promise<Array<{
    code: string;
    title: string;
    assignedBy: string | null;
    assignedAt: Date | null;
    notes: string | null;
  }>> {
    try {
      const assignments = await db
        .select({
          code: chargeCodeAssignments.chargeCode,
          title: chargecodes.title,
          assignedBy: chargeCodeAssignments.assignedBy,
          assignedAt: chargeCodeAssignments.assignedAt,
          notes: chargeCodeAssignments.notes,
        })
        .from(chargeCodeAssignments)
        .innerJoin(
          chargecodes,
          eq(chargeCodeAssignments.chargeCode, chargecodes.code)
        )
        .where(eq(chargeCodeAssignments.userId, userId));

      return assignments;
    } catch (error) {
      console.error('Error fetching user charge code assignments:', error);
      throw new Error('Failed to fetch user charge codes');
    }
  }

  /**
   * Assign a charge code to a user
   * Used by: Admins to grant charge code access
   * Note: Uses onConflictDoNothing to prevent duplicate assignments
   */
  async assignChargeCodeToUser(
    userId: string,
    chargeCode: string,
    assignedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await db
        .insert(chargeCodeAssignments)
        .values({
          userId,
          chargeCode,
          assignedBy,
          notes: notes || null,
          assignedAt: new Date(),
        })
        .onConflictDoNothing(); // Prevent duplicate assignments

      console.log(`✓ Assigned charge code ${chargeCode} to user ${userId}`);
    } catch (error) {
      console.error('Error assigning charge code to user:', error);
      throw new Error('Failed to assign charge code');
    }
  }

  /**
   * Remove a charge code assignment from a user
   * Used by: Admins to revoke charge code access
   */
  async removeChargeCodeFromUser(
    userId: string,
    chargeCode: string
  ): Promise<void> {
    try {
      await db
        .delete(chargeCodeAssignments)
        .where(
          and(
            eq(chargeCodeAssignments.userId, userId),
            eq(chargeCodeAssignments.chargeCode, chargeCode)
          )
        );

      console.log(`✓ Removed charge code ${chargeCode} from user ${userId}`);
    } catch (error) {
      console.error('Error removing charge code from user:', error);
      throw new Error('Failed to remove charge code');
    }
  }

  /**
   * Get all users assigned to a specific charge code
   * Used by: Admins/managers to see who has access to a charge code
   * Used by: Audit and reporting
   */
  async getUsersForChargeCode(chargeCode: string): Promise<Array<{
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    assignedAt: Date | null;
  }>> {
    try {
      const assignments = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          assignedAt: chargeCodeAssignments.assignedAt,
        })
        .from(chargeCodeAssignments)
        .innerJoin(
          users,
          eq(chargeCodeAssignments.userId, users.id)
        )
        .where(eq(chargeCodeAssignments.chargeCode, chargeCode));

      return assignments;
    } catch (error) {
      console.error('Error fetching users for charge code:', error);
      throw new Error('Failed to fetch users for charge code');
    }
  }
}

// ============================================================================
// STEP 3: Update getSales() method signature and implementation
// ============================================================================

/*
FIND THIS (around line 1751 in storage.ts):

async getSales(
  page?: number,
  limit?: number,
  chargeCode?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{...}>

REPLACE WITH:

async getSales(
  page?: number,
  limit?: number,
  chargeCode?: string,
  startDate?: Date,
  endDate?: Date,
  restrictToChargeCodes?: string[]  // NEW PARAMETER
): Promise<{...}>

THEN FIND THE WHERE CLAUSE (around line 1780):

  const conditions = [];
  if (chargeCode) {
    conditions.push(eq(sales.chargeCode, chargeCode));
  }

ADD AFTER THE CHARGE CODE CHECK:

  // NEW: Restrict to specific charge codes (for basic users)
  if (restrictToChargeCodes && restrictToChargeCodes.length > 0) {
    const chargeCodeConditions = restrictToChargeCodes.map(code =>
      eq(sales.chargeCode, code)
    );
    // If multiple codes, use OR logic
    if (chargeCodeConditions.length > 1) {
      conditions.push(or(...chargeCodeConditions));
    } else {
      conditions.push(chargeCodeConditions[0]);
    }
  }

ALSO UPDATE getQuotes() THE SAME WAY
*/

// Export for testing
export const chargeCodeStorage = new ChargeCodeAssignmentMethods();
