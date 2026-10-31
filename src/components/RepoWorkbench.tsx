import React, { useState } from 'react';
import { RepoFile, PresetRepository, SupportedLanguage, CodeIssue } from '../types/agent';
import { PRESET_REPOSITORIES } from '../data/presetRepos';
import {
  FolderTree,
  FileCode,
  FilePlus,
  RotateCcw,
  Upload,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Code,
  Play,
  Terminal,
} from 'lucide-react';

interface RepoWorkbenchProps {
  currentRepo: PresetRepository;
  onSelectRepo: (repo: PresetRepository) => void;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onUpdateFileContent: (path: string, newContent: string) => void;
  issues: CodeIssue[];
  onRunAudit: () => void;
  isAuditing: boolean;
}

export const RepoWorkbench: React.FC<RepoWorkbenchProps> = ({
  currentRepo,
  onSelectRepo,
  activeFilePath,
  onSelectFile,
  onUpdateFileContent,
  issues,
  onRunAudit,
  isAuditing,
}) => {
  const [copied, setCopied] = useState(false);

  const activeFile =
    currentRepo.files.find((f) => f.path === activeFilePath) || currentRepo.files[0];

  const fileIssues = issues.filter((i) => i.file === activeFile.path);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      let lang: SupportedLanguage = 'python';
      if (ext === 'rs') lang = 'rust';
      else if (ext === 'java') lang = 'java';
      else if (ext === 'js' || ext === 'ts') lang = 'javascript';
      else if (ext === 'c' || ext === 'h') lang = 'c';
      else if (ext === 'cpp' || ext === 'hpp' || ext === 'cc') lang = 'cpp';

      const newRepoFile: RepoFile = {
        path: `custom/${file.name}`,
        name: file.name,
        language: lang,
        content: content || '',
      };

      const updatedRepo: PresetRepository = {
        ...currentRepo,
        files: [...currentRepo.files, newRepoFile],
      };
      onSelectRepo(updatedRepo);
      onSelectFile(newRepoFile.path);
    };
    reader.readAsText(file);
  };

  const lineCount = activeFile.content.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Left Sidebar: Repositories & File Tree */}
      <div className="w-full lg:w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        {/* Repo selector dropdown */}
        <div className="p-4 border-b border-slate-800">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Target Repository
          </label>
          <select
            value={currentRepo.id}
            onChange={(e) => {
              const selected = PRESET_REPOSITORIES.find((r) => r.id === e.target.value);
              if (selected) {
                onSelectRepo(selected);
                onSelectFile(selected.files[0].path);
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {PRESET_REPOSITORIES.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.primaryLanguage.toUpperCase()})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {currentRepo.description}
          </p>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Files ({currentRepo.files.length})</span>
            </span>
            <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-[11px]">
              <Upload className="w-3 h-3" />
              <span>Import</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="space-y-1">
            {currentRepo.files.map((file) => {
              const isSelected = file.path === activeFile.path;
              const hasErrors = issues.some((i) => i.file === file.path);
              return (
                <button
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </div>
                  {hasErrors && (
                    <span className="text-[10px] text-amber-400 font-bold shrink-0 ml-1">
                      !
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit trigger banner */}
        <div className="p-3 bg-slate-900/40 border-t border-slate-800">
          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Audit Active File</span>
          </button>
        </div>
      </div>

      {/* Center: Code Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Editor tab bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-100 font-semibold">{activeFile.path}</span>
            <span className="text-slate-500">·</span>
            <span className="text-indigo-400 uppercase text-[11px]">
              {activeFile.language}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 text-[11px] tabular-nums">
              {lineCount} lines ({activeFile.content.length} bytes)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code view & editor with line numbers */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line number gutter */}
          <div className="w-12 bg-slate-950 border-r border-slate-800/80 text-right pr-3 pt-3 select-none text-slate-600 font-mono text-xs leading-6 overflow-hidden">
            {lineNumbers.map((num) => {
              const hasIssueOnLine = fileIssues.find((i) => i.line === num);
              return (
                <div key={num} className="relative group">
                  <span
                    className={
                      hasIssueOnLine
                        ? 'text-amber-400 font-bold'
                        : ''
                    }
                  >
                    {num}
                  </span>
                  {hasIssueOnLine && (
                    <span
                      title={hasIssueOnLine.title}
                      className="absolute right-[-10px] top-1 w-2 h-2 rounded-full bg-amber-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Editable Code Textarea */}
          <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-6 bg-slate-950">
            <textarea
              value={activeFile.content}
              onChange={(e) =>
                onUpdateFileContent(activeFile.path, e.target.value)
              }
              spellCheck={false}
              className="w-full h-full min-h-[500px] bg-transparent text-slate-200 outline-none resize-none font-mono text-xs leading-6 whitespace-pre tab-4"
              style={{ tabSize: 4 }}
            />
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              {fileIssues.length > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-semibold">
                    {fileIssues.length} Diagnostic Warning(s)
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>File Invariants Verified</span>
                </>
              )}
            </span>
            <span className="text-slate-600">|</span>
            <span>Encoding: UTF-8</span>
          </div>

          <div className="text-[11px] text-slate-500">
            Click code to edit live · Changes persist in memory
          </div>
        </div>
      </div>
    </div>
  );
};
