/**
 * Security headers and protective middlewares for FeedbackMind AI
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filtering in browsers that support it
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Restrict browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS in production (1 year)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Whitelist of verified synthetic demo workspaces allowed in public deployment
 */
export const ALLOWED_DEMO_WORKSPACES = new Set([
  'demo-company',
  'learning-curve-demo',
  'learning-curve-cp1',
  'learning-curve-cp5',
  'learning-curve-cp20'
]);

/**
 * Workspaces allowed strictly during internal automated unit and integration tests
 */
export const TEST_ALLOWED_WORKSPACES = new Set([
  'test-company',
  'trends-test-org',
  'chat-test-org',
  'demo-test-company',
  'mem-test-org',
  'test-co-alpha',
  'analysis-test-company',
  'e2e-audit-company'
]);

export function isAllowedWorkspace(companyId, req = null) {
  if (!companyId) return true;
  if (ALLOWED_DEMO_WORKSPACES.has(companyId)) return true;

  // Isolated demo session workspaces are permitted only if owned by the calling session
  if (companyId.startsWith('demo-session-')) {
    if (req?.demoSession && req.demoSession.workspaceId === companyId) {
      return true;
    }
    if (process.env.NODE_ENV === 'test' && req?.headers?.['x-allow-session-workspace']) {
      return true;
    }
    return false;
  }

  if (process.env.NODE_ENV === 'test') {
    if (
      TEST_ALLOWED_WORKSPACES.has(companyId) ||
      companyId.startsWith('test-') ||
      companyId.includes('-test-') ||
      companyId.endsWith('-test-org') ||
      companyId.endsWith('-test-company') ||
      companyId === 'chat-test-co' ||
      companyId === 'demo-test-co' ||
      companyId === 'test-co-alpha'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Strict workspace authorization middleware for public demo mode.
 * Enforces that callers can only access verified synthetic demo workspaces.
 * Rejects arbitrary companyId values with HTTP 403 Forbidden.
 */
export function enforceDemoWorkspace(req, res, next) {
  const companyId = 
    req.query?.companyId || 
    req.body?.companyId || 
    req.headers['x-workspace-id'] ||
    req.headers['x-company-id'];

  if (companyId !== undefined && companyId !== null && String(companyId).trim() !== '') {
    const trimmed = String(companyId).trim();

    // Check format: 2-64 chars, alphanumeric, hyphens, underscores only
    const validPattern = /^[a-zA-Z0-9_-]{2,64}$/;
    if (!validPattern.test(trimmed)) {
      return res.status(400).json({
        error: 'Invalid workspace identifier',
        message: 'Workspace ID must be 2-64 alphanumeric characters, hyphens, or underscores.'
      });
    }

    if (!isAllowedWorkspace(trimmed, req)) {
      return res.status(403).json({
        error: 'Workspace Access Denied',
        message: 'In public demonstration mode, access is strictly restricted to verified synthetic demo workspaces (demo-company, learning-curve-demo) or your own active session workspace.'
      });
    }

    req.sanitizedCompanyId = trimmed;
  } else {
    req.sanitizedCompanyId = 'demo-company';
  }

  next();
}

/**
 * Server-side protection guard for destructive operations
 */
export function checkDestructiveGuard(req, res, next) {
  const isConfirmed = 
    req.headers['x-confirm-destructive'] === 'true' || 
    req.body?.confirm === true || 
    req.query?.confirm === 'true';

  const enforceGuard = 
    process.env.NODE_ENV === 'production' || 
    req.headers['x-enforce-destructive-guard'] === 'true';

  if (enforceGuard && !isConfirmed) {
    return res.status(403).json({
      error: 'Destructive operation denied',
      message: 'This operation modifies or deletes workspace records. Header "X-Confirm-Destructive: true" is required.'
    });
  }

  const companyId = req.sanitizedCompanyId || req.body?.companyId || req.query?.companyId || 'demo-company';
  const isDemo = ALLOWED_DEMO_WORKSPACES.has(companyId);

  // In production, require admin key for any destructive operation on demo workspaces
  if (process.env.NODE_ENV === 'production' || req.headers['x-enforce-destructive-guard'] === 'true') {
    if (isDemo || enforceGuard) {
      const adminKey = req.headers['x-admin-key'];
      const configuredAdminKey = process.env.ADMIN_API_KEY;
      if (!configuredAdminKey || adminKey !== configuredAdminKey) {
        return res.status(403).json({
          error: 'Protected demonstration workspace',
          message: 'Administrative authorization is required for destructive operations in production mode.'
        });
      }
    }
  }

  next();
}

