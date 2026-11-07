import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import OverviewSection from './components/dashboard/OverviewSection';
import FeedbackInbox from './components/inbox/FeedbackInbox';
import AIInsightsSection from './components/insights/AIInsightsSection';
import TrendAnalysisSection from './components/trends/TrendAnalysisSection';
import AskFeedbackMind from './components/chat/AskFeedbackMind';
import MemoryCentreSection from './components/memory/MemoryCentreSection';
import MemoryDemoSection from './components/demo/MemoryDemoSection';
import SettingsSection from './components/settings/SettingsSection';
import EmptyState from './components/common/EmptyState';
import UploadModal from './components/common/UploadModal';
import Modal from './components/common/Modal';
import SentimentBadge from './components/common/SentimentBadge';
import UrgencyBadge from './components/common/UrgencyBadge';
import { 
  fetchDashboardStats, 
  fetchFeedbackList, 
  seedDemoFeedback, 
  clearFeedbackData 
} from './services/api';
import { Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';

const SECTION_TITLES = {
  overview: 'Dashboard Overview',
  inbox: 'Customer Feedback Inbox',
  insights: 'AI Synthesized Insights',
  trends: 'Longitudinal Trend Analysis',
  chat: 'Ask FeedbackMind AI',
  memory: 'Hindsight Memory Centre',
  demo: 'Memory ON/OFF Demonstration',
  settings: 'System & Integration Settings'
};

function AppContent() {
  const [currentSection, setCurrentSection] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  // Data states
  const [stats, setStats] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Modals & Chat interactions
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFeedbackModal, setSelectedFeedbackModal] = useState(null);
  const [chatPrefilledQuestion, setChatPrefilledQuestion] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsData, feedbackData] = await Promise.all([
        fetchDashboardStats('demo-company'),
        fetchFeedbackList({ companyId: 'demo-company', limit: 50 })
      ]);
      setStats(statsData);
      setFeedbackItems(feedbackData.items || []);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await seedDemoFeedback('demo-company');
      await loadData(true);
    } catch (err) {
      alert(`Failed to seed data: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Clear all feedback records from workspace storage? This allows testing empty-state screens.')) {
      return;
    }
    setIsClearing(true);
    try {
      await clearFeedbackData('demo-company');
      await loadData(true);
    } catch (err) {
      alert(`Failed to clear data: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleAskAiAboutTopic = (question) => {
    setChatPrefilledQuestion(question);
    setCurrentSection('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex overflow-x-hidden selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Sidebar navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        totalFeedback={stats?.total || 0}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main layout container with responsive margin */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Sticky Header */}
        <Header
          currentSectionTitle={SECTION_TITLES[currentSection] || 'FeedbackMind AI'}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isRefreshing={isRefreshing}
          onRefresh={() => loadData(true)}
          memoryEnabled={memoryEnabled}
          onToggleMemory={() => setMemoryEnabled(!memoryEnabled)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Loading state skeleton */}
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-28 bg-surface-card rounded-2xl border border-surface-border" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-28 bg-surface-card rounded-2xl border border-surface-border" />
                ))}
              </div>
              <div className="h-80 bg-surface-card rounded-2xl border border-surface-border" />
            </div>
          )}

          {/* Error Banner */}
          {!loading && error && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <strong className="text-white block font-semibold">Backend Connection Issue</strong>
                  <span>{error}</span>
                </div>
              </div>
              <button
                onClick={() => loadData(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white font-medium shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Active Section Views */}
          {!loading && !error && (
            <>
              {/* 1. Overview Section */}
              {currentSection === 'overview' && (
                stats?.total === 0 ? (
                  <EmptyState
                    onSeedDemo={handleSeedDemo}
                    onOpenUpload={() => setIsUploadModalOpen(true)}
                    isSeeding={isSeeding}
                  />
                ) : (
                  <OverviewSection
                    stats={stats}
                    onNavigateToInbox={() => setCurrentSection('inbox')}
                    onSelectFeedback={(item) => setSelectedFeedbackModal(item)}
                    onSeedDemoData={handleSeedDemo}
                    onAskAi={handleAskAiAboutTopic}
                  />
                )
              )}

              {/* 2. Feedback Inbox */}
              {currentSection === 'inbox' && (
                stats?.total === 0 ? (
                  <EmptyState
                    onSeedDemo={handleSeedDemo}
                    onOpenUpload={() => setIsUploadModalOpen(true)}
                    isSeeding={isSeeding}
                  />
                ) : (
                  <FeedbackInbox
                    items={feedbackItems}
                    onRefresh={() => loadData(true)}
                    onSeedDemo={handleSeedDemo}
                    onOpenUpload={() => setIsUploadModalOpen(true)}
                  />
                )
              )}

              {/* 3. AI Insights */}
              {currentSection === 'insights' && (
                <AIInsightsSection
                  stats={stats}
                  memoryEnabled={memoryEnabled}
                  onAskAi={handleAskAiAboutTopic}
                  onNavigateToInbox={() => setCurrentSection('inbox')}
                />
              )}

              {/* 4. Trend Analysis */}
              {currentSection === 'trends' && (
                <TrendAnalysisSection 
                  stats={stats} 
                  memoryEnabled={memoryEnabled}
                  onAskAi={handleAskAiAboutTopic}
                  onSelectFeedback={(item) => setSelectedFeedbackModal(item)}
                />
              )}

              {/* 5. Ask FeedbackMind Chat */}
              {currentSection === 'chat' && (
                <AskFeedbackMind
                  memoryEnabled={memoryEnabled}
                  onToggleMemory={() => setMemoryEnabled(!memoryEnabled)}
                  prefilledQuestion={chatPrefilledQuestion}
                />
              )}

              {/* 6. Memory Centre */}
              {currentSection === 'memory' && (
                <MemoryCentreSection
                  memoryEnabled={memoryEnabled}
                  onToggleMemory={() => setMemoryEnabled(!memoryEnabled)}
                  feedbackItems={feedbackItems}
                />
              )}

              {/* 7. Memory Demo (Empirical Capability Showcase) */}
              {currentSection === 'demo' && (
                <MemoryDemoSection
                  memoryEnabled={memoryEnabled}
                  onToggleMemory={() => setMemoryEnabled(!memoryEnabled)}
                  onSelectFeedback={(item) => setSelectedFeedbackModal(item)}
                />
              )}

              {/* 8. Settings */}
              {currentSection === 'settings' && (
                <SettingsSection
                  onSeedDemo={handleSeedDemo}
                  onClearData={handleClearData}
                  isClearing={isClearing}
                  isSeeding={isSeeding}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* CSV Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          loadData(true);
          setCurrentSection('inbox');
        }}
      />

      {/* Quick feedback inspector modal (from Overview recent activity) */}
      <Modal
        isOpen={Boolean(selectedFeedbackModal)}
        onClose={() => setSelectedFeedbackModal(null)}
        title={selectedFeedbackModal ? `Customer Record — ${selectedFeedbackModal.feedback_id}` : ''}
      >
        {selectedFeedbackModal && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface/70 border border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase block">Customer</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedFeedbackModal.customer_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase block">Date</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 mt-0.5 block">{selectedFeedbackModal.date}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase block">Source</span>
                <span className="text-slate-700 dark:text-slate-200 mt-0.5 block">{selectedFeedbackModal.source}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase block">Rating</span>
                <span className="font-semibold text-amber-500 dark:text-amber-400 mt-0.5 block">★ {selectedFeedbackModal.rating}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface/40 border border-surface-border">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">Customer Quote</span>
              <p className="text-sm italic text-slate-800 dark:text-slate-200">"{selectedFeedbackModal.feedback}"</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-card border border-brand-primary/30 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <span className="text-xs font-semibold text-brand-primary flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Groq Synthesis
                </span>
                <div className="flex items-center gap-1.5">
                  <SentimentBadge sentiment={selectedFeedbackModal.sentiment} size="xs" />
                  <UrgencyBadge urgency={selectedFeedbackModal.urgency} size="xs" />
                </div>
              </div>
              {selectedFeedbackModal.summary && (
                <p className="text-xs text-slate-700 dark:text-slate-200">{selectedFeedbackModal.summary}</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
