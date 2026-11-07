# FeedbackMind AI — Production Deployment Checklist

Use this checklist before and immediately following deployment to production.

> [!WARNING]
> ### Security & Deployment Boundary
> - **Server-side user authentication is NOT implemented:** The API does not verify user identity via login, JWT, or sessions.
> - **Workspace-level authorization / RBAC is NOT implemented:** A caller may potentially access another workspace by supplying its `companyId`.
> - **Operational Boundary:** The application is currently suitable **ONLY** for local evaluation, controlled demonstrations, and restricted internal use.
> - **It is NOT ready for unprotected public multi-tenant SaaS deployment.**
> - Authentication and workspace ownership verification must be implemented prior to exposing this service to the public internet.

---

## 1. Pre-Deployment Checklist

- [ ] **1. Node.js Runtime Version:** Host or container has Node.js `v22.5.0` or higher installed (`node -v`).
- [ ] **2. Persistent Volume Allocated:** Block volume or persistent disk is mounted at designated path (e.g., `/data`).
- [ ] **3. Environment Variables Verified:**
  - [ ] `PORT` set to designated port (e.g. `5001`).
  - [ ] `NODE_ENV=production`.
  - [ ] `ALLOWED_ORIGINS` set to exact production frontend URL(s).
  - [ ] `ADMIN_API_KEY` set to a cryptographically secure random string.
  - [ ] `GROQ_API_KEY` configured and active on console.groq.com.
  - [ ] `GROQ_MODEL=llama-3.3-70b-versatile`.
  - [ ] `HINDSIGHT_API_KEY` configured and active.
  - [ ] `HINDSIGHT_BANK_ID=feedbackmind-demo`.
  - [ ] `DATABASE_PATH` points to the persistent mount (e.g. `/data/feedbackmind.sqlite`).
- [ ] **4. Automated Test Verification:**
  - [ ] Client suite passed: `npm test --prefix client -- --run` (70/70 passing).
  - [ ] Server suite passed: `npm test --prefix server` (71/71 passing).
  - [ ] All 141 automated tests green.
- [ ] **5. Client Production Build:** `npm run build --prefix client` completes without syntax or bundle errors.
- [ ] **6. Secret File Exclusion:** Verify `.env`, `server/.env`, and `*.sqlite*` files are strictly excluded from git tracking.

---

## 2. Deployment Execution Steps

- [ ] **1. Transfer Code / Deploy Container:** Pull git repository release tag or build container image.
- [ ] **2. Mount Persistent Storage:** Verify `/data` directory is mounted with `rw` permissions for the application user.
- [ ] **3. Initialize Application Process:** Start Node process via Systemd, PM2, or Docker container.
- [ ] **4. Configure Reverse Proxy:** Nginx or Caddy configured with SSL certificates and proxy pass to port `5001`.
- [ ] **5. Configure Firewall:** Block public access to port `5001`; allow only ports `80` and `443`.

---

## 3. Post-Deployment Smoke Verification

- [ ] **1. Health Endpoint Probe:**
  ```bash
  curl -i https://feedbackmind.yourdomain.com/api/health
  ```
  - Verify HTTP `200 OK`.
  - Verify `"database": "connected"`.
  - Verify sensitive keys/models are NOT leaked in response.
- [ ] **2. Security Headers Audit:**
  ```bash
  curl -I https://feedbackmind.yourdomain.com/api/health
  ```
  - `X-Content-Type-Options: nosniff` present.
  - `X-Frame-Options: DENY` present.
  - `Strict-Transport-Security` present.
- [ ] **3. Rate Limiting Verification:**
  - Verify burst requests receive HTTP 429 when limits are reached.
- [ ] **4. AI Inference Verification:**
  - Navigate to Ask AI Chat or Demo section.
  - Submit test query: *"What are customers saying about onboarding?"*
  - Verify Groq generates structured response within 1–3 seconds.
- [ ] **5. Hindsight Memory Verification:**
  - Open Hindsight Memory Centre.
  - Confirm memory bank status is active and displays retained count.
  - Verify semantic memory recall returns relevant historical context.
- [ ] **6. Destructive Endpoint Guard Verification:**
  - Test `POST /api/feedback/seed` without `X-Confirm-Destructive` header.
  - Verify request is rejected with HTTP `403 Forbidden`.

---

## 4. Operational Maintenance & Backups

- [ ] **1. SQLite Online Backup Job:** Daily automated backup script scheduled via cron or orchestrator.
- [ ] **2. Log Rotation:** Ensure standard output logs are managed by systemd-journald or Docker json-file driver with size rotation (`max-size: "50m"`).
- [ ] **3. Uptime Monitor:** Ping `/api/health` every 60 seconds with threshold alerts for downtime.

