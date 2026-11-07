# Video Storyboard — FeedbackMind AI Demo Video

> **Project:** FeedbackMind AI — User Feedback Synthesizer  
> **Phase:** Phase 8.6 (Demo Video Preparation)  
> **Target Video Duration:** 4 minutes 30 seconds (270 seconds)  
> **Format:** 1080p Screen Recording with English Voiceover Narration  
> **Destination:** YouTube Public Video  
> **Audience:** Hackathon judges, developers, SaaS founders, and product managers  
> **Strict Authenticity Rule:** All shown features, queries, and outputs are 100% genuine live application functionality. Zero mocked text, zero fabricated memory counts.

---

## 1. Master Storyboard Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   VIDEO TIMELINE (0:00 – 4:30)                                  │
├─────────┬──────────────────────────────┬──────────┬─────────────────────────────┬───────────────┤
│ Scene # │ Scene Title                  │ Timing   │ Duration                    │ Target View   │
├─────────┼──────────────────────────────┼──────────┼─────────────────────────────┼───────────────┤
│ Scene 1 │ The Problem: LLM Amnesia     │ 0:00–0:25│ 25s                         │ Title / Intro │
│ Scene 2 │ Introducing FeedbackMind AI  │ 0:25–1:00│ 35s                         │ Overview      │
│ Scene 3 │ Ask FeedbackMind AI (Chat)   │ 1:00–1:40│ 40s                         │ Chat Interface│
│ Scene 4 │ Memory ON vs. Memory OFF     │ 1:40–2:25│ 45s                         │ Side-by-Side  │
│ Scene 5 │ Memory Centre & Architecture │ 2:25–3:00│ 35s                         │ Memory Centre │
│ Scene 6 │ The Memory Learning Curve    │ 3:00–4:05│ 65s                         │ Learning Curve│
│ Scene 7 │ Conclusion & Technology      │ 4:05–4:30│ 25s                         │ Summary Card  │
└─────────┴──────────────────────────────┴──────────┴─────────────────────────────┴───────────────┘
```

---

## 2. Detailed Scene-by-Scene Storyboard

### Scene 1: The Problem — Stateless LLMs & Customer Feedback Amnesia
- **Time:** `0:00 – 0:25` (25 seconds)
- **Visual Framing:** High-impact opening title card or conceptual diagram illustrating customer feedback streams flowing into traditional LLM prompts.
- **On-Screen Text:**  
  *FeedbackMind AI: Long-Term Episodic Memory for Customer Intelligence*  
  *The Dilemma: Why Stateless LLMs Suffer from Localized Feedback Amnesia*
- **Action:** Subtly zoom in on the diagram showing context window loss between sessions.
- **Narrative Focus:** SaaS teams receive feedback continuously across Zendesk, Intercom, G2, and email. But traditional LLMs treat every query as day zero—they cannot remember past investigations, software releases, or whether a reported bug was fixed weeks ago.
- **Evidence Anchor:** Frames the core thesis: AI needs persistent, episodic memory to reason over multi-month product lifecycles.

---

### Scene 2: Introducing FeedbackMind AI & The Executive Dashboard
- **Time:** `0:25 – 1:00` (35 seconds)
- **Visual Framing:** Smooth cut to the live application running in browser (`http://localhost:5173`). Dark Mode active.
- **Route:** `Sidebar → Dashboard Overview`
- **UI Elements Highlighted:**
  1. Header with live pulsing emerald badge: `AI Engine Ready • Groq gpt-oss-120b`.
  2. Four Top KPI Cards:
     - `Total Feedback`: 27 records
     - `Average Rating`: 3.6 / 5.0 ★
     - `Analyzed Records`: 100% (27/27)
     - `Memory Bank`: `feedbackmind-demo` Connected
  3. Interactive Recharts AreaChart showing sentiment trends from August to November 2026.
  4. PieChart topic breakdown (Performance, Export, Authentication, UI).
  5. Priority Issues list with urgency pills.
  6. Quick toggle demonstration of the theme switch (Dark → Light → Dark) in the top header.
- **Action:** Smooth mouse cursor sweep across the KPI cards, hover over the sentiment trajectory chart, and click the theme toggle once.
- **Narrative Focus:** Introduce FeedbackMind AI as a full-stack product intelligence platform built with React 19, Node.js native `node:sqlite`, Groq Cloud, and Hindsight Cloud.

---

### Scene 3: Ask FeedbackMind AI — Conversational Intelligence with Memory
- **Time:** `1:00 – 1:40` (40 seconds)
- **Visual Framing:** Full viewport capture of the Ask FeedbackMind AI chat workspace.
- **Route:** `Sidebar → Ask FeedbackMind AI`
- **UI Elements Highlighted:**
  1. Suggested prompt button: *"Has dashboard performance improved over time?"*.
  2. Real-time streaming response from Groq Cloud.
  3. Formatted markdown answer with bold release version headers.
  4. Emerald verification badge: `Retrieved from Hindsight Memory Bank: feedbackmind-demo`.
  5. Expandable **Cited Evidence** drawer showing actual records `FB-001` (morning dashboard slowness) and `FB-013` (noticeable dashboard speedup post-update).
- **Action:** Click the suggested prompt button. As the response completes, scroll smoothly down to highlight the Hindsight memory badge and expand the evidence drawer.
- **Narrative Focus:** Demonstrates that the AI doesn't merely summarize the current database snapshot—it recalls historical context from Hindsight, connecting the initial problem to the engineering patch and customer validation.

---

### Scene 4: Memory ON vs. Memory OFF — Side-by-Side Empirical Benchmark
- **Time:** `1:40 – 2:25` (45 seconds)
- **Visual Framing:** Wide side-by-side comparative split screen.
- **Route:** `Sidebar → Memory Demo → Tab 2: Side-by-Side Comparison (ON vs. OFF)`
- **UI Elements Highlighted:**
  1. Standardized query input: *"Has dashboard performance improved over time?"*.
  2. **Left Panel (Memory OFF):** Amber badge `Memory OFF: Local Amnesia` (0 Hindsight calls). Explains that without memory, the model lacks historical release context and flags past problems as unresolved.
  3. **Right Panel (Memory ON):** Emerald badge `Memory ON: Persistent Memory` (**31 historical memories recalled** from `feedbackmind-demo`). Synthesizes release v2.4 caching and verifies that latency dropped from 16s to 1.8s.
  4. **Hindsight Value Analysis Card:** Shows objective automated comparison score and evidence parity breakdown.
- **Action:** Click the **Run Side-by-Side Comparison** button. Allow the live API to populate both panels. Point cursor to the 0 calls vs. 31 memories recalled badges.
- **Narrative Focus:** This is the core empirical proof. Demonstrates the difference between stateless amnesia and persistent episodic memory.

---

### Scene 5: Memory Centre & Hindsight Architecture
- **Time:** `2:25 – 3:00` (35 seconds)
- **Visual Framing:** Clean technical walkthrough of the cognitive memory backend.
- **Route:** `Sidebar → Memory Centre`
- **UI Elements Highlighted:**
  1. Active Bank Profile Card: `FeedbackMind Demo` (`feedbackmind-demo`), showing disposition settings (skepticism: 2, literalism: 4, empathy: 4).
  2. The Three Cognitive Pillars:
     - **Retain:** Ingesting and decomposing feedback into atomic units.
     - **Recall:** Semantic search retrieving multi-month context.
     - **Reflect:** Synthesizing high-level patterns across the memory graph.
  3. **Retained Memories Explorer:** Scroll through indexed customer memories showing entity chips (`"database"`, `"Redis"`, `"CSV"`) and timestamp tags.
- **Action:** Scroll through the Retained Memories list, hovering over an entity chip.
- **Narrative Focus:** Demystify how Hindsight works. It does not simply store text—its cognitive graph worker decomposes raw customer feedback into atomic observations, temporal entities, and actionable world facts.

---

### Scene 6: The Memory Learning Curve — 1, 5, and 20 Interactions
- **Time:** `3:00 – 4:05` (65 seconds)
- **Visual Framing:** Interactive demonstration of progressive learning across interaction milestones.
- **Route:** `Sidebar → Memory Demo → Tab 1: The Memory Learning Curve (1, 5, 20)`
- **UI Elements Highlighted:**
  1. Header Badge: `Synthetic Demonstration Scenario (Aug 1 – Nov 6, 2026)`.
  2. **Checkpoint 1 Card (`Interaction 1`):**
     - Bank: `feedbackmind-lc-cp1` | Retained: 1 | Recalled: 6 memory units.
     - Point out explicit uncertainty: refuses to hallucinate patterns or unverified fixes.
  3. **Checkpoint 2 switch (`Interaction 5`):**
     - Click Interaction 5 card.
     - Bank: `feedbackmind-lc-cp5` | Retained: 5 | Recalled: 22 memory units.
     - Point out 3 friction clusters: latency, CSV timeouts, OAuth lockouts.
  4. **Checkpoint 3 switch (`Interaction 20`):**
     - Click Interaction 20 card.
     - Bank: `feedbackmind-lc-cp20` | Retained: 20 | Recalled: 33 memory units.
     - Highlights full 4-month timeline across 3 releases (v2.3, v2.4, v2.5) and pinpoints remaining polish (extending 15-minute export link expiry to 24 hours).
  5. **Inspect Action:** Click **Inspect** on record `LC-012` in the table below to open the modal showing verbatim quote and diagnosis.
- **Action:** Sequentially click each of the three checkpoint cards (1 → 5 → 20) with 10–12 seconds on each card to show the synthesis text evolving. Click the Inspect button on `LC-012`.
- **Narrative Focus:** Demonstrates cumulative cognitive expansion. The AI learns without retraining or fine-tuning, expanding its reasoning as more episodic memory is retained.

---

### Scene 7: Conclusion & Technology Stack
- **Time:** `4:05 – 4:30` (25 seconds)
- **Visual Framing:** Return to the Executive Dashboard Overview or clean architectural closing slide.
- **On-Screen Text:**  
  *FeedbackMind AI: Built with React 19, Node.js native SQLite, Groq Cloud & Hindsight Cloud*  
  *Stop Relitigating Past Bugs. Give Your AI Long-Term Memory.*
- **Action:** Smooth final pan across the dashboard, then fade out.
- **Narrative Focus:** Wrap up the demonstration. Emphasize that episodic memory allows product teams to stop solving the same issues twice and focus on what customers truly need.

---

## 3. Visual & Audio Pacing Checklist

| Metric | Target Specification |
|:---|:---|
| **Total Target Duration** | 270 seconds (4 minutes 30 seconds) |
| **Spoken Words Target** | ~580–620 words (130–140 words per minute pacing) |
| **Cursor Motion** | Smooth, deliberate cursor pacing (no erratic shaking or rapid clicking) |
| **Audio Quality** | Crisp cardioid microphone, clean room acoustics, no background hum |
| **Resolution** | 1920x1080 (16:9 widescreen), 60 FPS |
| **Theme Default** | Dark Theme for primary demo; brief 5s light mode toggle in Scene 2 |

