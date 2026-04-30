/**
 * Charge Code Assignment API Endpoints
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Copy these endpoints into routes.ts (around line 1000, after user routes)
 * 2. Make sure to import: import { requirePermission, requireAnyPermission } from './permissions';
 * 3. Make sure to import: import { getCurrentUserId } from './middleware-permissions';
 */

/*

// ============================================================================
// CHARGE CODE ASSIGNMENT ENDPOINTS
// Add these after user management routes (around line 1000 in routes.ts)
// ============================================================================

// Get user's assigned charge codes
app.get('/api/users/:userId/charge-codes',
  requireAuth,
  requirePermission('users.view'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Users can view their own, admins can view anyone's
      if (currentUser.role !== 'admin' && currentUser.id !== userId) {
        return res.status(403).json({
          message: 'Cannot view other user charge codes',
          hint: 'You can only view your own charge code assignments'
        });
      }

      const assignments = await storage.getUserChargeCodeAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching user charge codes:', error);
      res.status(500).json({
        message: 'Failed to fetch charge codes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Assign charge code to user (admin only)
app.post('/api/users/:userId/charge-codes',
  requireAuth,
  requirePermission('users.manage_permissions'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { chargeCode, notes } = req.body;
      const currentUserId = getCurrentUserId(req);

      if (!chargeCode) {
        return res.status(400).json({
          message: 'Charge code required',
          hint: 'Please provide a charge code to assign'
        });
      }

      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify charge code exists
      const codeExists = await storage.getChargeCode(chargeCode);
      if (!codeExists) {
        return res.status(404).json({
          message: 'Charge code not found',
          hint: `Charge code "${chargeCode}" does not exist in the system`
        });
      }

      // Perform assignment
      await storage.assignChargeCodeToUser(userId, chargeCode, currentUserId, notes);

      res.json({
        success: true,
        message: `Charge code ${chargeCode} assigned to user ${targetUser.email}`,
        assignment: {
          userId,
          chargeCode,
          assignedBy: currentUserId,
          assignedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error assigning charge code:', error);
      res.status(500).json({
        message: 'Failed to assign charge code',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Remove charge code from user (admin only)
app.delete('/api/users/:userId/charge-codes/:code',
  requireAuth,
  requirePermission('users.manage_permissions'),
  async (req, res) => {
    try {
      const { userId, code } = req.params;

      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.removeChargeCodeFromUser(userId, code);

      res.json({
        success: true,
        message: `Charge code ${code} removed from user ${targetUser.email}`
      });
    } catch (error) {
      console.error('Error removing charge code:', error);
      res.status(500).json({
        message: 'Failed to remove charge code',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get users for a charge code (admin/manager only)
app.get('/api/charge-codes/:code/users',
  requireAuth,
  requireAnyPermission(['users.view', 'reports.view']),
  async (req, res) => {
    try {
      const { code } = req.params;

      // Verify charge code exists
      const chargeCode = await storage.getChargeCode(code);
      if (!chargeCode) {
        return res.status(404).json({ message: 'Charge code not found' });
      }

      const users = await storage.getUsersForChargeCode(code);

      res.json({
        chargeCode: {
          code: chargeCode.code,
          title: chargeCode.title
        },
        assignedUsers: users,
        totalUsers: users.length
      });
    } catch (error) {
      console.error('Error fetching charge code users:', error);
      res.status(500).json({
        message: 'Failed to fetch users',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

*/

export {}; // Make this a module
