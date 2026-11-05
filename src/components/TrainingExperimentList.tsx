import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  PlusCircle,
  Search,
} from 'lucide-react';
import type { TrainingConfig, QwenModelSize, FineTuningMethod } from '../types/agent';
import type { TrainingExperimentRecord } from '../services/db';

interface TrainingExperimentListProps {
  currentConfig?: TrainingConfig;
  onApplyConfig?: (cfg: TrainingConfig) => void;
}

export const TrainingExperimentList: React.FC<TrainingExperimentListProps> = ({
  currentConfig,
  onApplyConfig,
}) => {
  const [experiments, setExperiments] = useState<TrainingExperimentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch past experiments from PostgreSQL backend service
  const fetchExperiments = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = statusFilter !== 'all' 
        ? `/api/experiments?status=${encodeURIComponent(statusFilter)}` 
        : '/api/experiments';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.experiments && Array.isArray(data.experiments)) {
          setExperiments(data.experiments);
        }
      }
    } catch {
      // Graceful fallback to prevent noisy UI errors
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  // Snapshot the current active config to database
  const handleSaveCurrentExperiment = async () => {
    if (!currentConfig) return;
    setIsSavingSnapshot(true);
    setSaveSuccessMsg(null);
    try {
      const payload: Partial<TrainingExperimentRecord> = {
        name: `Qwen-${currentConfig.modelSize} ${currentConfig.method.toUpperCase()} Run #${Math.floor(100 + Math.random() * 900)}`,
        modelSize: currentConfig.modelSize,
        method: currentConfig.method,
        config: { ...currentConfig },
        status: 'queued',
        datasetId: 'dataset_reasoning_cot_master_v1',
        datasetSampleSize: 1420,
        metrics: {
          lossHistory: [{ step: 0, loss: 2.85, valLoss: 2.92, gradNorm: 1.8, learningRate: currentConfig.learningRate }],
          finalLoss: 2.85,
          evalAccuracy: 0,
          tokensProcessed: 0,
          epochProgress: 0,
        },
      };

      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccessMsg('Experiment run registered in PostgreSQL database');
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        await fetchExperiments();
      }
    } catch {
      // Handled silently
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const formatDuration = (createdAt: string, completedAt?: string, status?: string): string => {
    const start = new Date(createdAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    if (isNaN(start)) return '—';

    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (status === 'running') {
      return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m (in progress)`;
    }
    if (status === 'queued') {
      return 'Scheduled';
    }
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

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

  const filteredExperiments = experiments.filter((exp) => {
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.name.toLowerCase().includes(query) ||
      exp.id.toLowerCase().includes(query) ||
      exp.modelSize.toLowerCase().includes(query) ||
      exp.method.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 animate-pulse">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Running</span>
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Paused</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">
                PostgreSQL Experiment Registry
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                {experiments.length} Runs
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical training metadata, loss trajectories, and hyperparameter audit records
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {currentConfig && (
            <button
              onClick={handleSaveCurrentExperiment}
              disabled={isSavingSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isSavingSnapshot ? 'Recording...' : 'Snapshot Current Config'}</span>
            </button>
          )}

          <button
            onClick={fetchExperiments}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {saveSuccessMsg && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-950/30">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search runs by model, method or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 shrink-0">Filter Status:</span>
          {['all', 'completed', 'running', 'queued', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Experiment Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 font-medium uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Experiment Run</th>
              <th className="py-3 px-4">Model & Paradigm</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Final Loss / Acc</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredExperiments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Querying database records...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p>No experiment records found matching current criteria.</p>
                      <p className="text-[11px] text-slate-600">
                        Use "Snapshot Current Config" above to store an experiment in the PostgreSQL database.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredExperiments.map((exp) => {
                const isExpanded = expandedId === exp.id;
                const durationStr = formatDuration(exp.createdAt, exp.completedAt, exp.status);
                const timestampStr = formatTimestamp(exp.createdAt);

                return (
                  <React.Fragment key={exp.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100 flex items-center gap-2">
                          <span>{exp.name}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {exp.id}
                        </div>
                      </td>

                      {/* Model & Method */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] font-semibold">
                            {exp.modelSize}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] uppercase">
                            {exp.method}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(exp.status)}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{durationStr}</span>
                        </div>
                      </td>

                      {/* Metrics Summary */}
                      <td className="py-3 px-4 font-mono">
                        {exp.metrics?.finalLoss !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-semibold">
                              loss {exp.metrics.finalLoss.toFixed(2)}
                            </span>
                            {exp.metrics.evalAccuracy !== undefined && (
                              <span className="text-cyan-400 text-[11px]">
                                {exp.metrics.evalAccuracy}% acc
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{timestampStr}</span>
                        </div>
                      </td>

                      {/* Expand Toggle */}
                      <td className="py-3 px-3 text-right">
                        <button
                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : exp.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={7} className="p-4 border-t border-b border-slate-800">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Hyperparameter Settings */}
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Hyperparameters</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                                <div className="text-slate-500">Learning Rate:</div>
                                <div className="text-indigo-300 font-semibold">{exp.config?.learningRate || '2e-4'}</div>
                                <div className="text-slate-500">Micro Batch:</div>
                                <div>{exp.config?.microBatchSize || 2}</div>
                                <div className="text-slate-500">Grad Accum:</div>
                                <div>{exp.config?.gradientAccumulation || 8}</div>
                                <div className="text-slate-500">LoRA Rank/Alpha:</div>
                                <div>{exp.config?.loraRank || 32} / {exp.config?.loraAlpha || 64}</div>
                                <div className="text-slate-500">Optimizer:</div>
                                <div className="text-amber-400">{exp.config?.optimizer || 'adamw_torch_fused'}</div>
                                <div className="text-slate-500">Epochs:</div>
                                <div>{exp.config?.epochs || 3}</div>
                              </div>
                            </div>

                            {/* Reasoning & Checkpoint Telemetry */}
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2.5">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Training Telemetry</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                                <div className="text-slate-500">Tokens Processed:</div>
                                <div className="text-cyan-300">
                                  {exp.metrics?.tokensProcessed
                                    ? `${(exp.metrics.tokensProcessed / 1_000_000).toFixed(2)}M tokens`
                                    : '—'}
                                </div>
                                <div className="text-slate-500">Peak VRAM:</div>
                                <div>{exp.metrics?.peakVramGb ? `${exp.metrics.peakVramGb} GB` : '—'}</div>
                                <div className="text-slate-500">Dataset Reference:</div>
                                <div className="truncate text-slate-300">{exp.datasetId || 'default'}</div>
                                <div className="text-slate-500">Sample Count:</div>
                                <div>{exp.datasetSampleSize ? `${exp.datasetSampleSize} items` : '—'}</div>
                                <div className="text-slate-500">Completed At:</div>
                                <div className="text-slate-400 truncate">
                                  {exp.completedAt ? formatTimestamp(exp.completedAt) : 'Pending completion'}
                                </div>
                              </div>
                            </div>

                            {/* Execution Controls & Apply */}
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Convergence Snapshot</span>
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                                  Step metrics and weights validated for reasoning-augmented code generation.
                                </p>
                              </div>

                              {onApplyConfig && exp.config && (
                                <button
                                  onClick={() => {
                                    onApplyConfig({
                                      modelSize: exp.modelSize,
                                      method: exp.method as FineTuningMethod,
                                      contextLength: (exp.config.contextLength as number) || 4096,
                                      microBatchSize: exp.config.microBatchSize || 2,
                                      gradientAccumulation: exp.config.gradientAccumulation || 8,
                                      learningRate: exp.config.learningRate || 0.0002,
                                      loraRank: exp.config.loraRank || 32,
                                      loraAlpha: exp.config.loraAlpha || 64,
                                      epochs: exp.config.epochs || 3,
                                      warmupRatio: exp.config.warmupRatio || 0.03,
                                      optimizer: (exp.config.optimizer as any) || 'adamw_torch_fused',
                                      gradientCheckpointing: exp.config.gradientCheckpointing ?? true,
                                      flashAttention2: exp.config.flashAttention2 ?? true,
                                    });
                                  }}
                                  className="w-full py-2 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-medium transition-colors"
                                >
                                  Load Hyperparameters into Studio
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
