import React from 'react';
import { Bot, Play, Loader2, Sparkles, CheckCircle2, LayoutDashboard, Brain } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'reasoning-paradigms' | 'gemini-chat' | 'agent-studio' | 'repo-workbench' | 'rca-engine' | 'reasoning' | 'diff' | 'bpe' | 'training' | 'exporter';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onRunAudit: () => void;
  isAuditing: boolean;
  issuesCount: number;
  activeLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRunAudit,
  isAuditing,
  issuesCount,
  activeLanguage,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* Zone 1: Brand title wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            Qwen Agent Studio
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Autonomous Code & Repo Reasoner
          </span>
        </div>
      </div>

      {/* Zone 2: Single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          {activeTab === 'dashboard' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('gemini-chat')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
            activeTab === 'gemini-chat' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini Chat</span>
          {activeTab === 'gemini-chat' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reasoning-paradigms')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
            activeTab === 'reasoning-paradigms' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>CoT · ToT · TreEvo</span>
          {activeTab === 'reasoning-paradigms' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('agent-studio')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'agent-studio' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Agent Studio
          {activeTab === 'agent-studio' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('repo-workbench')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'repo-workbench' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Repo Workbench
          {activeTab === 'repo-workbench' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('rca-engine')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'rca-engine' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          RCA Engine
          {activeTab === 'rca-engine' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reasoning')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
            activeTab === 'reasoning' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Reasoning Diagnostics
          {issuesCount > 0 && (
            <span className="text-[10px] text-amber-400 font-mono">({issuesCount})</span>
          )}
          {activeTab === 'reasoning' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'diff' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Diff & Patch
          {activeTab === 'diff' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('bpe')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'bpe' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          BPE Tokenizer
          {activeTab === 'bpe' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'training' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Model Training
          {activeTab === 'training' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('exporter')}
          className={`hover:text-white transition-colors whitespace-nowrap py-1 relative ${
            activeTab === 'exporter' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Python & Rust Runtimes
          {activeTab === 'exporter' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Target: {activeLanguage}</span>
          <span aria-hidden="true">·</span>
          <span>Qwen-QwQ CoT</span>
        </div>

        <button
          onClick={onRunAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Reasoning...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Agent Audit</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
