// Jest test utilities for frontend tests

/**
 * Creates a mock Response object for testing API calls
 */
export function createMockResponse(data: any, options: { status?: number; ok?: boolean } = {}): Response {
  const { status = 200, ok = true } = options;
  
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    formData: jest.fn().mockResolvedValue(new FormData()),
    clone: jest.fn().mockReturnThis(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as unknown as Response;
}

/**
 * Creates a mock Response object for Blob responses (like file downloads)
 */
export function createMockBlobResponse(blob: Blob, options: { status?: number; ok?: boolean } = {}): Response {
  const { status = 200, ok = true } = options;
  
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers({
      'Content-Type': blob.type,
    }),
    json: jest.fn().mockRejectedValue(new Error('Response is not JSON')),
    text: jest.fn().mockResolvedValue(''),
    blob: jest.fn().mockResolvedValue(blob),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    formData: jest.fn().mockResolvedValue(new FormData()),
    clone: jest.fn().mockReturnThis(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as unknown as Response;
}

/**
 * Creates a mock Response object for count responses
 */
export function createMockCountResponse(count: number): Response {
  return createMockResponse({ count });
}

/**
 * Creates a mock Response object for error responses
 */
export function createMockErrorResponse(message: string, status: number = 400): Response {
  return createMockResponse({ error: message }, { status, ok: false });
}
