# FeedbackMind AI — GitHub Repository Setup & Push Guide

This document records the exact configuration, staging rules, and step-by-step instructions to initialize and push the **FeedbackMind AI** codebase to GitHub under the account of **CodeLikeJatin**.

> [!WARNING]
> ### Security & Deployment Boundary
> - **Server-side user authentication is NOT implemented:** The API does not verify user identity via login, JWT, or sessions.
> - **Workspace-level authorization / RBAC is NOT implemented:** A caller may potentially access another workspace by supplying its `companyId`.
> - **Repository Visibility:** This repository must remain **PRIVATE**. It is currently suitable **ONLY** for local evaluation, controlled hackathon demonstrations, and restricted internal use.
> - **It is NOT ready for unprotected public multi-tenant SaaS deployment.**
> - User authentication and workspace ownership verification must be implemented prior to exposing this service publicly.

---

## 1. Repository Metadata

| Property | Value |
|---|---|
| **GitHub Owner** | `CodeLikeJatin` |
| **Repository Name** | `feedbackmind-ai` |
| **Repository URL** | `https://github.com/CodeLikeJatin/feedbackmind-ai.git` |
| **Initial Visibility** | **Private** (recommended until public hackathon submission) |
| **Default Branch** | `main` |
| **Git Author Name** | `Jatin_Sharma` |
| **Git Author Email** | `jatincodes.dev@gmail.com` |
| **License** | Excluded (Pending Approval) |

---

## 2. Pre-Push Secret Verification (Zero-Leakage Assurance)

Before pushing, verify that all sensitive files and local databases are strictly ignored by Git:

```bash
# 1. Verify that .env and database files are excluded
git status --ignored

# Expected output must list:
# Ignored files:
#   .env
#   server/.env
#   server/feedbackmind.sqlite
#   server/feedbackmind.sqlite-shm
#   server/feedbackmind.sqlite-wal
#   server/backups/
#   node_modules/
#   scratch/
```

> [!CAUTION]
> Never force-add (`git add -f`) any `.env` file or SQLite database file. API keys (`GROQ_API_KEY`, `HINDSIGHT_API_KEY`) must remain strictly local.

---

## 3. Remote Repository Creation

You can create the remote repository on GitHub via either the web browser or GitHub CLI:

### Option A: Via GitHub Web Interface
1. Go to [https://github.com/new](https://github.com/new).
2. Owner: Select **CodeLikeJatin**.
3. Repository name: Enter `feedbackmind-ai`.
4. Description: `FeedbackMind AI — User Feedback Synthesizer with Groq Inference and Hindsight Episodic Long-Term Memory`.
5. Visibility: Select **Private**.
6. **Do NOT** initialize with a README, .gitignore, or license (these are already authored in the local workspace).
7. Click **Create repository**.

---

## 4. Local Git Initialization & First Commit

Once approved, execute the following commands in the project root directory (`/Users/jatinsharma/Desktop/Feedback`):

```bash
# 1. Initialize local git repository with main branch
git init -b main

# 2. Stage tracked files (.gitignore ensures secrets and databases are excluded)
git add .

# 3. Verify staged files before committing
git status

# 4. Create initial commit
git commit -m "feat: initial commit of FeedbackMind AI with Hindsight episodic memory and Groq inference"

# 5. Link to GitHub remote
git remote add origin https://github.com/CodeLikeJatin/feedbackmind-ai.git

# 6. Push to GitHub main branch
git push -u origin main
```

---

## 5. Recommended GitHub Repository Configuration

After pushing:
1. **GitHub Actions CI:** Confirm that the `.github/workflows/ci.yml` pipeline triggers and runs both client and server test suites.
2. **Branch Protection:**
   - Under **Settings > Branches**, add a branch protection rule for `main`.
   - Require status checks to pass before merging (`Build & Test (Node 22.x)`).
3. **Repository Topics:**
   - Add topics: `ai`, `groq`, `hindsight`, `llm-memory`, `customer-feedback`, `react`, `sqlite`, `hackathon`.

