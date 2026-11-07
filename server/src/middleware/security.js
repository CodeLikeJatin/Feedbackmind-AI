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
 * Validates that an incoming workspace/company ID is safe and well-formed.
 * Rejects path traversal, null bytes, SQL control characters, or unreasonable length.
 */
export function validateWorkspaceId(req, res, next) {
  const companyId = req.query?.companyId || req.body?.companyId;

  if (companyId !== undefined && companyId !== null) {
    const trimmed = String(companyId).trim();
    
    // Check format: 2-64 chars, alphanumeric, hyphens, underscores only
    const validPattern = /^[a-zA-Z0-9_-]{2,64}$/;
    if (!validPattern.test(trimmed)) {
      return res.status(400).json({
        error: 'Invalid workspace identifier',
        message: 'Workspace ID must be 2-64 alphanumeric characters, hyphens, or underscores.'
      });
    }

    // Attach sanitized workspaceId to request
    req.sanitizedCompanyId = trimmed;
  } else {
    req.sanitizedCompanyId = 'demo-company';
  }

  next();
}

