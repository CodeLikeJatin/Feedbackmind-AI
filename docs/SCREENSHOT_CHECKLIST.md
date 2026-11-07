# Screenshot & Visual Evidence Checklist — FeedbackMind AI

> **Project:** FeedbackMind AI — User Feedback Synthesizer  
> **Phase:** Phase 8.5 (Technical Storytelling & Materials)  
> **Application Server:** `http://localhost:5173` (Vite) | API: `http://localhost:5001` (Node Express)  
> **Rule Compliance:** All screens correspond directly to existing, verified UI components. Zero fabricated or mocked elements.

---

## 1. Overview of Evidence Screenshots

| # | Screen / View Name | Navigation Path | Target Visual State | Purpose in Article / Story |
|:---:|:---|:---|:---|:---|
| **01** | **Executive Dashboard Overview** | Sidebar → `Dashboard Overview` | 4 KPI summary cards, AreaChart sentiment trend, PieChart topic clusters, Priority issues list | Establishes the core product interface and SaaS aesthetic |
| **02** | **Ask FeedbackMind AI (Chat)** | Sidebar → `Ask FeedbackMind AI` | User question, grounded AI response with Hindsight memory badge and cited evidence records | Demonstrates conversational intelligence backed by episodic memory |
| **03** | **Memory Centre** | Sidebar → `Memory Centre` | Bank profile (`feedbackmind-demo`), 3 architecture pillars (Retain, Recall, Reflect), Retained memory cards | Shows the cognitive memory engine and Hindsight cloud connection |
| **04** | **Memory ON vs. OFF Benchmark** | Sidebar → `Memory Demo` → Tab 2: *Side-by-Side Comparison* | Dual-column side-by-side comparison for *"Has dashboard performance improved over time?"* | Directly proves the contrast between LLM amnesia and persistent memory |
| **05** | **Learning Curve: Checkpoint 1** | Sidebar → `Memory Demo` → Tab 1: *The Memory Learning Curve* | Active card: *Interaction 1 (Baseline)*, bank badge `feedbackmind-lc-cp1`, 6 memory units | Proves baseline snapshot reasoning with explicit, unhallucinated uncertainty |
| **06** | **Learning Curve: Checkpoint 5** | Sidebar → `Memory Demo` → Tab 1: *The Memory Learning Curve* | Active card: *Interaction 5 (Emerging)*, bank badge `feedbackmind-lc-cp5`, 22 memory units | Demonstrates emerging pattern recognition across 3 distinct friction clusters |
| **07** | **Learning Curve: Checkpoint 20** | Sidebar → `Memory Demo` → Tab 1: *The Memory Learning Curve* | Active card: *Interaction 20 (Mastery)*, bank badge `feedbackmind-lc-cp20`, 33 recalled units | Highlights longitudinal timeline synthesis across 3 releases (v2.3, v2.4, v2.5) |
| **08** | **Evidence Inspector Modal** | Sidebar → `Memory Demo` → Click *Inspect* on `LC-001` or `LC-012` | Modal displaying verbatim customer quote, diagnosed problem, suggested action, and bank status | Demonstrates granular data traceability down to atomic customer quotes |

---

## 2. Detailed Capture Instructions

### Screenshot 01: Executive Dashboard Overview
1. Open browser at `http://localhost:5173`.
2. Click **Dashboard Overview** in the left sidebar.
3. Ensure the active workspace is `demo-company`.
4. Verify the 4 KPI cards display:
   - **Total Feedback:** 27 records
   - **Average Rating:** ~3.6 / 5.0
   - **Analyzed Records:** 100% (27/27)
   - **Memory Status:** `feedbackmind-demo` Connected
5. Capture a full desktop viewport (recommended resolution: 1440x900 or 1920x1080) in both Dark and Light themes.

---

### Screenshot 02: Ask FeedbackMind AI (Chat Interface)
1. Navigate to **Ask FeedbackMind AI** in the sidebar.
2. Click the suggested prompt: *"Has dashboard performance improved over time?"* or submit a question.
3. Await the streaming response from Groq Cloud.
4. Capture the chat message bubble showing:
   - The user query bubble.
   - The AI assistant response formatted in clean markdown.
   - The emerald badge: `Retrieved from Hindsight Memory Bank: feedbackmind-demo`.
   - The expandable **Cited Evidence** list showing records `FB-001`, `FB-012`, etc.

---

### Screenshot 03: Memory Centre
1. Navigate to **Memory Centre** in the sidebar.
2. Verify the top banner displays:
   - Memory Bank: `feedbackmind-demo`
   - Active Profile: `FeedbackMind Demo` (skepticism: 2, literalism: 4, empathy: 4)
3. Ensure the three architectural cards (*Retain*, *Recall*, *Reflect*) are visible.
4. Scroll to view the **Retained Memories Explorer** showing individual cloud-indexed cards with timestamp tags and rating stars.
5. Capture viewport highlighting the bank overview and retained units.

---

### Screenshot 04: Memory ON vs. OFF Benchmark (Main Workspace Demo)
1. Navigate to **Memory Demo** in the sidebar.
2. Select the sub-navigation tab: **Side-by-Side Comparison (ON vs. OFF)**.
3. Verify the demonstration context:
   - **Target Bank:** `feedbackmind-demo` (Main workspace tenant: `demo-company`, 27 SQLite records)
   - *Note: This is the primary workspace demo, distinct from the staged Learning Curve demonstration on Tab 1.*
4. Observe the pre-loaded query: *"Has dashboard performance improved over time?"*.
5. Ensure both comparison columns are populated:
   - **Left Column (Memory OFF):** Amber badge `Memory OFF: Local Amnesia`, 0 Hindsight calls, flat database records only.
   - **Right Column (Memory ON):** Emerald badge `Memory ON: Persistent Memory`, **31 historical memories recalled** from `feedbackmind-demo`, grounded citations, longitudinal synthesis connecting Redis caching release to load time dropping to 1.8s.
6. Capture a wide viewport showing both columns side-by-side to highlight the visual and cognitive contrast.

---

### Screenshot 05, 06, 07: Learning Curve Checkpoints (1, 5, 20)
1. Navigate to **Memory Demo** in the sidebar.
2. Select the sub-navigation tab: **The Memory Learning Curve (1, 5, 20)**.
3. Note the top header badge: *"Synthetic Demonstration Scenario (Aug 1 – Nov 6, 2026)"*.
4. **Capture Checkpoint 1 (Screenshot 05):**
   - Click the **Interaction 1** card.
   - Verify badge displays: `Bank: feedbackmind-lc-cp1` | `Retained: 1` | `Recalled: 6`.
   - Capture the synthesis showing explicit acknowledgement that only `LC-001` exists and no resolutions are confirmed.
5. **Capture Checkpoint 5 (Screenshot 06):**
   - Click the **Interaction 5** card.
   - Verify badge displays: `Bank: feedbackmind-lc-cp5` | `Retained: 5` | `Recalled: 22`.
   - Capture the synthesis showing the three problem clusters (latency, CSV, OAuth) and noting zero confirmed fixes.
6. **Capture Checkpoint 20 (Screenshot 07):**
   - Click the **Interaction 20** card.
   - Verify badge displays: `Bank: feedbackmind-lc-cp20` | `Retained: 20` | `Recalled: 33`.
   - Capture the synthesis detailing the 3 confirmed releases (v2.3, v2.4, v2.5) and the 24-hour export link priority.

---

### Screenshot 08: Evidence Inspector Modal
1. On the Learning Curve tab, scroll down to the **Chronological Memory History Table**.
2. Locate record `LC-012` (*"Incredible improvement! The analytics dashboard now loads in under 1.8 seconds..."*).
3. Click the **Inspect** button in the action column.
4. Capture the open modal displaying:
   - Feedback ID: `LC-012`
   - Customer: `CUST-LC-01`
   - Date: `2026-10-02`
   - Rating: `5.0 ★` | Urgency: `low`
   - Full verbatim customer quote
   - Diagnosed problem: `null (Resolved)`
   - Suggested action: `Validate that Redis caching resolved CUST-LC-01 chronic latency`
   - Memory Bank tag: `Indexed in Hindsight Bank`

---

## 3. Image Optimization & Formatting Guidelines

- **File Formats:** PNG (lossless) for crisp typography and UI borders; WebP for embedded web articles.
- **DPI / Scaling:** Capture on standard 2x Retina display, scaled to 1200px width for article inclusion.
- **Theme Consistency:** Capture all primary screenshots in Dark Mode (the default theme), with 1–2 supplementary screenshots demonstrating Light Mode in the article to showcase multi-theme versatility.
- **Privacy Assurance:** All customer IDs (`CUST-LC-01`, etc.) and company names (`learning-curve-demo`) in the screenshots are synthetic demonstration data. No proprietary customer credentials or private API keys appear anywhere in the UI.

