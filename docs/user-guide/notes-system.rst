==============
Notes System
==============

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

The Notes System allows you to add contextual annotations to various entities throughout LUStores. Notes provide a way to track important information, issues, special instructions, or reminders directly on items, sales, orders, charge codes, and suppliers.

**Key Features:**

- 📝 Add notes to items, sales, orders, charge codes, and suppliers
- 👀 Visual indicators showing note count at a glance
- ✏️ Edit and delete your own notes
- 👥 See who created each note and when
- 🔔 Notes persist with the entity indefinitely
- 🔍 Quick access from any related page

Use Cases
=========

Inventory Items
---------------

**Common Uses:**

- Document known issues (e.g., "Battery compartment is loose")
- Track item history (e.g., "Purchased from alternate supplier Jan 2025")
- Special handling instructions (e.g., "Store in fridge, expires in 6 months")
- Maintenance notes (e.g., "Calibrated on 2025-01-10")
- Location changes (e.g., "Moved from Lab A to Lab B on 2025-01-05")

**Example Scenario:**

A microscope in your inventory has a finicky focus knob. Add a note: "Focus knob requires gentle adjustment. Do not force." This helps users avoid damaging the equipment.

Sales Transactions
------------------

**Common Uses:**

- Customer requests (e.g., "Customer requested delivery to Building 3")
- Payment notes (e.g., "Paid by check #12345")
- Issues during transaction (e.g., "Original item was out of stock, substituted")
- Follow-up required (e.g., "Customer will return unused portion")
- Refund reasons (e.g., "Item was defective, full refund issued")

**Example Scenario:**

A customer purchases lab equipment but mentions they need training. Add a note: "Customer requested training session. Contact: jane@example.com". This ensures follow-up happens.

Purchase Orders
---------------

**Common Uses:**

- Supplier communication (e.g., "Supplier confirmed 2-week delivery")
- Special terms (e.g., "Negotiated 10% bulk discount")
- Receiving notes (e.g., "Package arrived damaged, filed claim")
- Invoice discrepancies (e.g., "Invoice amount differs, contacted supplier")
- Partial shipments (e.g., "Received 8 of 10 items, remainder backordered")

**Example Scenario:**

An order arrives with incorrect items. Add a note: "Received wrong model. Supplier sending replacement. RMA #45678." This documents the issue for future reference.

Charge Codes
------------

**Common Uses:**

- Budget notes (e.g., "£5000 remaining in budget")
- Authorization details (e.g., "Approved by Prof. Smith for research equipment")
- Project milestones (e.g., "Phase 1 completed, moved to Phase 2")
- Restrictions (e.g., "Cannot be used for consumables per grant terms")
- Expiration reminders (e.g., "Charge code expires March 31")

**Example Scenario:**

A grant-funded charge code has specific spending restrictions. Add a note: "Grant allows equipment only, no consumables or salaries." This prevents incorrect purchases.

Suppliers/Vendors
-----------------

**Common Uses:**

- Contact preferences (e.g., "Prefer email, responds within 24h")
- Ordering notes (e.g., "Minimum order quantity: 10 units")
- Quality issues (e.g., "Last shipment had damaged packaging")
- Delivery terms (e.g., "Free shipping on orders >£500")
- Account details (e.g., "Account rep: John Smith, ext. 1234")

**Example Scenario:**

A supplier requires a purchase order number for all transactions. Add a note: "Requires PO# in order comments. Email to: orders@supplier.com." This ensures orders are processed correctly.

Where Notes Appear
==================

Note Indicators
---------------

Notes are indicated by a **badge icon** with a count next to the entity name:

.. code-block:: text

   Item Name [📝 3]  ← 3 notes exist

   Charge Code: PROJ-2024-001 [📝 1]  ← 1 note exists

**Visual Design:**

- **Icon:** Notepad or comment icon
- **Count:** Number in badge (e.g., "3")
- **Color:** Blue or gray, depending on theme
- **Placement:** Next to entity name or in actions column

Accessing Notes
===============

Opening the Notes Modal
------------------------

Notes are accessed through a modal dialog:

**Method 1: Note Indicator Icon**

1. Locate the note indicator badge (e.g., [📝 3])
2. Click the badge
3. Notes modal opens

**Method 2: Actions Menu**

1. Click the **Actions** dropdown for an entity
2. Select **View Notes** or **Add Note**
3. Notes modal opens

**Method 3: Detail Pages**

1. Navigate to entity detail page (e.g., item details)
2. Click **Notes** tab or button
3. Notes modal or section displays

Notes Modal Interface
---------------------

The notes modal displays:

**Header:**

- Entity type and name (e.g., "Notes for Item: Digital Multimeter")
- Note count (e.g., "3 notes")
- Close button (X)

**Note List:**

Each note shows:

- **Note text** - Full content
- **Author** - User who created the note
- **Timestamp** - When note was created (e.g., "2025-01-10 14:30")
- **Edit button** - If you created the note
- **Delete button** - If you created the note

**Add Note Section:**

- Text area for new note
- **Save** button
- **Cancel** button

Adding a Note
=============

Step-by-Step
------------

1. **Open Notes Modal**

   - Click note indicator or Actions > Add Note

2. **Write Note**

   - Click in the text area
   - Type your note (no character limit)
   - Use clear, concise language
   - Include relevant details (dates, names, amounts)

3. **Save Note**

   - Click **Save** button
   - Or press ``Ctrl+Enter`` (Windows/Linux) or ``Cmd+Enter`` (macOS)

4. **Confirmation**

   - Success toast appears: "Note added successfully"
   - Note appears in list immediately
   - Note count badge updates (e.g., [📝 3] → [📝 4])

**Note Text Best Practices:**

✅ **Do:**

- Be specific and factual
- Include dates and amounts where relevant
- Mention names of people involved
- Use proper grammar and spelling
- Keep notes concise but complete

❌ **Don't:**

- Use notes for sensitive personal information
- Include passwords or confidential data
- Write unclear or vague notes
- Use excessive jargon without explanation

**Example Good Notes:**

.. code-block:: text

   ✅ "Calibrated on 2025-01-10 by Lab Tech Sarah. Next calibration due 2025-07-10."

   ✅ "Customer requested delivery to Building 3, Room 205. Contact: john.doe@example.com"

   ✅ "Supplier shipped wrong model (ABC-100 instead of ABC-200). RMA #45678 issued. Replacement expected by 2025-01-20."

**Example Poor Notes:**

.. code-block:: text

   ❌ "broken" (too vague, no details)

   ❌ "thing with the guy happened" (unclear, no specifics)

   ❌ "idk maybe check later" (unprofessional, unhelpful)

Editing a Note
==============

You can edit notes that **you created**.

1. **Open Notes Modal**

   - Click note indicator to view notes

2. **Locate Your Note**

   - Find the note you created (your username shows as author)
   - Look for **Edit** button next to note

3. **Enter Edit Mode**

   - Click **Edit** button
   - Note text becomes editable textarea

4. **Modify Text**

   - Make desired changes
   - Click **Save** to confirm
   - Or click **Cancel** to discard changes

5. **Confirmation**

   - Success toast: "Note updated successfully"
   - Updated note displays with new content
   - Timestamp updates to show "Edited on YYYY-MM-DD HH:mm"

.. note::
   You cannot edit notes created by other users. This preserves accountability and audit trail.

Deleting a Note
===============

You can delete notes that **you created**.

1. **Open Notes Modal**

2. **Locate Your Note**

   - Find note with **Delete** button

3. **Click Delete**

   - **Confirmation dialog** appears:

   .. code-block:: text

      Delete Note

      Are you sure you want to delete this note?
      This action cannot be undone.

      [Cancel]  [Delete]

4. **Confirm Deletion**

   - Click **Delete** button
   - Note removed immediately
   - Note count badge updates (e.g., [📝 4] → [📝 3])

5. **Confirmation**

   - Success toast: "Note deleted successfully"

.. warning::
   **Deletion is permanent.** Deleted notes cannot be recovered. Make sure you want to delete before confirming.

**When to Delete Notes:**

- Note contains outdated information
- Note was created by mistake
- Issue documented in note has been resolved and is no longer relevant

**When NOT to Delete Notes:**

- For historical record-keeping (edit instead to add updates)
- Notes created by others (you can't delete these anyway)
- Notes that may be useful for audits or compliance

Viewing Note History
====================

Notes include metadata for accountability:

**Displayed Information:**

===================  ========================================
Field                Description
===================  ========================================
**Author**           Username of note creator
**Created At**       Date and time note was created
**Edited** (if applicable)  "Edited on YYYY-MM-DD HH:mm"
===================  ========================================

**Example:**

.. code-block:: text

   "Calibrated on 2025-01-10. Next service due in 6 months."

   Created by: jane.smith@example.com
   Created at: 2025-01-10 09:45
   Edited on: 2025-01-10 14:20

**Use Cases for History:**

- Verify who documented an issue
- Track when changes occurred
- Audit compliance activities
- Resolve discrepancies in information

Permissions
===========

The Notes System respects user permissions:

**View Notes:**

- Permission: ``notes.view`` (default: all authenticated users)
- Can see all notes on entities they can access

**Add Notes:**

- Permission: ``notes.create`` (default: all authenticated users)
- Can add notes to entities they can access

**Edit Notes:**

- Permission: ``notes.edit`` (default: own notes only)
- Can only edit notes **they created**
- Admins may have elevated permissions

**Delete Notes:**

- Permission: ``notes.delete`` (default: own notes only)
- Can only delete notes **they created**
- Admins may have elevated permissions

.. note::
   Superusers and Admins typically can edit/delete all notes regardless of creator, but this varies by configuration.

Notes API
=========

Notes are accessible via the REST API for integrations:

**Endpoints:**

.. code-block:: http

   GET /api/notes?referenceType=item&referenceId=123
   POST /api/notes
   PUT /api/notes/:id
   DELETE /api/notes/:id

**Reference Types:**

- ``item`` - Inventory items
- ``sale`` - Sales transactions
- ``order`` - Purchase orders
- ``charge_code`` - Charge codes
- ``supplier`` - Suppliers/vendors

See :doc:`../api/endpoints` for complete API documentation.

Best Practices
==============

Writing Effective Notes
-----------------------

**Include Key Information:**

- **What:** What happened or what is the issue?
- **When:** Date and time (if relevant)
- **Who:** People involved (names, contact info)
- **Why:** Reason or context
- **Next Steps:** What should be done next (if applicable)

**Use Consistent Formatting:**

.. code-block:: text

   [YYYY-MM-DD] Event or action description.
   Contact: Name (email/phone)
   Next: Follow-up action required

**Example:**

.. code-block:: text

   [2025-01-12] Customer reported defective unit.
   Contact: John Doe (john.doe@example.com)
   Next: Arrange replacement shipment by 2025-01-15.

Organizing Information
----------------------

**For Items:**

- Maintenance/calibration records
- Known issues or defects
- Special handling requirements
- Location history

**For Sales:**

- Payment details
- Customer special requests
- Delivery instructions
- Post-sale follow-up

**For Orders:**

- Supplier communications
- Delivery status updates
- Quality issues
- Invoice discrepancies

**For Charge Codes:**

- Budget tracking
- Authorization documentation
- Spending restrictions
- Project milestones

Regular Review
--------------

**Monthly:**

- Review notes on active items
- Archive or delete outdated notes
- Update recurring issues with new information

**Quarterly:**

- Compile notes into formal documentation
- Identify systemic issues from recurring notes
- Train users on note-taking best practices

Security and Privacy
--------------------

✅ **Do:**

- Use notes for operational information
- Include contact details for follow-up
- Document compliance activities

❌ **Don't:**

- Include sensitive personal data
- Store passwords or credentials
- Use notes for confidential communications
- Include medical or financial information

Troubleshooting
===============

Common Issues
-------------

**Cannot See Notes**

**Symptoms:**
- Note indicator not visible
- Notes modal empty
- "No notes found" message

**Solutions:**

1. **Check Permissions:** Verify you have ``notes.view`` permission
2. **Entity Access:** Ensure you can access the entity itself
3. **Browser Cache:** Clear cache and hard refresh
4. **Notes Exist:** Confirm notes actually exist for this entity

**Cannot Edit Note**

**Symptoms:**
- No Edit button visible
- Edit button grayed out
- "Permission denied" error

**Solutions:**

1. **Verify Ownership:** You can only edit notes you created
2. **Check Timestamp:** Note may have been created by someone with same name
3. **Permissions:** Verify ``notes.edit`` permission

**Cannot Delete Note**

**Symptoms:**
- No Delete button
- Delete fails with error

**Solutions:**

1. **Verify Ownership:** You can only delete your own notes
2. **Admin Override:** Contact admin if note needs removal
3. **Edit Instead:** Consider editing to mark as "OBSOLETE" instead

**Notes Not Saving**

**Symptoms:**
- Click Save but note doesn't appear
- Error message displayed
- Page reloads without saving

**Solutions:**

1. **Text Length:** Ensure note isn't excessively long (>10,000 characters)
2. **Special Characters:** Avoid unusual characters or emojis
3. **Network Issues:** Check internet connection
4. **Session Timeout:** Log out and log back in

Related Documentation
=====================

- :doc:`inventory` - Managing inventory items (with notes)
- :doc:`sales-quotes` - Sales workflows (with notes)
- :doc:`orders-management` - Order management (with notes)
- :doc:`../api/endpoints` - Notes API endpoints

Summary
=======

The Notes System provides a flexible way to add contextual information throughout LUStores:

✅ **Add notes** to items, sales, orders, charge codes, and suppliers
✅ **Visual indicators** show note count at a glance
✅ **Edit and delete** your own notes anytime
✅ **See authorship** - know who wrote each note and when
✅ **Persist indefinitely** - notes stay with entities
✅ **API access** - integrate notes into external systems

**Key Best Practices:**

1. Be specific and include relevant details
2. Use consistent formatting for easier scanning
3. Include dates, names, and amounts where relevant
4. Review and update notes regularly
5. Don't store sensitive information in notes

Use notes to enhance communication, track important information, and maintain institutional knowledge across your inventory management operations.
