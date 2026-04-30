University Single Sign-On (SSO) Configuration
=============================================

This guide explains how to configure the University Inventory Management System to work with your university's SAML-based single sign-on system.

Overview
--------

The application supports SAML 2.0 authentication, which is the standard protocol used by most university identity providers including:

- **Shibboleth** - Common in higher education
- **Microsoft ADFS** - Active Directory Federation Services
- **Okta** - Cloud-based identity provider
- **Azure AD** - Microsoft's cloud identity service
- **Google Workspace** - Google's enterprise suite
- **OneLogin** - Cloud identity platform

Configuration Steps
-------------------

1. University Identity Provider Setup
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Work with your university's IT department to register the application as a Service Provider (SP) in your identity system.

**Required Information to Provide:**

- **Entity ID/Issuer**: Your application identifier (e.g., ``https://inventory.university.edu``)
- **ACS URL**: ``https://your-domain.com/auth/sso/callback``
- **Metadata URL**: ``https://your-domain.com/auth/sso/metadata``
- **Name ID Format**: ``urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress``

2. Environment Variables
~~~~~~~~~~~~~~~~~~~~~~~~

Configure the following environment variables for SAML authentication:

.. code-block:: bash

   # SAML Identity Provider Configuration
   SAML_ENTRY_POINT=https://sso.university.edu/idp/SSO.php
   SAML_ISSUER=https://inventory.university.edu
   SAML_CALLBACK_URL=https://inventory.university.edu/auth/sso/callback
   SAML_CERT="-----BEGIN CERTIFICATE-----
   MIIDXTCCAkWgAwIBAgIJAL...
   -----END CERTIFICATE-----"

**Environment Variable Details:**

**SAML_ENTRY_POINT**
   - The URL where users are redirected to log in
   - Provided by your university's IT department
   - Usually ends with ``/SSO`` or ``/SingleSignOnService``

**SAML_ISSUER**
   - Your application's unique identifier
   - Should match your production domain
   - Must be registered with the identity provider

**SAML_CALLBACK_URL**
   - Where the identity provider sends authentication responses
   - Must end with ``/auth/sso/callback``
   - Must be HTTPS in production

**SAML_CERT**
   - The identity provider's public certificate
   - Used to verify SAML responses
   - Obtained from your university's metadata

3. Docker Configuration
~~~~~~~~~~~~~~~~~~~~~~~

For Docker deployments, add the SAML variables to your ``docker-compose.yml``:

.. code-block:: yaml

   services:
     app:
       environment:
         - SAML_ENTRY_POINT=https://sso.university.edu/idp/SSO.php
         - SAML_ISSUER=https://inventory.university.edu
         - SAML_CALLBACK_URL=https://inventory.university.edu/auth/sso/callback
         - SAML_CERT=${SAML_CERT}
         - SESSION_SECRET=${SESSION_SECRET}

4. Testing the Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Check Metadata Endpoint:**

.. code-block:: bash

   curl https://your-domain.com/auth/sso/metadata

This should return valid XML metadata that you can provide to your identity provider.

**Test Authentication Flow:**

1. Navigate to ``https://your-domain.com/auth/sso``
2. You should be redirected to your university's login page
3. After successful login, you should be redirected back to the application

Common University Configurations
--------------------------------

Shibboleth Configuration
~~~~~~~~~~~~~~~~~~~~~~~~

Most universities use Shibboleth. Here's a typical configuration:

.. code-block:: bash

   SAML_ENTRY_POINT=https://sso.university.edu/idp/profile/SAML2/Redirect/SSO
   SAML_ISSUER=https://inventory.university.edu
   SAML_CALLBACK_URL=https://inventory.university.edu/auth/sso/callback

**Shibboleth Attribute Mapping:**

The application expects these SAML attributes:

- ``urn:oid:0.9.2342.19200300.100.1.1`` - User ID (uid)
- ``urn:oid:0.9.2342.19200300.100.1.3`` - Email (mail)
- ``urn:oid:2.5.4.42`` - First Name (givenName)
- ``urn:oid:2.5.4.4`` - Last Name (sn)
- ``urn:oid:2.5.4.11`` - Department (ou)
- ``urn:oid:1.3.6.1.4.1.5923.1.1.1.1`` - Affiliation (eduPersonAffiliation)

Microsoft ADFS Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   SAML_ENTRY_POINT=https://adfs.university.edu/adfs/ls/
   SAML_ISSUER=https://inventory.university.edu
   SAML_CALLBACK_URL=https://inventory.university.edu/auth/sso/callback

Azure AD Configuration
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   SAML_ENTRY_POINT=https://login.microsoftonline.com/your-tenant-id/saml2
   SAML_ISSUER=https://inventory.university.edu
   SAML_CALLBACK_URL=https://inventory.university.edu/auth/sso/callback

User Role Mapping
-----------------

The application automatically assigns user roles based on SAML attributes:

**Role Assignment Logic:**

.. code-block:: javascript

   // Default role
   let role = 'user';
   
   // Check eduPersonAffiliation attribute
   if (affiliation.includes('faculty') || affiliation.includes('staff')) {
     role = 'manager';
   }
   
   if (affiliation.includes('admin') || department.includes('IT')) {
     role = 'admin';
   }

**Role Capabilities:**

- **User**: Read-only access to inventory data
- **Manager**: Can add, edit, and manage inventory items
- **Admin**: Full system access including user management

Customizing Role Assignment
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To customize role assignment, modify the logic in ``server/universitySso.ts``:

.. code-block:: typescript

   // Custom role assignment based on department
   if (userInfo.department?.toLowerCase().includes('library')) {
     role = 'manager';
   }
   
   // Custom role assignment based on job title
   if (profile['urn:oid:2.5.4.12']?.includes('Director')) {
     role = 'admin';
   }

Security Considerations
-----------------------

Certificate Management
~~~~~~~~~~~~~~~~~~~~~~

- **Verify Certificate**: Always verify the identity provider's certificate
- **Certificate Rotation**: Monitor for certificate expiration and updates
- **Secure Storage**: Store certificates securely, never in version control

Session Security
~~~~~~~~~~~~~~~~

- **HTTPS Only**: Always use HTTPS in production
- **Secure Cookies**: Sessions cookies are automatically secured
- **Session Timeout**: Sessions expire after 7 days of inactivity

Network Security
~~~~~~~~~~~~~~~~

- **Firewall Rules**: Ensure proper firewall configuration
- **IP Restrictions**: Consider restricting access to university IP ranges
- **VPN Requirements**: Some universities require VPN for external access

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**Authentication Fails**

1. **Check Certificate**: Verify the SAML certificate is correct
2. **Validate URLs**: Ensure all URLs are accessible and correct
3. **Check Logs**: Review application logs for SAML errors
4. **Test Metadata**: Verify metadata endpoint returns valid XML

**User Not Created**

1. **Check Attributes**: Verify required SAML attributes are present
2. **Database Connection**: Ensure database is accessible
3. **Permissions**: Check user creation permissions

**Role Assignment Issues**

1. **Attribute Mapping**: Verify affiliation attributes are mapped correctly
2. **Custom Logic**: Review role assignment logic in code
3. **Database Updates**: Check if user roles are updating properly

Debug Mode
~~~~~~~~~~

Enable debug logging to troubleshoot SAML issues:

.. code-block:: bash

   LOG_LEVEL=debug

This will log detailed SAML request/response information.

**Log Analysis:**

.. code-block:: bash

   # Check SAML authentication logs
   docker logs inventory-app | grep SAML
   
   # Monitor authentication attempts
   tail -f /var/log/inventory/auth.log

Getting Help
------------

**University IT Support**

Contact your university's IT department for:

- Identity provider configuration
- SAML certificate and metadata
- Attribute mapping requirements
- Network access and firewall rules

**Application Support**

For application-specific issues:

1. Check the application logs
2. Verify environment variable configuration
3. Test the metadata endpoint
4. Review the troubleshooting section

**Useful Resources**

- `SAML 2.0 Specification <https://docs.oasis-open.org/security/saml/v2.0/>`_
- `Shibboleth Documentation <https://wiki.shibboleth.net/confluence/display/SP3/Home>`_
- `Microsoft ADFS Documentation <https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/>`_

Example Metadata
----------------

Here's an example of the metadata your application will provide:

.. code-block:: xml

   <?xml version="1.0"?>
   <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                        entityID="https://inventory.university.edu">
     <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
       <md:AssertionConsumerService
         Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
         Location="https://inventory.university.edu/auth/sso/callback"
         index="1"/>
     </md:SPSSODescriptor>
   </md:EntityDescriptor>

This metadata should be provided to your university's identity provider administrator to complete the integration.