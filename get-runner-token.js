#!/usr/bin/env node
/**
 * GitHub Actions Runner Registration Token Generator
 * Uses GitHub App credentials to generate a fresh registration token
 * for self-hosted runners.
 */

const crypto = require('crypto');
const https = require('https');

// Configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
const REPO_OWNER = 'st7ma784';
const REPO_NAME = 'LUStores';

if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
  console.error('Error: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
  process.exit(1);
}

/**
 * Generate a JWT token for GitHub App authentication
 */
function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds in the past to allow for clock drift
    exp: now + 600, // Expires in 10 minutes
    iss: GITHUB_APP_ID
  };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${payloadB64}`)
    .sign(GITHUB_APP_PRIVATE_KEY, 'base64url');

  return `${header}.${payloadB64}.${signature}`;
}

/**
 * Make an authenticated HTTPS request to GitHub API
 */
function makeRequest(path, method = 'GET', data = null, token = null, isInstallationToken = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'LUStores-Runner-Registration/1.0',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': isInstallationToken ? `token ${token}` : `Bearer ${token}`
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Main function to get runner registration token
 */
async function getRunnerToken() {
  try {
    // Step 1: Generate JWT for App authentication
    const jwt = generateJWT();

    // Step 2: Get installations for this app
    const installations = await makeRequest('/app/installations', 'GET', null, jwt);
    
    if (!installations || installations.length === 0) {
      throw new Error('No installations found for this GitHub App');
    }

    // Find installation for our repository
    let installationId = null;
    for (const installation of installations) {
      if (installation.account.login === REPO_OWNER) {
        installationId = installation.id;
        break;
      }
    }

    if (!installationId) {
      throw new Error(`No installation found for owner: ${REPO_OWNER}`);
    }

    // Step 3: Get installation access token
    const installationTokenResponse = await makeRequest(
      `/app/installations/${installationId}/access_tokens`,
      'POST',
      null,
      jwt
    );

    const installationToken = installationTokenResponse.token;

    // Step 4: Get runner registration token
    const runnerTokenResponse = await makeRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners/registration-token`,
      'POST',
      null,
      installationToken,
      true
    );

    console.log(runnerTokenResponse.token);
    process.exit(0);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
getRunnerToken();
