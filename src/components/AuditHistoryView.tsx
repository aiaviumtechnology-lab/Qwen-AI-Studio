import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileCode,
  Bot,
  ExternalLink,
  ChevronDown,
  X,
  Copy,
  Check,
  Download,
  Database,
  Layers,
} from 'lucide-react';
import type { AuditLogRecord } from '../services/db';

interface AuditHistoryViewProps {
  onSelectSession?: (session: AuditLogRecord) => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = () => {
  const [sessions, setSessions] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Filter & Search state
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<AuditLogRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch paginated audit sessions from PostgreSQL service
  const fetchAuditSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', offset.toString());

      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs && Array.isArray(data.logs)) {
          setSessions(data.logs);
          setTotalCount(data.total || data.logs.length);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, severityFilter]);

  useEffect(() => {
    fetchAuditSessions();
  }, [fetchAuditSessions]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  const handleCopyJson = (log: AuditLogRecord) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter client-side search query
  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const summary = (s.details?.summary || '').toLowerCase();
    const target = s.target.toLowerCase();
    const actor = (s.actor || '').toLowerCase();
    return summary.includes(q) || target.includes(q) || actor.includes(q);
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur flex flex-col">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">Agent Audit History</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-purple-300 border border-slate-700">
                {totalCount} Total Sessions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical PostgreSQL repository audits, invariant diagnostics, and verified patches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchAuditSessions()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh from PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search audit summaries, files, or agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['all', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  setSeverityFilter(sev);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  severityFilter === sev
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Session List */}
      <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[560px]">
        {isLoading && filteredSessions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
            <span>Retrieving audit records from PostgreSQL database...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-1">
            <p>No audit sessions found matching your criteria.</p>
            <p className="text-[11px] text-slate-600">
              Run an agent audit from the Repo Workbench or Agent Studio to record new sessions.
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isCritical = session.severity === 'critical';
            const isWarning = session.severity === 'warning';
            const totalIssues = session.details?.totalIssues ?? (session.details?.issues?.length || 0);
            const summarySnippet =
              session.details?.summary ||
              (session.details && typeof session.details === 'object'
                ? JSON.stringify(session.details).slice(0, 160)
                : 'Audit session executed.');
            const language = session.details?.language || 'code';
            const agentName = session.details?.agentName || session.actor || 'Qwen Reasoner';
            const relativeTime = getRelativeTime(session.timestamp);

            return (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="p-4 sm:p-5 hover:bg-slate-800/40 cursor-pointer transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Target, Timestamp & Summary Snippet */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{session.target}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                      {language}
                    </span>

                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{relativeTime}</span>
                      <span className="text-slate-600">({formatTimestamp(session.timestamp)})</span>
                    </span>
                  </div>

                  {/* Summary Snippet */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 pr-4">
                    {summarySnippet}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-indigo-400 font-mono">
                      <Bot className="w-3 h-3" />
                      <span>{agentName}</span>
                    </span>
                    <span>·</span>
                    <span className="font-mono text-slate-500 text-[10px]">{session.id}</span>
                  </div>
                </div>

                {/* Right: Total Issues Badge & Severity */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      {totalIssues > 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isCritical
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                              : isWarning
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                          }`}
                        >
                          {isCritical ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {totalIssues} {totalIssues === 1 ? 'Issue' : 'Issues'} Found
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>0 Invariant Defects</span>
                        </span>
                      )}
                    </div>

                    {session.details?.criticalIssues !== undefined && (
                      <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-end gap-1.5">
                        {session.details.criticalIssues > 0 && (
                          <span className="text-rose-400 font-bold">
                            {session.details.criticalIssues} crit
                          </span>
                        )}
                        {session.details.warningIssues > 0 && (
                          <span className="text-amber-400">
                            {session.details.warningIssues} warn
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSession(session);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="View detailed audit report"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>
            Showing {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} -{' '}
            {Math.min(totalCount, currentPage * pageSize)} of {totalCount} records
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-mono text-[11px] text-slate-200 bg-slate-900 border border-slate-800 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Audit Session Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Audit Session Detail</span>
                  <span className="font-mono text-xs text-purple-400">({selectedSession.id})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedSession.target}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedSession)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1.5"
                  title="Copy JSON Payload"
                >
                  {copiedId === selectedSession.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === selectedSession.id ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">
                  Agent Invariant Assessment
                </div>
                <p className="text-slate-200 leading-relaxed font-sans">
                  {selectedSession.details?.summary || 'No summary provided.'}
                </p>
              </div>

              {/* Issues List */}
              {selectedSession.details?.issues && selectedSession.details.issues.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                    Identified Invariant Violations ({selectedSession.details.issues.length})
                  </div>
                  {selectedSession.details.issues.map((issue: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100 flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                              issue.severity === 'critical'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span>{issue.title}</span>
                        </span>
                        {issue.line && (
                          <span className="font-mono text-slate-400 text-[11px]">
                            Line {issue.line}
                          </span>
                        )}
                      </div>

                      {issue.ruleBroken && (
                        <div className="text-[11px] font-mono text-indigo-400">
                          Invariant Broken: {issue.ruleBroken}
                        </div>
                      )}

                      {issue.rootCause && (
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          <strong className="text-slate-400">Root Cause:</strong> {issue.rootCause}
                        </div>
                      )}

                      {issue.suggestedFix && (
                        <div className="text-[11px] text-emerald-400 leading-relaxed bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                          <strong className="text-emerald-300">Suggested Fix:</strong>{' '}
                          {issue.suggestedFix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-center">
                  Zero syntax, lifetime, or concurrency errors detected in this session.
                </div>
              )}

              {/* Metadata details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Timestamp</div>
                  <div className="text-slate-200">{formatTimestamp(selectedSession.timestamp)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Actor / Agent</div>
                  <div className="text-indigo-400 truncate">{selectedSession.actor || 'Agent'}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Patched Files</div>
                  <div className="text-cyan-400">
                    {selectedSession.details?.patchedFilesCount ?? '1 file'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
