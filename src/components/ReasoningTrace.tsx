import React, { useState } from 'react';
import { AuditResult, CodeIssue } from '../types/agent';
import {
  BrainCircuit,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  GitCompare,
  Copy,
  Check,
  Sparkles,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

interface ReasoningTraceProps {
  auditResult: AuditResult | null;
  onNavigateToDiff: () => void;
  onSelectFile: (path: string) => void;
  onNavigateToWorkbench: () => void;
}

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({
  auditResult,
  onNavigateToDiff,
  onSelectFile,
  onNavigateToWorkbench,
}) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [copiedThinking, setCopiedThinking] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  if (!auditResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">
          No Reasoning Diagnostics Available Yet
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Run the autonomous Qwen agent from the top bar or repo workbench to analyze the codebase for memory safety, concurrency, syntax, and logic errors.
        </p>
        <button
          onClick={onNavigateToWorkbench}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
        >
          Open Repo Workbench
        </button>
      </div>
    );
  }

  const handleCopyThinking = () => {
    navigator.clipboard.writeText(auditResult.thinking);
    setCopiedThinking(true);
    setTimeout(() => setCopiedThinking(false), 2000);
  };

  const filteredIssues = auditResult.issues.filter((issue) => {
    if (severityFilter === 'all') return true;
    return issue.severity === severityFilter;
  });

  const criticalCount = auditResult.issues.filter((i) => i.severity === 'critical').length;
  const warningCount = auditResult.issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6 bg-slate-950">
      {/* Overview Card */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h1 className="text-base font-bold text-slate-100">
                Agent Reasoning & Diagnostic Audit
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Executed by <span className="text-slate-200 font-medium">{auditResult.agentUsed.name}</span> with{' '}
              <span className="text-indigo-400 font-mono">{auditResult.agentUsed.reasoningDepth}</span> chain of thought
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToDiff}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Inspect Unified Diffs</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {auditResult.summary}
        </p>

        <div className="flex items-center gap-4 text-xs font-mono pt-2 text-slate-400">
          <span className="text-rose-400 font-semibold">{criticalCount} Critical</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 font-semibold">{warningCount} Warnings</span>
          <span className="text-slate-600">·</span>
          <span>{auditResult.patchedFiles.length} Patches Ready</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{new Date(auditResult.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Chain-of-Thought (<think>) Viewer */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
        <div
          onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/60 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            {isThinkingExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              &lt;think&gt; Internal Chain-of-Thought Stream &lt;/think&gt;
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyThinking();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              {copiedThinking ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedThinking ? 'Copied' : 'Copy CoT'}</span>
            </button>
          </div>
        </div>

        {isThinkingExpanded && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
            {auditResult.thinking || 'No thinking trace captured.'}
          </div>
        )}
      </div>

      {/* Issues Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Isolated Invariant Defects ({filteredIssues.length})
          </h2>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(['all', 'critical', 'warning', 'info'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSeverityFilter(lvl)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                  severityFilter === lvl
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">No defects in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const isCritical = issue.severity === 'critical';
              const isWarning = issue.severity === 'warning';

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-rose-950/10 border-rose-500/30'
                      : isWarning
                      ? 'bg-amber-950/10 border-amber-500/30'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isCritical ? (
                          <AlertOctagon className="w-4 h-4 text-rose-400" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Info className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-100">
                            {issue.title}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-500">
                            [{issue.id}]
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400">
                          <button
                            onClick={() => {
                              onSelectFile(issue.file);
                              onNavigateToWorkbench();
                            }}
                            className="hover:text-indigo-400 underline flex items-center gap-1"
                          >
                            <FileCode className="w-3 h-3" />
                            <span>
                              {issue.file}:{issue.line}
                            </span>
                          </button>
                          <span>·</span>
                          <span className="text-rose-300 font-medium">{issue.ruleBroken}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onNavigateToDiff}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0 border border-slate-700"
                    >
                      View Fix
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold font-mono text-[11px] uppercase tracking-wider block">
                        Causal Mechanism & Explanation:
                      </span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">
                        {issue.explanation}
                      </p>
                    </div>

                    {issue.rootCause && (
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[11px] text-slate-300">
                        <span className="text-indigo-400 font-semibold">Root Cause: </span>
                        {issue.rootCause}
                      </div>
                    )}

                    <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20 font-mono text-[11px] text-emerald-200">
                      <span className="text-emerald-400 font-semibold">Remediation: </span>
                      {issue.suggestedFix}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
