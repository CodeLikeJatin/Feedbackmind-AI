const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch health`);
  return res.json();
}

export async function fetchDashboardStats(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/dashboard/stats?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch dashboard stats`);
  return res.json();
}

export async function fetchFeedbackList(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      query.set(k, v);
    }
  });
  const res = await fetch(`${API_BASE}/api/feedback?${query.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch feedback list`);
  return res.json();
}

export async function seedDemoFeedback(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/feedback/seed`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Confirm-Destructive': 'true'
    },
    body: JSON.stringify({ companyId, confirm: true })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to seed demo data`);
  return res.json();
}

export async function clearFeedbackData(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/feedback/clear?companyId=${encodeURIComponent(companyId)}&confirm=true`, {
    method: 'DELETE',
    headers: {
      'X-Confirm-Destructive': 'true'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to clear data`);
  return res.json();
}

export async function uploadFeedbackCsv(fileOrContent, companyId = 'demo-company') {
  let res;

  if (fileOrContent instanceof File) {
    const formData = new FormData();
    formData.append('file', fileOrContent);
    formData.append('companyId', companyId);

    res = await fetch(`${API_BASE}/api/feedback/upload`, {
      method: 'POST',
      body: formData
    });
  } else if (typeof fileOrContent === 'string') {
    res = await fetch(`${API_BASE}/api/feedback/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: fileOrContent, companyId })
    });
  } else {
    throw new Error('Unsupported payload for CSV upload. Expected File or CSV string.');
  }

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error || (data.errors && data.errors[0]?.reason) || `Upload failed with HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.details = data;
    throw err;
  }

  return data;
}

export async function fetchAnalysisStatus(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/analysis/status?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch analysis status`);
  return res.json();
}

export async function triggerBatchAnalysis(companyId = 'demo-company', limit = 10, model = getStoredModel()) {
  const res = await fetch(`${API_BASE}/api/analysis/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, limit, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Batch analysis failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function analyzeSingleRecord(id, model = getStoredModel()) {
  const res = await fetch(`${API_BASE}/api/analysis/analyze-record/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Record analysis failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function fetchMemoryOverview(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/memory/overview?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch memory overview`);
  return res.json();
}

export async function fetchMemoryList(companyId = 'demo-company', limit = 50) {
  const res = await fetch(`${API_BASE}/api/memory/list?companyId=${encodeURIComponent(companyId)}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch memory list`);
  return res.json();
}

export async function triggerRetainBatch(companyId = 'demo-company', limit = 50) {
  const res = await fetch(`${API_BASE}/api/memory/retain-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, limit })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Retain batch failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function performMemoryRecall(query, companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/memory/recall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, companyId })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Recall failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function performMemoryReflect(query, context = '', companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/memory/reflect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context, companyId })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Reflect failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

function getStoredModel() {
  try {
    return localStorage.getItem('feedbackmind_groq_model') || undefined;
  } catch {
    return undefined;
  }
}

export async function sendChatMessage({
  question,
  memoryEnabled = true,
  companyId = 'demo-company',
  sessionId = 'default-session',
  history = [],
  model = getStoredModel()
}) {
  const res = await fetch(`${API_BASE}/api/chat/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, memoryEnabled, companyId, sessionId, history, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Chat request failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function fetchChatHistory(companyId = 'demo-company', sessionId = 'default-session') {
  const res = await fetch(`${API_BASE}/api/chat/history?companyId=${encodeURIComponent(companyId)}&sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch chat history`);
  return res.json();
}

export async function clearChatHistory(companyId = 'demo-company', sessionId = 'default-session') {
  const res = await fetch(`${API_BASE}/api/chat/history`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, sessionId })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to clear chat history`);
  return res.json();
}

export async function fetchTrendsOverview(companyId = 'demo-company', memoryEnabled = true) {
  const res = await fetch(`${API_BASE}/api/trends/overview?companyId=${encodeURIComponent(companyId)}&memoryEnabled=${Boolean(memoryEnabled)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch trend analytics`);
  return res.json();
}

export async function fetchProductRecommendations(companyId = 'demo-company', memoryEnabled = true) {
  const res = await fetch(`${API_BASE}/api/trends/recommendations?companyId=${encodeURIComponent(companyId)}&memoryEnabled=${Boolean(memoryEnabled)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch product recommendations`);
  return res.json();
}

export async function fetchDemoStatus(companyId = 'demo-company') {
  const res = await fetch(`${API_BASE}/api/demo/status?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch demo status`);
  return res.json();
}

export async function queryDemoMode({ question, companyId = 'demo-company', memoryEnabled = true, model = getStoredModel() }) {
  const res = await fetch(`${API_BASE}/api/demo/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, companyId, memoryEnabled, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Demo query failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function compareDemoModes({ question, companyId = 'demo-company', model = getStoredModel() }) {
  const res = await fetch(`${API_BASE}/api/demo/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, companyId, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Demo comparison failed with HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function fetchLearningCurveStatus() {
  const res = await fetch(`${API_BASE}/api/learning-curve/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch learning curve status`);
  return res.json();
}

export async function fetchLearningCurveCheckpoints() {
  const res = await fetch(`${API_BASE}/api/learning-curve/checkpoints`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch learning curve checkpoints`);
  return res.json();
}

export async function fetchLearningCurveInteractions() {
  const res = await fetch(`${API_BASE}/api/learning-curve/interactions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch learning curve interactions`);
  return res.json();
}

export async function initializeLearningCurve(force = false, model = getStoredModel()) {
  const res = await fetch(`${API_BASE}/api/learning-curve/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Failed to initialize learning curve`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function runLearningCurveBenchmark({ question, model = getStoredModel() } = {}) {
  const res = await fetch(`${API_BASE}/api/learning-curve/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, model })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Failed to run learning curve benchmark`);
    err.details = data;
    throw err;
  }
  return data;
}

export async function resetLearningCurveEnvironment() {
  const res = await fetch(`${API_BASE}/api/learning-curve/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Failed to reset learning curve environment`);
    err.details = data;
    throw err;
  }
  return data;
}
