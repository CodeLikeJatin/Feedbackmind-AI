# Recording & Production Guide — FeedbackMind AI Demo Video

> **Project:** FeedbackMind AI — User Feedback Synthesizer  
> **Phase:** Phase 8.6 (Demo Video Preparation)  
> **Target Video Duration:** 4 minutes 30 seconds (270 seconds)  
> **Destination:** YouTube Public Video  
> **Tools Recommended:** OBS Studio, QuickTime Player, or Screen Studio for recording; DaVinci Resolve, Final Cut Pro, or Premiere for editing.

---

## 1. Technical Video & Audio Specifications

### Video Capture Settings
- **Canvas Resolution:** 1920 x 1080 (1080p Full HD)
- **Aspect Ratio:** 16:9 Widescreen
- **Frame Rate:** 60 FPS (or 30 FPS constant frame rate)
- **Format:** MP4 (H.264 video codec, high profile)
- **Bitrate:** 12,000–16,000 kbps (12–16 Mbps) for clean typography and sharp UI text
- **Browser Window:** Chrome / Brave / Safari window sized exactly to 1920x1080, Zoom level 100% (default `Cmd + 0`)
- **Theme:** Dark Mode (default application theme) with brief theme toggle switch in Scene 2

### Audio Capture Settings
- **Sample Rate:** 48.0 kHz, 24-bit (or 16-bit)
- **Codec:** AAC audio, 320 kbps stereo
- **Input Levels:** Peak voice between -6 dB and -12 dB (never clipping above -3 dB)
- **Noise Filtering:** Gentle noise gate (-45 dB threshold), subtle high-pass filter at 80 Hz to eliminate room rumble
- **Microphone Placement:** Cardioid condenser or dynamic broadcast mic, 4–6 inches from mouth with pop filter, angled toward mouth to avoid plosives

---

## 2. Pre-Flight Recording Checklist

Before hitting record, verify each item:

### System & Server Status
- [ ] Backend API Server running on port 5001:  
  Verify via `curl http://localhost:5001/api/health` -> `{"status":"ok", ...}`
- [ ] Frontend Vite Dev Server running on port 5173:  
  Verify via `curl http://localhost:5173` -> HTTP 200 OK
- [ ] Database Integrity:  
  Verify SQLite `backend/feedbackmind.sqlite`:
  - `demo-company`: exactly 27 records
  - `learning-curve-demo`: exactly 20 records (`LC-001` through `LC-020`)
  - `learning_curve_checkpoints`: 3 rows (`checkpoint-1`, `checkpoint-5`, `checkpoint-20`)
- [ ] Cloud Memory Banks verified:  
  - `feedbackmind-demo` (Main demo, 31 memories recalled)
  - `feedbackmind-lc-cp1` (Checkpoint 1, 6 units recalled)
  - `feedbackmind-lc-cp5` (Checkpoint 5, 22 units recalled)
  - `feedbackmind-lc-cp20` (Checkpoint 20, 33 units recalled)

### Environment & Clean Display
- [ ] Browser bookmarks bar hidden (`Cmd + Shift + B`)
- [ ] Browser extensions / devtools docked away or hidden
- [ ] System notifications silenced (Do Not Disturb / Focus mode enabled)
- [ ] Desktop clutter hidden
- [ ] Mouse cursor size set to standard or slightly enlarged (accessible cursor) with smooth acceleration

---

## 3. Step-by-Step Recording Choreography

Follow the exact cues from [VIDEO_SCRIPT.md](file:///Users/jatinsharma/Desktop/Feedback/VIDEO_SCRIPT.md) and [VIDEO_STORYBOARD.md](file:///Users/jatinsharma/Desktop/Feedback/VIDEO_STORYBOARD.md):

### Scene 1: The Problem (0:00 – 0:25)
1. Display the introductory title card or concept slide.
2. Read Scene 1 voiceover at a steady, engaging pace (~78 words in 25 seconds).
3. Smooth dissolve or cut to browser.

### Scene 2: Dashboard Overview (0:25 – 1:00)
1. Browser is at `http://localhost:5173` on **Dashboard Overview**.
2. Hover cursor over the top emerald badge: `AI Engine Ready`.
3. Sweep cursor across the 4 KPI cards: 27 records, 3.6★ rating, 100% analyzed, `feedbackmind-demo` Connected.
4. Hover gently over the AreaChart sentiment curve.
5. Click the Sun/Moon theme toggle in the header: show Light Mode for ~3 seconds, then toggle back to Dark Mode.

### Scene 3: Ask FeedbackMind AI (1:00 – 1:40)
1. In the sidebar, click **Ask FeedbackMind AI**.
2. Click the suggested prompt button: *"Has dashboard performance improved over time?"*.
3. Wait ~2–3 seconds for the live Groq streaming response to finish rendering.
4. Scroll down smoothly to show the markdown sections, the emerald Hindsight memory badge, and click the **Cited Evidence** drawer to expand records `FB-001` and `FB-012`.

### Scene 4: Memory ON vs. OFF Benchmark (1:40 – 2:25)
1. In the sidebar, click **Memory Demo**.
2. Select sub-tab **Side-by-Side Comparison (ON vs. OFF)**.
3. Click the **Run Side-by-Side Comparison** button.
4. Point cursor to the Left Panel (amber badge: *Memory OFF: Local Amnesia*, 0 calls).
5. Point cursor to the Right Panel (emerald badge: *Memory ON: Persistent Memory*, 31 memories recalled).
6. Scroll down to show the **Hindsight Value Analysis** card.

### Scene 5: Memory Centre (2:25 – 3:00)
1. In the sidebar, click **Memory Centre**.
2. Point cursor to the bank card: `FeedbackMind Demo` (`feedbackmind-demo`).
3. Scroll through the Retained Memories list, hovering over entity tags (`database caching`, `Redis`, `CSV`).

### Scene 6: The Memory Learning Curve (3:00 – 4:05)
1. In the sidebar, click **Memory Demo** → Sub-tab **The Memory Learning Curve (1, 5, 20)**.
2. Point out the top badge: *"Synthetic Demonstration Scenario (Aug 1 – Nov 6, 2026)"*.
3. **Click Interaction 1 Card:** Show bank `feedbackmind-lc-cp1`, 6 units recalled, highlight unhallucinated uncertainty.
4. **Click Interaction 5 Card:** Show bank `feedbackmind-lc-cp5`, 22 units recalled, highlight 3 friction clusters.
5. **Click Interaction 20 Card:** Show bank `feedbackmind-lc-cp20`, 33 units recalled, highlight 4-month timeline across v2.3, v2.4, v2.5.
6. Scroll down to the table and click **Inspect** on record `LC-012` to pop open the verbatim quote modal.

### Scene 7: Conclusion (4:05 – 4:30)
1. Close modal and return to Dashboard Overview.
2. Deliver closing statement on technology stack and value proposition.
3. Fade to black or closing slide.

---

## 4. Post-Production & YouTube Upload Metadata

### Recommended YouTube Upload Details

**Video Title:**
> FeedbackMind AI: How Hindsight Gives LLMs Long-Term Memory (Product Demo)

**Video Description:**
```text
A comprehensive demonstration of FeedbackMind AI—an intelligent customer feedback synthesizer built with React 19, Node.js, Groq Cloud, and Hindsight Cloud persistent episodic memory.

Traditional language models suffer from localized amnesia: they analyze feedback in isolation, forgetting past investigations, past release notes, and whether past customer complaints were already resolved.

FeedbackMind AI pairs high-speed inference with an episodic cognitive memory layer, enabling AI agents to retain, recall, and reflect across multi-month customer feedback lifecycles.

Chapters:
0:00 The Problem: Stateless LLMs & Customer Feedback Amnesia
0:25 Executive Dashboard Overview (React 19 & Tailwind CSS)
1:00 Ask FeedbackMind AI: Conversational Intelligence with Memory
1:40 Empirical Benchmark: Memory ON vs. Memory OFF
2:25 Memory Centre & The Hindsight Cognitive Architecture
3:00 The Memory Learning Curve: 1, 5, and 20 Interactions
4:05 Conclusion & Technology Stack

Learn more about Hindsight by Vectorize:
https://github.com/vectorize-io/hindsight

#ArtificialIntelligence #LLMs #SoftwareEngineering #ProductManagement #AIMemory
```

**Tags:**
`FeedbackMind AI, Hindsight, Vectorize, Groq, LLM Memory, AI Agents, Customer Feedback, SaaS Intelligence, Long-Term Memory, React 19`

