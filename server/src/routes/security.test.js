import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import express from 'express';

describe('Phase 9 Security & Protection Architecture', () => {
  describe('Security Headers Middleware', () => {
    it('should inject standard security headers into all HTTP responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toContain('camera=()');
    });
  });

  describe('Workspace Identifier Validation', () => {
    it('should permit valid alphanumeric and hyphenated company IDs', async () => {
      const res = await request(app).get('/api/feedback?companyId=valid-org-123');
      expect(res.status).toBe(200);
    });

    it('should reject directory traversal patterns in companyId', async () => {
      const res = await request(app).get('/api/feedback?companyId=../../etc/passwd');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid workspace identifier');
    });

    it('should reject XSS attempt payloads in companyId', async () => {
      const res = await request(app).get('/api/feedback?companyId=<script>alert(1)</script>');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid workspace identifier');
    });

    it('should reject SQL injection attempt payloads in companyId', async () => {
      const res = await request(app).get("/api/feedback?companyId=demo' OR '1'='1");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid workspace identifier');
    });

    it('should reject identifiers shorter than 2 characters or longer than 64 characters', async () => {
      const shortRes = await request(app).get('/api/feedback?companyId=a');
      expect(shortRes.status).toBe(400);

      const longRes = await request(app).get(`/api/feedback?companyId=${'a'.repeat(65)}`);
      expect(longRes.status).toBe(400);
    });
  });

  describe('Destructive Guard Middleware', () => {
    it('should block unconfirmed seed requests when guard is enforced', async () => {
      const res = await request(app)
        .post('/api/feedback/seed')
        .set('x-enforce-destructive-guard', 'true')
        .send({ companyId: 'temp-workspace' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Destructive operation denied');
    });

    it('should block unconfirmed clear requests when guard is enforced', async () => {
      const res = await request(app)
        .delete('/api/feedback/clear?companyId=temp-workspace')
        .set('x-enforce-destructive-guard', 'true');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Destructive operation denied');
    });
  });

  describe('Sliding-Window Rate Limiter Engine', () => {
    it('should enforce request caps and return HTTP 429 when threshold exceeded', async () => {
      const testLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        name: 'test-limiter'
      });

      const testApp = express();
      testApp.use(testLimiter);
      testApp.get('/test', (req, res) => res.json({ ok: true }));

      // Requests 1, 2, 3 should succeed
      for (let i = 0; i < 3; i++) {
        const res = await request(testApp)
          .get('/test')
          .set('x-test-rate-limit', 'true');
        expect(res.status).toBe(200);
        expect(res.headers).toHaveProperty('x-ratelimit-remaining');
      }

      // Request 4 should be rejected with 429
      const blockedRes = await request(testApp)
        .get('/test')
        .set('x-test-rate-limit', 'true');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toBe('Too Many Requests');
      expect(blockedRes.headers).toHaveProperty('retry-after');
    });
  });
});

