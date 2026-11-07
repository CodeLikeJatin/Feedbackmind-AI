# FeedbackMind AI — Production Environment Specification

This document defines the infrastructure sizing, runtime constraints, security parameters, and operational boundaries for FeedbackMind AI in production.

> [!WARNING]
> ### Security & Deployment Boundary
> - **Server-side user authentication is NOT implemented:** The API does not verify user identity via login, JWT, or sessions.
> - **Workspace-level authorization / RBAC is NOT implemented:** A caller may potentially access another workspace by supplying its `companyId`.
> - **Operational Boundary:** The application is currently suitable **ONLY** for local evaluation, controlled demonstrations, and restricted internal use.
> - **It is NOT ready for unprotected public multi-tenant SaaS deployment.**
> - Authentication and workspace ownership verification must be implemented prior to exposing this service to the public internet.

---

## 1. Runtime & Compute Requirements

| Parameter | Minimum Requirement | Recommended Production Target |
|---|---|---|
| **CPU Architecture** | x86_64 or ARM64 (e.g. AWS Graviton, Apple Silicon, Hetzner CAX) | 2 vCPU |
| **System Memory (RAM)** | 1 GB RAM | 2 GB to 4 GB RAM |
| **Node.js Runtime** | Node.js v22.5.0+ | Node.js v22.x LTS (tested up to v24.21.0) |
| **Native SQLite Driver** | Built-in `node:sqlite` (`DatabaseSync`) | Built-in `node:sqlite` |
| **Process Model** | Single Node.js process or cluster mode | Single process with Systemd / PM2 / Docker |
| **Typical Memory Footprint** | ~85 MB resident set size (RSS) idle | ~140 MB RSS under active inference load |

---

## 2. Storage & Filesystem Architecture

| Storage Item | Path / Location | Type | Lifecycle |
|---|---|---|---|
| **Main Database** | `/data/feedbackmind.sqlite` | SQLite3 Database File | Permanent (Persistent Volume) |
| **WAL Log** | `/data/feedbackmind.sqlite-wal` | SQLite Write-Ahead Log | Ephemeral / Active writes |
| **Shared Memory Index** | `/data/feedbackmind.sqlite-shm` | Shared Memory Map Index | Ephemeral / Runtime |
| **Online Snapshots** | `/data/backups/*.sqlite` | Full Database Snapshots | 14-day retention cycle |
| **Static Web Assets** | `/app/client/dist/` | Read-only HTML/JS/CSS | Rebuilt on deployment |

### SQLite Pragmas Configured in Code
- `PRAGMA journal_mode = WAL;` (Enables concurrent reads during active writes).
- `PRAGMA busy_timeout = 5000;` (Waits up to 5,000 ms before throwing SQLITE_BUSY error).

---

## 3. Network Topology & Port Bindings

```
[Internet]
    │
    ▼ (HTTPS / 443)
[Cloudflare Edge / Nginx Ingress]
    │
    ▼ (HTTP / 5001 - Loopback 127.0.0.1)
[FeedbackMind AI Express Server]
    │
    ├──► Outbound HTTPS (443) ──► api.groq.com (Groq AI Inference)
    └──► Outbound HTTPS (443) ──► api.hindsight.vectorize.io (Hindsight Memory)
```

- **Inbound Ports:** Port `5001` (Internal/Loopback only; never exposed directly to public internet without SSL reverse proxy).
- **Outbound Ports:** Port `443` outbound to `api.groq.com` and `api.hindsight.vectorize.io`.
- **DNS Resolution:** Standard system resolver for HTTPS outbound calls.

---

## 4. Rate Limiting Limits (Sliding Window)

FeedbackMind AI enforces sliding-window in-memory rate limiting with zero external dependencies:

| Limiter Name | Target Routes | Sliding Window | Max Requests | Exceeded Action |
|---|---|---|---|---|
| `generalRateLimiter` | Global (`*`) | 60 seconds | 120 req / IP | HTTP 429 + `Retry-After` header |
| `aiRateLimiter` | `/api/chat`, `/api/analysis`, `/api/trends` | 60 seconds | 30 req / IP | HTTP 429 + `Retry-After` header |
| `memoryRateLimiter` | `/api/memory/*` | 60 seconds | 40 req / IP | HTTP 429 + `Retry-After` header |
| `uploadRateLimiter` | `/api/feedback/upload` | 60 seconds | 10 req / IP | HTTP 429 + `Retry-After` header |

---

## 5. Multi-Tenant Isolation Constraints

1. **Workspace ID Policy:**
   - Format: `^[a-zA-Z0-9_-]{2,64}$`
   - Rejects special characters, directory traversal, quotes, spaces, and script tags.
   - Fallback: Defaults safely to `demo-company`.
2. **Hindsight Bank Isolation:**
   - Bank ID format: `feedbackmind-${sanitizedCompanyId}` or assigned bank token.
   - Retained memories and recall queries strictly filter by tenant bank ID.
3. **Database Tenant Isolation:**
   - All SQL feedback and analysis queries execute with parameterized `WHERE company_id = ?` clauses.
   - Indices on `company_id`, `sentiment`, `topic`, and `date` ensure low-latency multi-tenant queries.

