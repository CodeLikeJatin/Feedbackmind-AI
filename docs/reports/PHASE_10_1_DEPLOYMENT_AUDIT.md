# PHASE 10.1 — PUBLIC DEMO DEPLOYMENT READINESS AUDIT

**Project:** FeedbackMind AI — User Feedback Synthesizer  
**Evaluation Scope:** Public Hackathon Judging Deployment  
**Target Infrastructure:**  
- **Frontend:** Vercel (React 19, Vite 6, Tailwind CSS 3)  
- **Backend:** Render Web Service (Node.js 22 LTS, Express 4)  
- **Database:** Isolated SQLite Demo Database (`node:sqlite` / `DatabaseSync`)  
- **AI Inference:** Groq Cloud API  
- **Long-Term Memory:** Hindsight Cloud (`@vectorize-io/hindsight-client`)  
- **Dataset Policy:** Strictly synthetic demonstration data only  

---

## 1. Executive Summary

A comprehensive architectural and security audit was conducted on the FeedbackMind AI codebase to determine its readiness for a publicly accessible hackathon judging deployment on Vercel and Render.

### Overall Readiness Status: **CONDITIONAL (BLOCKERS IDENTIFIED)**
While the core application features, test suite (141/141 passing), and demo scripts operate cleanly in controlled local environments, **several critical deployment blockers and security vulnerabilities must be resolved before deploying to public infrastructure**. In particular:
1. Render Node.js runtime versioning must be pinned to Node 22.5.0+ to prevent startup crashes with native `node:sqlite`.
2. Workspace authorization is currently unrestricted, allowing arbitrary callers to create unauthorized Hindsight Cloud memory banks and access arbitrary namespaces.
3. Destructive endpoints in `learningCurve.js` lack administrative guards and could allow external visitors to reset the learning curve scenario or exhaust Groq/Hindsight credits.
4. Database initialization on cold start / ephemeral disks must self-seed the verified 27 demo records and 3 pre-computed checkpoints to guarantee high availability without manual re-initialization.

---

## 2. Classification Matrix of Audit Findings

| ID | Finding | Category | Severity | Status |
|---|---|---|---|---|
| **F-01** | Missing Node 22.5+ Runtime Specification on Render | Infrastructure | **CRITICAL** | Blocker |
| **F-02** | Unrestricted `companyId` Parameter & Hindsight Bank Poisoning | Security / Auth | **CRITICAL** | Vulnerability |
| **F-03** | Unprotected Destructive Endpoints in `learningCurve.js` | Security / Cost | **CRITICAL** | Vulnerability |
| **F-04** | Cold-Start Ephemeral Storage Auto-Seeding Missing | Architecture | **CRITICAL** | Blocker |
| **F-05** | Reverse Proxy Trust (`trust proxy`) Disabled in Express | Infrastructure | **HIGH** | Vulnerability |
| **F-06** | CORS Wildcard / Preview Subdomain Rejection on Vercel | Networking | **HIGH** | Blocker |
| **F-07** | Public Demo Shared CSV Upload Pollution | Security / Integrity | **MEDIUM** | Vulnerability |
| **F-08** | Vercel Single-Page Application (SPA) Deep Link Fallback | Frontend Routing | **MEDIUM** | Usability |
| **F-09** | Frontend API Base URL Trailing Slash Normalization | Frontend Service | **LOW** | Robustness |
| **F-10** | Render Free-Tier Cold Start Latency (Spin-Down) | Infrastructure | **LOW** | Operational |

---

## 3. Deep Dive on Exact Deployment Blockers

### F-01 (CRITICAL) — Node 22.5.0+ Engine Declaration for `node:sqlite`
- **Location:** `server/package.json`
- **Problem:** FeedbackMind AI uses Node.js native `node:sqlite` (`DatabaseSync`), which was introduced in Node.js 22.5.0. Render's default Node runtime may select an older LTS version (such as Node 18 or Node 20) unless explicitly instructed.
- **Consequence:** Render will fail immediately during container startup with:  
  `Error: Cannot find module 'node:sqlite'`.
- **Required Fix:**
  1. Add an `engines` declaration to `server/package.json`:
     ```json
     "engines": {
       "node": ">=22.5.0"
     }
     ```
  2. Set `NODE_VERSION=22.11.0` (or `22.x`) in the Render Web Service environment settings.

---

### F-04 (CRITICAL) — Cold-Start Database Self-Healing on Ephemeral Storage
- **Location:** `server/src/server.js`, `server/src/config/db.js`, `server/src/services/learningCurveService.js`
- **Problem:** Render free-tier services utilize an ephemeral filesystem (the container filesystem is reset on spin-down after 15 minutes of inactivity or upon deployment). If the persistent SQLite file `feedbackmind.sqlite` is initialized fresh:
  1. `demo-company` will contain 0 records (the existing autoseed route in `dashboard.js` only seeds 20 records from `demoData.js`, rather than the 27 deterministic records needed for trend recommendations and isolation tests).
  2. `learning_curve_checkpoints` will contain 0 rows (`isInitialized: false`), leaving the Learning Curve tab unpopulated.
  3. If a judge clicks "Initialize Scenario" on a cold deployment, it triggers 20 sequential LLM calls and memory retentions, which consumes significant time (30–60s) and rapidly burns Hindsight Cloud API credits.
- **Required Fix:**
  1. Implement an automated, idempotent self-healing startup hook in `server/src/config/db.js` or `server.js`.
  2. On database connection, verify:
     - If `demo-company` record count < 27: seed the 27 deterministic records from `server/src/utils/demoCompanyFixture.js`.
     - If `learning-curve-demo` record count < 20: seed the 20 chronological records from `LEARNING_CURVE_SCENARIO`.
     - If `learning_curve_checkpoints` count < 3: seed the 3 pre-computed checkpoints (Checkpoint 1, Checkpoint 5, Checkpoint 20).
  3. This ensures the demo is immediately responsive and feature-complete within 1 second of booting, regardless of whether Render is configured with ephemeral storage or a persistent disk.

---

### F-06 (HIGH) — CORS Handling for Vercel Dynamic Domains
- **Location:** `server/src/config/env.js`, `server/src/server.js`
- **Problem:** In `server/src/server.js`, `corsOptions` verifies `config.allowedOrigins.includes(origin)`. Vercel automatically deploys branch previews and PR previews with dynamic subdomains (e.g., `https://feedbackmind-git-main-codelikejatin.vercel.app` or `https://feedbackmind-*-codelikejatin.vercel.app`).
- **Consequence:** If `ALLOWED_ORIGINS` is configured with only a single production domain, any visitor accessing a Vercel preview URL or branch URL will receive HTTP 403 CORS Forbidden errors.
- **Required Fix:** Update `corsOptions.origin` in `server/src/server.js` to accept:
  1. Any origin explicitly listed in `config.allowedOrigins`.
  2. Any origin matching regex `/^https:\/\/.*\.vercel\.app$/` (or matching the specific project prefix `feedbackmind-*.vercel.app`).

---

## 4. Deep Dive on Security Vulnerabilities & Workspace Isolation

### F-02 (CRITICAL) — Unrestricted Workspace Parameter (`companyId`) & Cloud Bank Poisoning
- **Location:** `server/src/routes/` (`chat.js`, `memory.js`, `analysis.js`, `trends.js`, `demo.js`, `feedback.js`)
- **Problem:** Client requests pass `companyId` via query strings or JSON request bodies.
  1. In `memory.js`: `POST /api/memory/init-bank`, `POST /api/memory/retain`, and `POST /api/memory/retain-batch` pass `companyId` to `hindsightService.ensureBank(companyId)`.
  2. `hindsightService.resolveBankId(companyId)` formats `fbm-${sanitized}` and invokes `client.createBank(...)` on Hindsight Cloud.
  3. In `chat.js`: `POST /api/chat/ask` and `GET /api/chat/history` query SQLite filtered by arbitrary `companyId`.
- **Consequence:** An external user or malicious script can send requests with arbitrary `companyId` values, creating hundreds of unauthorized memory banks in the user's Hindsight Cloud account, exhausting memory retention credits, and polluting the SQLite database.
- **Backend Enforcement Proposal:**
  Create a centralized backend middleware `enforceDemoWorkspace` in `server/src/middleware/security.js`:
  ```javascript
  const ALLOWED_DEMO_WORKSPACES = new Set([
    'demo-company',
    'learning-curve-demo',
    'learning-curve-cp1',
    'learning-curve-cp5',
    'learning-curve-cp20'
  ]);

  export function enforceDemoWorkspace(req, res, next) {
    const rawCompanyId = 
      req.query?.companyId || 
      req.body?.companyId || 
      req.headers['x-workspace-id'];

    if (rawCompanyId && !ALLOWED_DEMO_WORKSPACES.has(rawCompanyId)) {
      return res.status(403).json({
        error: 'Workspace Access Restricted',
        message: 'In the public evaluation deployment, access is restricted strictly to verified synthetic demo workspaces (demo-company, learning-curve-demo).'
      });
    }

    // Attach verified workspace
    req.sanitizedCompanyId = rawCompanyId || 'demo-company';
    next();
  }
  ```
  Apply `enforceDemoWorkspace` across all API routers:
  - `app.use('/api/dashboard', enforceDemoWorkspace, dashboardRouter);`
  - `app.use('/api/feedback', enforceDemoWorkspace, feedbackRouter);`
  - `app.use('/api/analysis', enforceDemoWorkspace, analysisRouter);`
  - `app.use('/api/memory', enforceDemoWorkspace, memoryRouter);`
  - `app.use('/api/chat', enforceDemoWorkspace, chatRouter);`
  - `app.use('/api/trends', enforceDemoWorkspace, trendsRouter);`
  - `app.use('/api/demo', enforceDemoWorkspace, demoRouter);`
  - `app.use('/api/learning-curve', enforceDemoWorkspace, learningCurveRouter);`

---

### F-03 (CRITICAL) — Unprotected Destructive Endpoints in `learningCurve.js`
- **Location:** `server/src/routes/learningCurve.js`
- **Problem:**
  - `POST /api/learning-curve/reset`: Deletes all SQLite checkpoint records and triggers environment reset with zero authentication.
  - `POST /api/learning-curve/initialize`: Allows triggering live sequential Groq and Hindsight retention loops with zero authentication.
- **Consequence:** A single anonymous HTTP request can clear the synthesized checkpoints, breaking the demonstration for judges, or trigger automated retention loops that drain API credits.
- **Required Fix:**
  1. Protect `POST /api/learning-curve/reset` with `checkDestructiveGuard` requiring `X-Admin-Key`.
  2. In production mode, restrict `POST /api/learning-curve/initialize` to return the verified pre-computed checkpoints, or require `X-Admin-Key` if `force=true` is requested.

---

### F-05 (HIGH) — Reverse Proxy Trust in Express
- **Location:** `server/src/server.js`, `server/src/middleware/rateLimiter.js`
- **Problem:** Express is not configured with `app.set('trust proxy', 1)`. Behind Render's reverse proxy load balancer, `req.ip` resolves to Render's internal proxy IP.
- **Consequence:** The sliding-window rate limiters (`aiRateLimiter`: 30 req/min, `generalRateLimiter`: 120 req/min) group all internet visitors into one single IP address. A single active judge or automated crawler will trigger HTTP 429 rate limit errors for all other evaluators.
- **Required Fix:**
  Add `app.set('trust proxy', 1);` immediately after `const app = express();` in `server/src/server.js`.
  Update `rateLimiter.js` to extract the first IP from `x-forwarded-for`:
  ```javascript
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = req.ip || (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
  ```

---

### F-07 (MEDIUM) — Shared Demo CSV Upload Mutation
- **Location:** `server/src/routes/feedback.js`
- **Problem:** `POST /api/feedback/upload` accepts a CSV file and inserts new records directly into `companyId` (defaulting to `demo-company`).
- **Consequence:** If an evaluator uploads an arbitrary CSV, the public demo's baseline record count changes (e.g. from 27 to 35), altering trend percentages and recommendation scores for subsequent viewers.
- **Required Fix:**
  1. For production public evaluation, configure `POST /api/feedback/upload` to either:
     - Disallow mutations to `demo-company` without `X-Admin-Key` while providing sample dataset previews, OR
     - Isolate uploads to a temporary caller session namespace (e.g. `demo-upload-<sessionId>`).

---

### F-08 (MEDIUM) — Vercel Single-Page Application (SPA) Deep Link Routing
- **Location:** `client/`
- **Problem:** When hosted on Vercel, client-side routing requires all non-asset requests to rewrite to `/index.html`.
- **Required Fix:** Create `client/vercel.json`:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

---

### F-09 (LOW) — API Base URL Trailing Slash Normalization
- **Location:** `client/src/services/api.js`
- **Problem:** `const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';`
  If `VITE_API_BASE_URL` is configured in Vercel with a trailing slash (`https://feedbackmind-api.onrender.com/`), request URLs become `...onrender.com//api/health`.
- **Required Fix:** Normalize `API_BASE` in `client/src/services/api.js`:
  ```javascript
  const rawBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
  const API_BASE = rawBase.replace(/\/+$/, '');
  ```

---

## 5. Render & Vercel Configuration Requirements

### Render Web Service Configuration (Backend)
- **Service Type:** Web Service
- **Environment:** Node
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Auto-Deploy:** Yes (on push to `main`)
- **Health Check Path:** `/api/health`
- **Disk:** Ephemeral (supported via startup self-healing) or 1GB Persistent Disk mounted at `/var/data` (optional)

### Vercel Project Configuration (Frontend)
- **Framework Preset:** Vite
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 6. Required Environment Variables Reference

*(Names only — secrets and values must never be stored in Git)*

### Backend Environment Variables (Render)
| Variable Name | Required | Default / Format | Purpose |
|---|---|---|---|
| `NODE_VERSION` | **Yes** | `22.11.0` | Forces Node.js 22.5+ for native `node:sqlite` support |
| `NODE_ENV` | **Yes** | `production` | Enables production security, HSTS, and error masking |
| `PORT` | Auto | Provided by Render | Port on which the Express server listens |
| `ALLOWED_ORIGINS` | **Yes** | `https://<your-vercel-app>.vercel.app` | Comma-delimited list of allowed CORS origins |
| `ADMIN_API_KEY` | **Yes** | High-entropy secret | Authorizes destructive endpoints (`/clear`, `/reset`) |
| `GROQ_API_KEY` | **Yes** | `gsk_...` | Groq Cloud API key for LLM analysis and chat inference |
| `GROQ_MODEL` | Optional | `openai/gpt-oss-120b` | Configured Groq inference model |
| `HINDSIGHT_API_KEY` | **Yes** | Secret API key | Hindsight Cloud API key for episodic memory |
| `HINDSIGHT_BANK_ID` | Optional | `feedbackmind-demo` | Primary demonstration memory bank identifier |
| `HINDSIGHT_BASE_URL` | Optional | `https://api.hindsight.vectorize.io` | Hindsight API gateway URL |
| `DATABASE_PATH` | Optional | `./feedbackmind.sqlite` | SQLite database file location |

### Frontend Environment Variables (Vercel)
| Variable Name | Required | Format | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `https://<your-render-app>.onrender.com` | Backend REST API base URL (no trailing slash) |

---

## 7. Recommended Fixes in Implementation Order (Phase 10.2 Plan)

1. **Step 1 — Node.js Version Declaration:**
   - Add `"engines": { "node": ">=22.5.0" }` to `server/package.json`.
2. **Step 2 — Reverse Proxy & Rate Limiting Hardening:**
   - Add `app.set('trust proxy', 1);` in `server/src/server.js`.
   - Normalize client IP extraction in `server/src/middleware/rateLimiter.js`.
3. **Step 3 — Centralized Workspace Whitelist Middleware:**
   - Implement `enforceDemoWorkspace` in `server/src/middleware/security.js`.
   - Apply `enforceDemoWorkspace` across all routes.
   - Reject any unauthorized `companyId` with HTTP 403.
4. **Step 4 — Destructive Endpoint Protection in `learningCurve.js`:**
   - Apply `checkDestructiveGuard` requiring `X-Admin-Key` to `POST /api/learning-curve/reset`.
   - Guard `POST /api/learning-curve/initialize` against accidental credit depletion.
5. **Step 5 — Cold-Start Database Self-Healing Hook:**
   - Implement startup check in `server/src/config/db.js` / `server.js`.
   - Ensure the 27 demo records (`demoCompanyFixture.js`) and 3 checkpoints are automatically populated on a fresh database boot.
6. **Step 6 — CORS Flexibility for Vercel Previews:**
   - Update `server/src/server.js` `corsOptions.origin` to permit authorized Vercel subdomains.
7. **Step 7 — Frontend SPA Routing & Base URL Normalization:**
   - Create `client/vercel.json` with SPA rewrite rule.
   - Add trailing slash normalization in `client/src/services/api.js`.
8. **Step 8 — Regression Testing & Clean Environment Validation:**
   - Execute all 70 client tests and 71 server tests.
   - Verify all tests pass in a clean database and with whitelisted workspace guards enabled.

---

## 8. Tests Required Before Deployment

Before initiating public deployment in Phase 10.2:
1. **Workspace Guard Security Tests:**
   - Verify `GET /api/dashboard/stats?companyId=unauthorized-org` returns HTTP 403.
   - Verify `POST /api/chat/ask` with `companyId=unauthorized-org` returns HTTP 403.
   - Verify `POST /api/memory/init-bank` with `companyId=unauthorized-org` returns HTTP 403.
2. **Destructive Guard Security Tests:**
   - Verify `POST /api/learning-curve/reset` without `X-Admin-Key` returns HTTP 403.
   - Verify `DELETE /api/feedback/clear` without `X-Admin-Key` returns HTTP 403.
3. **Cold Boot Self-Healing Test:**
   - Verify that booting the server with `DATABASE_PATH=/tmp/cold_boot_test.sqlite` automatically seeds 27 demo records and 3 checkpoints.
4. **CORS Validation Test:**
   - Verify that requests from `https://feedbackmind-*.vercel.app` receive HTTP 200 with appropriate CORS headers.
5. **Full Client & Server Regression:**
   - Client tests: 70 / 70 passed.
   - Server tests: 71 / 71 passed.
   - Production bundle build: `vite build` completed cleanly.
6. **Live Database Protection:**
   - Confirm local `server/feedbackmind.sqlite` remains 100% intact (27 demo records, 20 learning-curve records, 3 checkpoints, `PRAGMA integrity_check = ok`).

---

## 9. Boundary & Strict Stop Rule

- Phase 10.1 read-only deployment readiness audit is complete.
- **Strict Rule:** No application files were modified; no code changes were committed or pushed; no deployments were initiated.
- **Awaiting User Approval:** Implementation will commence in Phase 10.2 only upon explicit user confirmation.

