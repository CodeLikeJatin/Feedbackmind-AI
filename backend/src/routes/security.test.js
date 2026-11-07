import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { hindsightService } from '../services/hindsightService.js';
import { initService } from '../services/initService.js';
import { groqService } from '../services/groqService.js';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import express from 'express';
import cors from 'cors';

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
    it('should permit authorized synthetic demo workspaces', async () => {
      const res = await request(app).get('/api/feedback?companyId=demo-company');
      expect(res.status).toBe(200);
    });

    it('should reject unauthorized workspace companyId values with HTTP 403', async () => {
      const res = await request(app).get('/api/feedback?companyId=unauthorized-hacker-org');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Workspace Access Denied');
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
        .send({ companyId: 'test-company' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Destructive operation denied');
    });

    it('should block unconfirmed clear requests when guard is enforced', async () => {
      const res = await request(app)
        .delete('/api/feedback/clear?companyId=test-company')
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

  describe('Phase 10.2 — Public Demo Security Hardening Suite', () => {
    describe('Strict Demo Workspace Authorization Across All Routes', () => {
      it('should reject unauthorized workspace on GET /api/dashboard/stats with HTTP 403', async () => {
        const res = await request(app).get('/api/dashboard/stats?companyId=unauthorized-hacker-org');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Workspace Access Denied');
      });

      it('should reject unauthorized workspace on POST /api/chat/ask with HTTP 403', async () => {
        const res = await request(app)
          .post('/api/chat/ask')
          .send({ question: 'Test question', companyId: 'unauthorized-hacker-org' });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Workspace Access Denied');
      });

      it('should reject unauthorized workspace on POST /api/memory/init-bank with HTTP 403', async () => {
        const res = await request(app)
          .post('/api/memory/init-bank')
          .send({ companyId: 'unauthorized-hacker-org' });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Workspace Access Denied');
      });

      it('should reject unauthorized workspace on GET /api/trends/overview with HTTP 403', async () => {
        const res = await request(app).get('/api/trends/overview?companyId=unauthorized-hacker-org');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Workspace Access Denied');
      });

      it('should reject unauthorized workspace on GET /api/demo/status with HTTP 403', async () => {
        const res = await request(app).get('/api/demo/status?companyId=unauthorized-hacker-org');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Workspace Access Denied');
      });

      it('should permit verified authorized synthetic demo workspaces', async () => {
        const res1 = await request(app).get('/api/dashboard/stats?companyId=demo-company');
        expect(res1.status).toBe(200);

        const res2 = await request(app).get('/api/learning-curve/status');
        expect(res2.status).toBe(200);
      });
    });

    describe('Arbitrary Hindsight Bank Creation Guard', () => {
      it('should throw an error and prevent bank creation for unauthorized workspaces', async () => {
        await expect(hindsightService.ensureBank('malicious-tenant-999'))
          .rejects
          .toThrow(/Unauthorized workspace "malicious-tenant-999"/);
      });
    });

    describe('Destructive Endpoint Protection', () => {
      it('should reject POST /api/learning-curve/reset when destructive guard is enforced', async () => {
        const res = await request(app)
          .post('/api/learning-curve/reset')
          .set('x-enforce-destructive-guard', 'true');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Destructive operation denied');
      });

      it('should reject POST /api/learning-curve/reset without admin key when confirmed', async () => {
        const res = await request(app)
          .post('/api/learning-curve/reset')
          .set('x-enforce-destructive-guard', 'true')
          .set('x-confirm-destructive', 'true');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Protected demonstration workspace');
      });

      it('should protect POST /api/learning-curve/initialize from force re-initialization without admin authorization', async () => {
        const res = await request(app)
          .post('/api/learning-curve/initialize')
          .set('x-enforce-destructive-guard', 'true')
          .send({ force: true });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Destructive operation denied');
      });
    });

    describe('Reverse Proxy Client IP Extraction & Anti-Spoofing', () => {
      it('should rely on Express req.ip with trust proxy to prevent X-Forwarded-For spoofing', async () => {
        const customLimiter = createRateLimiter({
          windowMs: 60000,
          maxRequests: 2,
          name: 'proxy-anti-spoof-test'
        });

        const proxyApp = express();
        proxyApp.set('trust proxy', 1);
        proxyApp.use(customLimiter);
        proxyApp.get('/ip-check', (req, res) => res.json({ ip: req.ip }));

        // Request 1: Client at 203.0.113.195 with spoofed header prepended
        const res1 = await request(proxyApp)
          .get('/ip-check')
          .set('x-test-rate-limit', 'true')
          .set('x-forwarded-for', 'spoofed.attacker.1, 203.0.113.195');

        expect(res1.status).toBe(200);
        expect(res1.body.ip).toBe('203.0.113.195');

        // Request 2: Same client attempting spoofing with a different prepended IP
        const res2 = await request(proxyApp)
          .get('/ip-check')
          .set('x-test-rate-limit', 'true')
          .set('x-forwarded-for', 'spoofed.attacker.2, 203.0.113.195');

        expect(res2.status).toBe(200);
        expect(res2.body.ip).toBe('203.0.113.195');

        // Request 3: Third request from same client with yet another spoofed IP must be BLOCKED (429)
        const res3 = await request(proxyApp)
          .get('/ip-check')
          .set('x-test-rate-limit', 'true')
          .set('x-forwarded-for', 'spoofed.attacker.3, 203.0.113.195');

        expect(res3.status).toBe(429);

        // Request 4: Legitimate different client IP should NOT be blocked
        const resOther = await request(proxyApp)
          .get('/ip-check')
          .set('x-test-rate-limit', 'true')
          .set('x-forwarded-for', '198.51.100.42');

        expect(resOther.status).toBe(200);
        expect(resOther.body.ip).toBe('198.51.100.42');
      });
    });

    describe('Cold-Start Database Self-Healing & Idempotency (Isolated Database)', () => {
      const isolatedDbPath = '/tmp/test_cold_boot_security_suite.sqlite';

      beforeAll(() => {
        if (fs.existsSync(isolatedDbPath)) fs.unlinkSync(isolatedDbPath);
      });

      afterAll(() => {
        if (fs.existsSync(isolatedDbPath)) fs.unlinkSync(isolatedDbPath);
      });

      it('should automatically initialize fresh empty database and be strictly idempotent', () => {
        const testDb = new DatabaseSync(isolatedDbPath);
        testDb.exec(`
          CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feedback_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            date TEXT NOT NULL,
            source TEXT,
            feedback TEXT NOT NULL,
            rating REAL,
            company_id TEXT DEFAULT 'demo-company',
            analysis_status TEXT DEFAULT 'pending',
            sentiment TEXT,
            topic TEXT,
            urgency TEXT,
            customer_problem TEXT,
            feature_request TEXT,
            summary TEXT,
            suggested_action TEXT,
            retained_in_hindsight INTEGER DEFAULT 0,
            hindsight_memory_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS learning_curve_checkpoints (
            checkpoint_id TEXT PRIMARY KEY,
            interaction_number INTEGER NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            retained_count INTEGER NOT NULL,
            recalled_count INTEGER NOT NULL,
            recalled_memories_json TEXT NOT NULL,
            evidence_json TEXT NOT NULL,
            historical_context TEXT,
            remaining_uncertainty TEXT,
            model_used TEXT NOT NULL,
            latency_ms INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Run 1: Initial cold boot
        const boot1 = initService.ensureAllFixtures(testDb);
        expect(boot1.demoCompany.seeded).toBe(true);
        expect(boot1.demoCompany.count).toBe(27);
        expect(boot1.learningCurveScenario.seeded).toBe(true);
        expect(boot1.learningCurveScenario.count).toBe(20);
        expect(boot1.checkpoints.seeded).toBe(true);
        expect(boot1.checkpoints.count).toBe(3);

        const demoRows1 = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get();
        const lcRows1 = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'learning-curve-demo'").get();
        const cpRows1 = testDb.prepare("SELECT COUNT(*) as count FROM learning_curve_checkpoints").get();

        expect(demoRows1.count).toBe(27);
        expect(lcRows1.count).toBe(20);
        expect(cpRows1.count).toBe(3);

        // Run 2: Idempotent re-initialization
        const boot2 = initService.ensureAllFixtures(testDb);
        expect(boot2.demoCompany.seeded).toBe(false);
        expect(boot2.learningCurveScenario.seeded).toBe(false);
        expect(boot2.checkpoints.seeded).toBe(false);

        const demoRows2 = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get();
        const lcRows2 = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'learning-curve-demo'").get();
        const cpRows2 = testDb.prepare("SELECT COUNT(*) as count FROM learning_curve_checkpoints").get();

        // Must remain exactly identical with zero duplicate records
        expect(demoRows2.count).toBe(27);
        expect(lcRows2.count).toBe(20);
        expect(cpRows2.count).toBe(3);

        testDb.close();
      });
    });

    describe('Phase 10.2.1 — Final Public Deployment Security Verification Suite', () => {
      describe('Workspace Authorization Across All Input Channels', () => {
        it('should reject unauthorized workspace via query parameter with HTTP 403', async () => {
          const res = await request(app).get('/api/feedback?companyId=evil-corp-query');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Workspace Access Denied');
        });

        it('should reject unauthorized workspace via JSON body with HTTP 403', async () => {
          const res = await request(app)
            .post('/api/chat/ask')
            .send({ question: 'Test question', companyId: 'evil-corp-body' });
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Workspace Access Denied');
        });

        it('should reject unauthorized workspace via X-Workspace-Id header with HTTP 403', async () => {
          const res = await request(app)
            .get('/api/dashboard/stats')
            .set('x-workspace-id', 'evil-corp-header-ws');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Workspace Access Denied');
        });

        it('should reject unauthorized workspace via X-Company-ID header with HTTP 403', async () => {
          const res = await request(app)
            .get('/api/dashboard/stats')
            .set('x-company-id', 'evil-corp-header-co');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Workspace Access Denied');
        });

        it('should reject unauthorized workspace via multipart form-data upload with HTTP 403', async () => {
          const validCsv = 'feedback_id,customer_id,date,source,feedback,rating\nFB-TEST,CUST-1,2026-11-01,Web,Good app,5.0';
          const res = await request(app)
            .post('/api/feedback/upload')
            .field('companyId', 'evil-corp-multipart')
            .attach('file', Buffer.from(validCsv), 'test.csv');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Workspace Access Denied');
        });

        it('should permit all five approved demo workspaces', async () => {
          const workspaces = [
            'demo-company',
            'learning-curve-demo',
            'learning-curve-cp1',
            'learning-curve-cp5',
            'learning-curve-cp20'
          ];

          for (const ws of workspaces) {
            const res = await request(app).get(`/api/feedback?companyId=${ws}`);
            expect(res.status).toBe(200);
          }
        });
      });

      describe('Public Demo Permissions & Maintenance Protection', () => {
        it('should reject DELETE /api/chat/history when sessionId is missing', async () => {
          const res = await request(app)
            .delete('/api/chat/history')
            .send({ companyId: 'demo-company' });
          expect(res.status).toBe(400);
          expect(res.body.error).toBe('sessionId is required to clear chat history');
        });

        it('should allow DELETE /api/chat/history with specific sessionId', async () => {
          const res = await request(app)
            .delete('/api/chat/history')
            .send({ companyId: 'demo-company', sessionId: 'judge-session-unique-123' });
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should reject destructive seed and clear maintenance operations without confirmation', async () => {
          const seedRes = await request(app)
            .post('/api/feedback/seed')
            .set('x-enforce-destructive-guard', 'true')
            .send({ companyId: 'demo-company' });
          expect(seedRes.status).toBe(403);

          const clearRes = await request(app)
            .delete('/api/feedback/clear?companyId=demo-company')
            .set('x-enforce-destructive-guard', 'true');
          expect(clearRes.status).toBe(403);
        });
      });

      describe('Cold-Start Database Partial Recovery & Zero External Calls', () => {
        const partialDbPath = '/tmp/test_cold_boot_partial.sqlite';

        beforeAll(() => {
          if (fs.existsSync(partialDbPath)) fs.unlinkSync(partialDbPath);
        });

        afterAll(() => {
          if (fs.existsSync(partialDbPath)) fs.unlinkSync(partialDbPath);
        });

        it('should handle partially populated database without overwriting existing data', () => {
          const testDb = new DatabaseSync(partialDbPath);
          testDb.exec(`
            CREATE TABLE IF NOT EXISTS feedback (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              feedback_id TEXT UNIQUE NOT NULL,
              customer_id TEXT NOT NULL,
              date TEXT NOT NULL,
              source TEXT,
              feedback TEXT NOT NULL,
              rating REAL,
              company_id TEXT DEFAULT 'demo-company',
              analysis_status TEXT DEFAULT 'pending',
              sentiment TEXT,
              topic TEXT,
              urgency TEXT,
              customer_problem TEXT,
              feature_request TEXT,
              summary TEXT,
              suggested_action TEXT,
              retained_in_hindsight INTEGER DEFAULT 0,
              hindsight_memory_id TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS learning_curve_checkpoints (
              checkpoint_id TEXT PRIMARY KEY,
              interaction_number INTEGER NOT NULL,
              question TEXT NOT NULL,
              answer TEXT NOT NULL,
              retained_count INTEGER NOT NULL,
              recalled_count INTEGER NOT NULL,
              recalled_memories_json TEXT NOT NULL,
              evidence_json TEXT NOT NULL,
              historical_context TEXT,
              remaining_uncertainty TEXT,
              model_used TEXT NOT NULL,
              latency_ms INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Pre-populate only demo-company
          initService.ensureDemoCompany(testDb);
          const demoCountBefore = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get().count;
          expect(demoCountBefore).toBe(27);

          // Confirm learning-curve-demo and checkpoints are 0
          const lcCountBefore = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'learning-curve-demo'").get().count;
          const cpCountBefore = testDb.prepare("SELECT COUNT(*) as count FROM learning_curve_checkpoints").get().count;
          expect(lcCountBefore).toBe(0);
          expect(cpCountBefore).toBe(0);

          // Run ensureAllFixtures on the partial database
          const partialBoot = initService.ensureAllFixtures(testDb);

          // demo-company must NOT be re-seeded
          expect(partialBoot.demoCompany.seeded).toBe(false);
          expect(partialBoot.demoCompany.count).toBe(27);

          // missing fixtures must be self-healed
          expect(partialBoot.learningCurveScenario.seeded).toBe(true);
          expect(partialBoot.learningCurveScenario.count).toBe(20);
          expect(partialBoot.checkpoints.seeded).toBe(true);
          expect(partialBoot.checkpoints.count).toBe(3);

          const demoCountAfter = testDb.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get().count;
          expect(demoCountAfter).toBe(27);

          testDb.close();
        });

        it('should make ZERO Hindsight and ZERO Groq calls during cold-start self-healing', () => {
          const ensureBankSpy = vi.spyOn(hindsightService, 'ensureBank');
          const groqSpy = vi.spyOn(groqService, 'analyzeFeedback');

          const zeroCallDbPath = '/tmp/test_cold_boot_zero_calls.sqlite';
          if (fs.existsSync(zeroCallDbPath)) fs.unlinkSync(zeroCallDbPath);

          const testDb = new DatabaseSync(zeroCallDbPath);
          testDb.exec(`
            CREATE TABLE IF NOT EXISTS feedback (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              feedback_id TEXT UNIQUE NOT NULL,
              customer_id TEXT NOT NULL,
              date TEXT NOT NULL,
              source TEXT,
              feedback TEXT NOT NULL,
              rating REAL,
              company_id TEXT DEFAULT 'demo-company',
              analysis_status TEXT DEFAULT 'pending',
              sentiment TEXT,
              topic TEXT,
              urgency TEXT,
              customer_problem TEXT,
              feature_request TEXT,
              summary TEXT,
              suggested_action TEXT,
              retained_in_hindsight INTEGER DEFAULT 0,
              hindsight_memory_id TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS learning_curve_checkpoints (
              checkpoint_id TEXT PRIMARY KEY,
              interaction_number INTEGER NOT NULL,
              question TEXT NOT NULL,
              answer TEXT NOT NULL,
              retained_count INTEGER NOT NULL,
              recalled_count INTEGER NOT NULL,
              recalled_memories_json TEXT NOT NULL,
              evidence_json TEXT NOT NULL,
              historical_context TEXT,
              remaining_uncertainty TEXT,
              model_used TEXT NOT NULL,
              latency_ms INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          initService.ensureAllFixtures(testDb);

          expect(ensureBankSpy).not.toHaveBeenCalled();
          expect(groqSpy).not.toHaveBeenCalled();

          ensureBankSpy.mockRestore();
          groqSpy.mockRestore();
          testDb.close();
          if (fs.existsSync(zeroCallDbPath)) fs.unlinkSync(zeroCallDbPath);
        });
      });

      describe('Production CORS Origin Validation', () => {
        const createCorsApp = () => {
          const testApp = express();
          const corsOptions = {
            origin: (origin, callback) => {
              if (!origin || ['https://feedbackmind.vercel.app', 'http://localhost:5173'].includes(origin)) {
                return callback(null, true);
              }
              const vercelPreviewRegex = /^https:\/\/feedbackmind(-[a-zA-Z0-9_-]+)?\.vercel\.app$/;
              if (vercelPreviewRegex.test(origin)) {
                return callback(null, true);
              }
              callback(new Error(`Not allowed by CORS: ${origin}`));
            },
            credentials: true
          };

          testApp.use(cors(corsOptions));
          testApp.get('/test-cors', (req, res) => res.json({ ok: true }));
          testApp.use((err, req, res, next) => {
            if (err.message && err.message.startsWith('Not allowed by CORS')) {
              return res.status(403).json({ error: 'CORS Forbidden', message: err.message });
            }
            next(err);
          });
          return testApp;
        };

        it('should allow approved production origin https://feedbackmind.vercel.app', async () => {
          const corsApp = createCorsApp();
          const res = await request(corsApp)
            .get('/test-cors')
            .set('Origin', 'https://feedbackmind.vercel.app');
          expect(res.status).toBe(200);
          expect(res.headers['access-control-allow-origin']).toBe('https://feedbackmind.vercel.app');
        });

        it('should allow approved Vercel preview origin matching regex', async () => {
          const corsApp = createCorsApp();
          const res = await request(corsApp)
            .get('/test-cors')
            .set('Origin', 'https://feedbackmind-git-feature-codelikejatin.vercel.app');
          expect(res.status).toBe(200);
          expect(res.headers['access-control-allow-origin']).toBe('https://feedbackmind-git-feature-codelikejatin.vercel.app');
        });

        it('should reject unrelated Vercel project origin with HTTP 403', async () => {
          const corsApp = createCorsApp();
          const res = await request(corsApp)
            .get('/test-cors')
            .set('Origin', 'https://unrelated-project.vercel.app');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('CORS Forbidden');
        });

        it('should reject unauthorized external origin with HTTP 403', async () => {
          const corsApp = createCorsApp();
          const res = await request(corsApp)
            .get('/test-cors')
            .set('Origin', 'https://evil-hacker.com');
          expect(res.status).toBe(403);
          expect(res.body.error).toBe('CORS Forbidden');
        });

        it('should allow non-browser requests without Origin header', async () => {
          const corsApp = createCorsApp();
          const res = await request(corsApp).get('/test-cors');
          expect(res.status).toBe(200);
          expect(res.body.ok).toBe(true);
        });
      });
    });
  });
});

