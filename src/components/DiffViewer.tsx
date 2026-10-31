import React, { useState } from 'react';
import { PatchedFile } from '../types/agent';
import {
  GitCompare,
  CheckCircle2,
  Download,
  Copy,
  Check,
  FileCode,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DiffViewerProps {
  patchedFiles: PatchedFile[];
  onApplyPatch: (filePath: string, newContent: string) => void;
  onNavigateToWorkbench: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  patchedFiles,
  onApplyPatch,
  onNavigateToWorkbench,
}) => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(
    patchedFiles[0]?.path || ''
  );
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('unified');
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [appliedFiles, setAppliedFiles] = useState<Record<string, boolean>>({});

  const activePatch =
    patchedFiles.find((p) => p.path === selectedFilePath) || patchedFiles[0];

  if (!activePatch) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4">
          <GitCompare className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">
          No Differential Patches Generated Yet
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
          Run an agent audit on a file or repository to inspect recommended code corrections and generate unified git diffs.
        </p>
        <button
          onClick={onNavigateToWorkbench}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
        >
          Go to Repo Workbench
        </button>
      </div>
    );
  }

  const handleApply = () => {
    onApplyPatch(activePatch.path, activePatch.patchedContent);
    setAppliedFiles({ ...appliedFiles, [activePatch.path]: true });
  };

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(activePatch.unifiedDiff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleDownloadDiff = () => {
    const blob = new Blob([activePatch.unifiedDiff], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePatch.path.replace(/\//g, '_')}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const diffLines = activePatch.unifiedDiff.split('\n');
  const isApplied = appliedFiles[activePatch.path];

  // For side-by-side comparison
  const origLines = activePatch.originalContent.split('\n');
  const modLines = activePatch.patchedContent.split('\n');
  const maxLines = Math.max(origLines.length, modLines.length);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6 bg-slate-950">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-indigo-400" />
            <h1 className="text-base font-bold text-slate-100">
              Deterministic Differential Patches
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activePatch.explanation}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {copiedDiff ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDiff ? 'Copied' : 'Copy Diff'}</span>
          </button>

          <button
            onClick={handleDownloadDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .patch</span>
          </button>

          <button
            onClick={handleApply}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
              isApplied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Patch Applied!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply Patch to File</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* File selector & view mode toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Patched file tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {patchedFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFilePath(file.path)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
                file.path === activePatch.path
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.path}</span>
              {appliedFiles[file.path] && (
                <Check className="w-3 h-3 text-emerald-400 ml-1" />
              )}
            </button>
          ))}
        </div>

        {/* Unified vs Side-by-Side toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'unified'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unified Diff
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {/* Diff Content Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
        {viewMode === 'unified' ? (
          <div className="overflow-x-auto p-4 space-y-0.5 leading-6">
            {diffLines.map((line, idx) => {
              const isAdd = line.startsWith('+') && !line.startsWith('+++');
              const isDel = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded select-text ${
                    isAdd
                      ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                      : isDel
                      ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                      : isHunk
                      ? 'bg-indigo-950/30 text-indigo-300 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-8 text-right text-slate-600 select-none mr-3 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre">{line}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-slate-800 overflow-x-auto">
            {/* Original column */}
            <div className="p-4 bg-slate-950/50">
              <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">
                Original ({origLines.length} lines)
              </div>
              <div className="space-y-0.5 leading-6">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const orig = origLines[i];
                  const mod = modLines[i];
                  const isDifferent = orig !== mod;
                  return (
                    <div
                      key={i}
                      className={`flex items-start px-2 py-0.5 rounded select-text ${
                        isDifferent && orig !== undefined
                          ? 'bg-rose-950/40 text-rose-300'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="w-8 text-right text-slate-600 select-none mr-3 shrink-0">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre truncate">{orig ?? ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patched column */}
            <div className="p-4 bg-slate-950">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">
                Patched Correction ({modLines.length} lines)
              </div>
              <div className="space-y-0.5 leading-6">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const orig = origLines[i];
                  const mod = modLines[i];
                  const isDifferent = orig !== mod;
                  return (
                    <div
                      key={i}
                      className={`flex items-start px-2 py-0.5 rounded select-text ${
                        isDifferent && mod !== undefined
                          ? 'bg-emerald-950/40 text-emerald-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-8 text-right text-slate-600 select-none mr-3 shrink-0">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre truncate">{mod ?? ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
