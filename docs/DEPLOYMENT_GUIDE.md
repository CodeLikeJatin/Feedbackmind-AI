# FeedbackMind AI — Production Deployment Guide

> **Important Deployment Rule:** FeedbackMind AI stores relational feedback data, analysis states, and checkpoint metadata in **SQLite** via Node.js native `node:sqlite` (`DatabaseSync`). SQLite requires a **persistent block volume**. Do NOT deploy this service to ephemeral serverless platforms (e.g., AWS Lambda, Vercel Serverless Functions) where filesystem storage resets between invocations.

> [!WARNING]
> ### Security & Deployment Boundary
> - **Server-side user authentication is NOT implemented:** The API does not verify user identity via login, JWT, or sessions.
> - **Workspace-level authorization / RBAC is NOT implemented:** A caller may potentially access another workspace by supplying its `companyId`.
> - **Public Deployment Status:** The application is currently suitable **ONLY** for local evaluation, controlled hackathon demonstrations, and restricted internal network use (e.g. behind a corporate VPN or reverse proxy basic auth).
> - **It is NOT ready for unprotected public multi-tenant SaaS deployment.**
> - User authentication and workspace ownership verification must be implemented before exposing this application directly to the public internet.

---

## 1. Production Architecture Overview

```mermaid
flowchart LR
    subgraph Users
        Browser["End Users & PMs<br/>(Chrome / Safari / Firefox)"]
    end

    subgraph CDN_Proxy["Edge / Reverse Proxy Layer"]
        CF["Cloudflare / Nginx Reverse Proxy<br/>SSL/TLS Termination (HTTPS)"]
    end

    subgraph Container_Host["Application Container (Node.js 22 LTS)"]
        SPA["Static Frontend Assets<br/>(Vite Production Build)"]
        API["Express 4 REST API<br/>(Port 5001)"]
        SQLite[("Native node:sqlite Engine<br/>WAL Mode enabled")]
    end

    subgraph Persistent_Storage["Persistent Storage Layer"]
        Disk[("Persistent Volume Mount<br/>/data/feedbackmind.sqlite")]
    end

    subgraph External_APIs["External AI & Cloud Services"]
        Groq["Groq Cloud API<br/>(api.groq.com)"]
        Hindsight["Hindsight Cloud API<br/>(api.hindsight.vectorize.io)"]
    end

    Browser -->|HTTPS :443| CF
    CF -->|HTTP :5001| API
    CF -->|Static Assets| SPA
    API --> SQLite
    SQLite --> Disk
    API -->|LLM Inference (HTTPS :443)| Groq
    API -->|Episodic Memory (HTTPS :443)| Hindsight
```

---

## 2. Recommended Hosting Targets

### Target 1: Render.com (Backend Web Service)
1. **Create Web Service:** Connect your repository `CodeLikeJatin/Feedbackmind-AI`.
2. **Root Directory:** `backend`
3. **Environment:** Node (`Node 22 LTS` or higher).
4. **Build Command:**
   ```bash
   npm install
   ```
5. **Start Command:**
   ```bash
   npm start
   ```
6. **Attach Persistent Disk:**
   - Mount Path: `/data`
   - Size: 1 GB (sufficient for >100,000 feedback records).
7. **Set Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=5001`
   - `DATABASE_PATH=/data/feedbackmind.sqlite`
   - `ALLOWED_ORIGINS=https://your-frontend-app.vercel.app`
   - `GROQ_API_KEY=gsk_...`
   - `HINDSIGHT_API_KEY=...`
   - `HINDSIGHT_BANK_ID=feedbackmind-demo`
   - `ADMIN_API_KEY=<generate-a-strong-random-token>`

---

### Target 2: Vercel (Frontend Web Application)
1. **Import Project:** Select `CodeLikeJatin/Feedbackmind-AI`.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Set Environment Variables:**
   - `VITE_API_BASE_URL=https://your-backend-app.onrender.com`

---

### Target 3: Docker on Ubuntu VPS (Docker Compose)
Create `docker-compose.yml` on your server:

```yaml
version: '3.8'

services:
  feedbackmind-backend:
    image: node:22-alpine
    restart: always
    working_dir: /app/backend
    volumes:
      - feedbackmind_data:/data
      - .:/app
    environment:
      - NODE_ENV=production
      - PORT=5001
      - DATABASE_PATH=/data/feedbackmind.sqlite
      - ALLOWED_ORIGINS=https://feedbackmind.yourdomain.com
      - GROQ_API_KEY=${GROQ_API_KEY}
      - HINDSIGHT_API_KEY=${HINDSIGHT_API_KEY}
      - HINDSIGHT_BANK_ID=feedbackmind-demo
      - ADMIN_API_KEY=${ADMIN_API_KEY}
    ports:
      - "127.0.0.1:5001:5001"
    command: sh -c "npm install && npm start"

volumes:
  feedbackmind_data:
    driver: local
```

---

## 3. Persistent Disk Volume Specifications

| Specification | Minimum Recommended | Production Ideal | Notes |
|---|---|---|---|
| **Disk Type** | SSD / NVMe Block Storage | NVMe Volume with automated snapshots | Avoid network mounts with high latency |
| **Volume Size** | 1 GB | 5 GB | Feedback records with analysis take ~2 KB per row |
| **IOPS** | 500 IOPS | 3,000 IOPS | WAL mode requires low write latency |
| **Filesystem** | ext4 / XFS | ext4 | Standard Linux block filesystem |
| **Mount Permissions** | `0700` owned by node user | `0700` owned by node user | Prevent unauthorized local user access |

---

## 4. Production Environment Variables Reference

```bash
# Server Runtime
PORT=5001
NODE_ENV=production

# CORS Security (restrict to your exact frontend domain)
ALLOWED_ORIGINS=https://feedbackmind.yourdomain.com

# Admin API Key (protects destructive endpoints)
ADMIN_API_KEY=fb_admin_prod_89f3b2e7c1094

# AI Engine Credentials
GROQ_API_KEY=gsk_your_production_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Long-Term Episodic Memory
HINDSIGHT_API_KEY=your_hindsight_production_key_here
HINDSIGHT_BANK_ID=feedbackmind-demo
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io

# Persistent Database File Path
DATABASE_PATH=/data/feedbackmind.sqlite

# Client Base URL (set when building client separately)
VITE_API_BASE_URL=https://feedbackmind.yourdomain.com
```

---

## 5. Zero-Downtime SQLite Backup Strategy

Because FeedbackMind AI runs SQLite in **WAL (Write-Ahead Logging)** mode, raw file copying while writes are happening can corrupt the backup. Use SQLite's online backup capability:

### Online Backup Command
```bash
node -e "
import { DatabaseSync } from 'node:sqlite';
const source = new DatabaseSync('/data/feedbackmind.sqlite');
source.exec(\"VACUUM INTO '/data/backups/backup-\" + new Date().toISOString().slice(0,10) + \".sqlite'\");
source.close();
console.log('Online backup completed successfully.');
"
```

### Automated Daily Cron Job (`/etc/cron.daily/backup-feedbackmind`)
```bash
#!/bin/bash
BACKUP_DIR="/data/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/feedbackmind_$TIMESTAMP.sqlite"

# Perform online vacuum backup
sqlite3 /data/feedbackmind.sqlite ".backup '$BACKUP_FILE'"

# Compress backup
gzip -9 "$BACKUP_FILE"

# Retain only last 14 days of backups
find "$BACKUP_DIR" -name "*.sqlite.gz" -mtime +14 -delete
```

---

## 6. SSL/TLS & Nginx Reverse Proxy Configuration

Place Nginx in front of FeedbackMind AI on port 5001:

```nginx
server {
    listen 80;
    server_name feedbackmind.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name feedbackmind.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/feedbackmind.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/feedbackmind.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client body limit for CSV uploads (10MB)
    client_max_body_size 10M;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

---

## 7. Health Monitoring & Alerts

FeedbackMind AI exposes a lightweight health endpoint at:
`GET https://feedbackmind.yourdomain.com/api/health`

### Expected Response
```json
{
  "status": "ok",
  "service": "FeedbackMind AI Backend",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-11-07T14:30:00.000Z"
}
```
*If database connectivity fails, `status` returns `"degraded"` with HTTP status information.*

Configure your uptime monitoring service (e.g., Better Uptime, Datadog, Pingdom) to query `/api/health` every 60 seconds and alert if `status !== "ok"`.

---

## 8. Rollback Procedures

If an issue occurs after a deployment:
1. **Application Code Rollback:**
   ```bash
   git checkout <previous-stable-tag-or-commit>
   npm run build --prefix client
   systemctl restart feedbackmind # or docker-compose restart
   ```
2. **Database State Rollback:**
   - Stop the service: `systemctl stop feedbackmind`.
   - Restore the latest verified snapshot:
     ```bash
     cp /data/backups/feedbackmind_verified_snapshot.sqlite /data/feedbackmind.sqlite
     ```
   - Restart the service: `systemctl start feedbackmind`.

