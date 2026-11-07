import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Brain, 
  Sparkles, 
  Zap, 
  Database, 
  Bot, 
  User, 
  CheckCircle2, 
  CornerDownLeft, 
  HelpCircle,
  Clock,
  Trash2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Layers
} from 'lucide-react';
import { sendChatMessage, fetchChatHistory, clearChatHistory, getSession, initDemoSession } from '../../services/api';

const SUGGESTED_QUESTIONS = [
  "What are our biggest customer complaints?",
  "What are customers saying about dashboard performance?",
  "Which features are requested most often?",
  "What are the most urgent problems?",
  "What should our product team fix first?",
  "Are login problems increasing?"
];

export default function AskFeedbackMind({ 
  memoryEnabled, 
  onToggleMemory,
  prefilledQuestion = '',
  companyId = 'demo-company'
}) {
  const [sessionId, setSessionId] = useState(() => {
    const s = getSession();
    return s?.sessionId || `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  });

  useEffect(() => {
    if (!getSession()) {
      initDemoSession().then(s => {
        if (s?.sessionId) setSessionId(s.sessionId);
      });
    }
  }, []);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am FeedbackMind AI. I continuously synthesize customer feedback and ground my answers in historical episodic context from Hindsight Cloud.\n\nAsk me about customer complaints, speed friction, login issues, or what your engineering team should prioritize next.",
      memoryUsed: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState(prefilledQuestion || '');
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (prefilledQuestion) {
      setInputValue(prefilledQuestion);
    }
  }, [prefilledQuestion]);

  // Load chat history from backend on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetchChatHistory(companyId, sessionId);
        if (res?.history && res.history.length > 0) {
          const loaded = [];
          res.history.forEach(item => {
            loaded.push({
              id: `hist-user-${item.id}`,
              sender: 'user',
              text: item.question,
              timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            loaded.push({
              id: `hist-ai-${item.id}`,
              sender: 'ai',
              text: item.answer,
              memoryUsed: item.memoryEnabled,
              evidence: item.evidence || [],
              timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          });
          setMessages(prev => [prev[0], ...loaded]);
        }
      } catch (err) {
        console.warn('Could not load chat history:', err.message);
      }
    }
    loadHistory();
  }, [companyId, sessionId]);

  const handleSend = async (questionToSend) => {
    const q = (questionToSend || inputValue).trim();
    if (!q || isTyping) return;

    setInputValue('');
    setChatError(null);

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        question: q,
        companyId,
        sessionId,
        memoryEnabled
      });

      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.answer,
        memoryUsed: response.memoryEnabled,
        recalledCount: response.recalledCount || 0,
        reflectionUsed: response.reflectionUsed || false,
        evidence: response.evidence || [],
        modelUsed: response.modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        isError: true,
        text: `Error generating response: ${err.message || 'Please check that backend and Groq are reachable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear current chat conversation?')) return;
    try {
      await clearChatHistory(companyId, sessionId);
    } catch (err) {
      console.warn('Failed to clear server history:', err);
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: "Conversation cleared. Ask any new question about customer complaints, feature requests, or product performance.",
        memoryUsed: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatError(null);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-2xs">
      {/* Top chat bar */}
      <div className="p-4 border-b border-surface-border bg-slate-50 dark:bg-surface/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Ask FeedbackMind AI
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                AI Assistant • Groq AI Engine
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Conversational feedback intelligence with long-term memory</p>
          </div>
        </div>

        {/* Controls: Clear Chat & Memory Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            title="Clear Chat Conversation"
            className="p-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-surface-border transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="Clear chat conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={onToggleMemory}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent ${
              memoryEnabled
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border border-purple-500'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 dark:bg-surface dark:border-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory {memoryEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div 
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'ai' && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                m.isError 
                  ? 'bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400' 
                  : 'bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-brand-primary'
              }`}>
                {m.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
              m.sender === 'user'
                ? 'bg-gradient-to-r from-brand-primary to-indigo-600 text-white rounded-tr-none shadow-xs'
                : m.isError
                  ? 'bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-700/40 dark:text-rose-200 rounded-tl-none shadow-2xs'
                  : 'bg-white dark:bg-surface/90 border border-slate-200 dark:border-surface-border text-slate-800 dark:text-slate-200 rounded-tl-none shadow-2xs'
            }`}>
              {/* Header badge for AI response */}
              {m.sender === 'ai' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-surface-border/60 text-[10px] font-mono">
                  {m.memoryUsed ? (
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                      <Brain className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Hindsight Cloud Memory Grounded {m.recalledCount ? `(${m.recalledCount} memories retrieved)` : ''}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                      <span>Memory OFF: Immediate Dataset Scope</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.modelUsed && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-600 dark:text-slate-400 font-mono text-[9px]">
                        {m.modelUsed}
                      </span>
                    )}
                    {m.reflectionUsed && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                        Reflective Synthesis
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Message text */}
              <div className="whitespace-pre-line leading-relaxed space-y-2">
                {m.text}
              </div>

              {/* Evidence cards */}
              {m.evidence && m.evidence.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-surface-border/60 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                    <Database className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    Cited Customer Feedback Evidence ({m.evidence.length}):
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {m.evidence.map((ev, i) => (
                      <div 
                        key={i} 
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface/70 border border-slate-200 dark:border-surface-border/80 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-semibold text-brand-primary">
                              {ev.feedback_id || ev.memory_id || `Citation #${i + 1}`}
                            </span>
                            {ev.customer_id && (
                              <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                                • {ev.customer_id}
                              </span>
                            )}
                            {ev.topic && (
                              <span className="px-1.5 py-0.2 rounded bg-white dark:bg-surface border border-slate-200 dark:border-surface-border text-[9px] text-slate-700 dark:text-slate-300 capitalize">
                                {ev.topic}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {ev.rating && (
                              <span className="text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                                ★ {ev.rating}/5
                              </span>
                            )}
                            {ev.date && (
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono">
                                {ev.date}
                              </span>
                            )}
                          </div>
                        </div>

                        {ev.feedback_snippet && (
                          <p className="text-slate-700 dark:text-slate-300 italic text-[11px] line-clamp-2">
                            "{ev.feedback_snippet}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className={`text-[10px] mt-2 font-mono flex items-center justify-end gap-1 ${
                m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {m.timestamp}
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border flex items-center justify-center text-brand-primary shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-surface/90 border border-slate-200 dark:border-surface-border text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2.5 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-brand-primary animate-spin" />
              <span>Synthesizing customer intelligence with memory context...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts carousel */}
      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-surface-border/60 bg-slate-50/80 dark:bg-surface/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 shrink-0">Suggested:</span>
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            disabled={isTyping}
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-surface-card hover:bg-slate-100 dark:hover:bg-surface-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-surface-border/80 text-[11px] whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 dark:border-surface-border bg-slate-50 dark:bg-surface/90 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={memoryEnabled ? "Ask anything... (Hindsight memory will provide multi-month context)" : "Ask a question... (Memory OFF: answers using only current query)"}
          className="flex-1 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
