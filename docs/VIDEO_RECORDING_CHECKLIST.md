# Video Recording Readiness Checklist — FeedbackMind AI

> **Project:** FeedbackMind AI — User Feedback Synthesizer  
> **Phase:** Phase 8.6.1 (Final Video Recording Readiness Check)  
> **Status:** **100% READY FOR RECORDING**  
> **Date:** November 7, 2026  
> **Target Video Length:** 4 minutes 30 seconds (270 seconds)  
> **Destination:** YouTube Public Product Demonstration  

---

## 1. Technical Pre-Flight System Verification

| Item | Expected Configuration | Verified Live Value | Status |
|:---|:---|:---|:---:|
| **Frontend Dev Server** | `http://localhost:5173` | Responding HTTP 200 OK | **READY** |
| **Backend API Server** | `http://localhost:5001` | Responding `{"status":"ok", ...}` | **READY** |
| **Main Dataset (`demo-company`)** | Exactly 27 records in SQLite | 27 records intact (`PRAGMA integrity_check: ok`) | **READY** |
| **Main Memory Bank** | `feedbackmind-demo` | 31 memories recalled on benchmark query | **READY** |
| **Learning Curve Bank CP1** | `feedbackmind-lc-cp1` | 1 record retained, 6 units stored & recalled | **READY** |
| **Learning Curve Bank CP5** | `feedbackmind-lc-cp5` | 5 records retained, 22 units stored & recalled | **READY** |
| **Learning Curve Bank CP20** | `feedbackmind-lc-cp20` | 20 records retained, 33 units recalled | **READY** |
| **Instant CP Retrieval** | Zero Hindsight API calls on click | Pre-computed in SQLite `learning_curve_checkpoints` | **READY** |
| **Secret Isolation** | Zero API keys exposed in UI | Masked (`••••••••••••`) in Settings; `.env` only | **READY** |

---

## 2. Evidence Grounding & Record Discrepancy Resolution

| Demonstration Track | Target Workspace | Original Complaint Record | Speedup / Fix Validation Record | Verification Status |
|:---|:---|:---|:---|:---:|
| **Main Workspace Demo** (Scenes 2–4) | `demo-company` (27 records, Bank `feedbackmind-demo`) | **`FB-001`** (2026-10-01, 2★): *"takes too long to load, especially in the morning"* | **`FB-013`** (2026-10-13, 5★): *"The latest update made the dashboard noticeably faster for our team."* | **VERIFIED (FB-013 resolved)** |
| **Learning Curve Demo** (Scene 6) | `learning-curve-demo` (20 records, Bank `feedbackmind-lc-cp20`) | **`LC-001`** (2026-08-01, 1★): *"takes over 16 seconds to load every morning"* | **`LC-012`** (2026-10-02, 5★): *"dashboard now loads in under 1.8 seconds this morning... 16+s to instantaneous"* | **VERIFIED (LC-012 resolved)** |

> **Note on FB-012:** `FB-012` is a 4★ request for Two-Factor Authentication (`CUST-012`, 2026-10-12). All script references to performance citations have been strictly verified to cite **`FB-013`** for the main demo and **`LC-012`** for the learning curve.

---

## 3. Display & Recording Environment Checklist

- [ ] **Resolution:** Set display scaling or recording canvas to **1920 x 1080** (1080p Full HD).
- [ ] **Browser Window:** Maximize browser window (no desktop background visible).
- [ ] **Browser Zoom:** Ensure zoom is at **100%** (press `Cmd + 0`).
- [ ] **Clean UI:** Hide browser bookmarks bar (`Cmd + Shift + B`) and extensions.
- [ ] **No Developer Tools:** Keep Chrome DevTools closed during recording.
- [ ] **Notifications:** Enable macOS Focus mode / Do Not Disturb to suppress alerts.
- [ ] **Default Theme:** Start in Dark Mode (the default theme); perform the theme toggle in Scene 2.
- [ ] **Microphone Levels:** Test audio to peak between **-6 dB and -12 dB**; ensure pop filter is in place.

---

## 4. Scene-by-Scene Rehearsal Checklist

### Scene 1: The Problem (0:00 – 0:25)
- [ ] Display title card: *"FeedbackMind AI: Solving LLM Amnesia with Hindsight Persistent Memory"*.
- [ ] Deliver voiceover (~72 words, ~19s spoken, 6s transition pause).

### Scene 2: Introducing FeedbackMind AI (0:25 – 1:00)
- [ ] Open `http://localhost:5173` on **Dashboard Overview**.
- [ ] Hover over header badge `AI Engine Ready` (live pulsing dot).
- [ ] Sweep cursor across the 4 KPI cards: 27 records, 3.6★, 100%, `feedbackmind-demo` Connected.
- [ ] Click theme toggle icon in header: show Light Mode for 3 seconds, then toggle back to Dark Mode.

### Scene 3: Ask FeedbackMind AI (1:00 – 1:40)
- [ ] Navigate to **Ask FeedbackMind AI** in sidebar.
- [ ] Click suggested prompt button: *"Has dashboard performance improved over time?"*.
- [ ] Allow live response to stream in (~3s).
- [ ] Highlight emerald badge: `Retrieved from Hindsight Memory Bank: feedbackmind-demo`.
- [ ] Expand **Cited Evidence** drawer showing records `FB-001` and `FB-013`.

### Scene 4: Memory ON vs. OFF Benchmark (1:40 – 2:25)
- [ ] Navigate to **Memory Demo** → Sub-tab **Side-by-Side Comparison (ON vs. OFF)**.
- [ ] Click **Run Side-by-Side Comparison** button.
- [ ] Point to Left Panel (amber badge: *Memory OFF: Local Amnesia*, 0 calls).
- [ ] Point to Right Panel (emerald badge: *Memory ON: Persistent Memory*, 31 memories recalled).
- [ ] Scroll down to show the **Hindsight Value Analysis** card.

### Scene 5: Memory Centre & Architecture (2:25 – 3:00)
- [ ] Navigate to **Memory Centre** in sidebar.
- [ ] Point cursor to bank card: `FeedbackMind Demo` (`feedbackmind-demo`).
- [ ] Point out the 3 Pillars: Retain, Recall, Reflect.
- [ ] Scroll through Retained Memories Explorer showing indexed memory units with entity tags and ratings.

### Scene 6: The Memory Learning Curve (3:00 – 4:05)
- [ ] Navigate to **Memory Demo** → Sub-tab **The Memory Learning Curve (1, 5, 20)**.
- [ ] Point out badge: *"Synthetic Demonstration Scenario (Aug 1 – Nov 6, 2026)"*.
- [ ] **Click Interaction 1 Card:** Bank `feedbackmind-lc-cp1`, 6 units recalled, highlight unhallucinated uncertainty.
- [ ] **Click Interaction 5 Card:** Bank `feedbackmind-lc-cp5`, 22 units recalled, highlight 3 friction clusters.
- [ ] **Click Interaction 20 Card:** Bank `feedbackmind-lc-cp20`, 33 units recalled, highlight 4-month longitudinal timeline across releases v2.3, v2.4, and v2.5.
- [ ] Scroll down to table and click **Inspect** on record `LC-012` to show the verbatim quote modal (*"loads in under 1.8 seconds"*).

### Scene 7: Conclusion & Technology Stack (4:05 – 4:30)
- [ ] Close modal and return to Dashboard Overview.
- [ ] Deliver closing statement on stack (React 19, Node.js native `node:sqlite`, Groq Cloud, Hindsight Cloud).
- [ ] Fade out cleanly at 4:25–4:30.

---

## 5. YouTube Upload Metadata Preset

- **Title:** `FeedbackMind AI: How Hindsight Gives LLMs Long-Term Memory (Product Demo)`
- **Video Description:** Ready in `RECORDING_GUIDE.md` (complete with chapter markers and tags).
- **Video Format:** 1080p 60 FPS, MP4 (H.264), AAC stereo 320 kbps audio.

