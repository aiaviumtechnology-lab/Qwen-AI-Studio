import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { AgentStudio } from './components/AgentStudio';
import { RepoWorkbench } from './components/RepoWorkbench';
import { ReasoningTrace } from './components/ReasoningTrace';
import { DiffViewer } from './components/DiffViewer';
import { BpeInspector } from './components/BpeInspector';
import { PipelineExporter } from './components/PipelineExporter';
import { TrainingStudio } from './components/TrainingStudio';
import { RcaEngine } from './components/RcaEngine';
import { DEFAULT_AGENTS } from './data/defaultAgents';
import { PRESET_REPOSITORIES } from './data/presetRepos';
import { AgentConfig, PresetRepository, AuditResult, CodeIssue, PatchedFile } from './types/agent';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('repo-workbench');
  const [currentAgent, setCurrentAgent] = useState<AgentConfig>(DEFAULT_AGENTS[0]);
  const [currentRepo, setCurrentRepo] = useState<PresetRepository>(PRESET_REPOSITORIES[0]);
  const [activeFilePath, setActiveFilePath] = useState<string>(
    PRESET_REPOSITORIES[0].files[0].path
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  // Update file content in active repo
  const handleUpdateFileContent = (path: string, newContent: string) => {
    setCurrentRepo((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.path === path ? { ...f, content: newContent, isModified: true } : f
      ),
    }));
  };

  // Run the autonomous agent audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: currentRepo.files,
          activeFilePath: activeFilePath,
          agent: currentAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Audit request failed with status: ${response.status}`);
      }

      const data = await response.json();
      const result: AuditResult = {
        thinking: data.thinking || '',
        summary: data.summary || '',
        issues: data.issues || [],
        patchedFiles: data.patchedFiles || [],
        timestamp: new Date().toISOString(),
        agentUsed: data.agentUsed || {
          id: currentAgent.id,
          name: currentAgent.name,
          reasoningDepth: currentAgent.reasoningDepth,
        },
      };

      setAuditResult(result);
      setActiveTab('reasoning');
    } catch (error: any) {
      console.error('Audit execution error:', error);
    } finally {
      setIsAuditing(false);
    }
  };

  // Apply a generated patch to the active repo
  const handleApplyPatch = (filePath: string, newContent: string) => {
    handleUpdateFileContent(filePath, newContent);
    // Mark associated issue as resolved in auditResult
    if (auditResult) {
      setAuditResult({
        ...auditResult,
        issues: auditResult.issues.filter((i) => i.file !== filePath),
      });
    }
  };

  const activeFile =
    currentRepo.files.find((f) => f.path === activeFilePath) || currentRepo.files[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunAudit={handleRunAudit}
        isAuditing={isAuditing}
        issuesCount={auditResult?.issues?.length || 0}
        activeLanguage={activeFile.language.toUpperCase()}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'agent-studio' && (
          <AgentStudio
            currentAgent={currentAgent}
            onSelectAgent={setCurrentAgent}
            onUpdateAgent={setCurrentAgent}
            onRunAudit={handleRunAudit}
            isAuditing={isAuditing}
          />
        )}

        {activeTab === 'repo-workbench' && (
          <RepoWorkbench
            currentRepo={currentRepo}
            onSelectRepo={setCurrentRepo}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onUpdateFileContent={handleUpdateFileContent}
            issues={auditResult?.issues || []}
            onRunAudit={handleRunAudit}
            isAuditing={isAuditing}
          />
        )}

        {activeTab === 'rca-engine' && (
          <RcaEngine
            currentRepo={currentRepo}
            activeFilePath={activeFilePath}
            currentAgent={currentAgent}
          />
        )}

        {activeTab === 'reasoning' && (
          <ReasoningTrace
            auditResult={auditResult}
            onNavigateToDiff={() => setActiveTab('diff')}
            onSelectFile={setActiveFilePath}
            onNavigateToWorkbench={() => setActiveTab('repo-workbench')}
          />
        )}

        {activeTab === 'diff' && (
          <DiffViewer
            patchedFiles={auditResult?.patchedFiles || []}
            onApplyPatch={handleApplyPatch}
            onNavigateToWorkbench={() => setActiveTab('repo-workbench')}
          />
        )}

        {activeTab === 'bpe' && (
          <BpeInspector
            currentAgent={currentAgent}
            activeFileContent={activeFile.content}
            activeFileName={activeFile.name}
            activeFileLanguage={activeFile.language}
          />
        )}

        {activeTab === 'training' && <TrainingStudio />}

        {activeTab === 'exporter' && (
          <PipelineExporter currentAgent={currentAgent} />
        )}
      </main>
    </div>
  );
}
