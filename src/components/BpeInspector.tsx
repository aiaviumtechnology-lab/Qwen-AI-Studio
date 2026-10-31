import React, { useState, useEffect, useMemo } from 'react';
import { BpeAnalysis, BpeToken, AgentConfig } from '../types/agent';
import {
  Binary,
  Layers,
  Sparkles,
  RefreshCw,
  Code2,
  Copy,
  Check,
  BrainCircuit,
  Flame,
  ShieldAlert,
  Cpu,
  FileCode,
  Info,
  Target,
  BarChart3,
  Search,
  AlertTriangle,
  ArrowRight,
  Gauge,
  Zap,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

interface BpeInspectorProps {
  currentAgent?: AgentConfig;
  activeFileContent?: string;
  activeFileName?: string;
  activeFileLanguage?: string;
}

const SAMPLE_SNIPPETS: Record<string, string> = {
  Rust: `pub fn process_task<'a>(queue: &'a RefCell<Vec<String>>) -> Option<String> {
    let current = queue.borrow();
    if let Some(task) = current.first() {
        // High attention trigger: Exclusive mutable borrow overlaps with shared borrow!
        queue.borrow_mut().remove(0);
        return Some(task.clone());
    }
    None
}`,
  Python: `async def process_batch(items: list[dict], collector: BatchCollector = []) -> list[int]:
    # High attention: Mutable default arg 'collector=[]' binds once at load time!
    tasks = [requests.get(item["url"], timeout=5) for item in items]
    # Synchronous requests blocks entire asyncio loop
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results`,
  C: `Packet* create_packet(const char* host, int port, const char* data) {
    Packet *p = (Packet*)malloc(sizeof(Packet));
    if (!p) return NULL;
    // High attention: Unbounded strcpy into 32-byte buffer -> CWE-120 Overflow
    strcpy(p->hostname, host);
    p->port = port;
    return p;
}`,
  Cpp: `auto create_component_graph() {
    auto parent = std::make_shared<Node>("Root");
    auto child = std::make_shared<Node>("Child");
    // High attention: Circular std::shared_ptr references prevent refcount cleanup!
    parent->child = child;
    child->parent = parent;
    return parent;
}`,
  Java: `public boolean transferFunds(String fromId, String toId, double amount) {
    Account from = accounts.get(fromId);
    Account to = accounts.get(toId);
    // High attention: Check-Then-Act race condition outside synchronized monitor
    if (from.getBalance() >= amount) {
        from.setBalance(from.getBalance() - amount);
        to.setBalance(to.getBalance() + amount);
        return true;
    }
    return false;
}`,
  JavaScript: `class StreamCache extends EventEmitter {
    attachSession(sessionToken, onData) {
        // High attention: Unbounded event listener leaks memory across requests
        this.on('chunk', (data) => onData(data));
    }
    async save(item) {
        if (!item.id) throw new Error("Invalid ID");
        return db.insert(item);
    }
}`,
};

export type ViewMode = 'agent-heatmap' | 'block-chart' | 'semantic-roles' | 'bpe-raw';

export interface CodeBlockAnalysis {
  id: string;
  name: string;
  badge: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
  lineCount: number;
  tokenCount: number;
  tokensPercentage: number;
  avgTokensPerLine: number;
  criticalTokenCount: number;
  compressionRatio: number; // bytes / token
  reasoningExpansionMultiplier: number; // estimated <think> token multiplier
  estimatedReasoningTokens: number;
  bottleneckRisk: 'high' | 'moderate' | 'optimal';
  bottleneckTitle: string;
  bottleneckReason: string;
  mitigationAdvice: string;
  dominantTokens: string[];
}

interface TokenReasoningProfile {
  token: BpeToken;
  category: 'memory' | 'concurrency' | 'types' | 'control' | 'identifier' | 'syntax';
  attentionScore: number; // 0.0 to 1.0
  reasoningNote: string;
  triggeredRule?: string;
}

export const BpeInspector: React.FC<BpeInspectorProps> = ({
  currentAgent,
  activeFileContent,
  activeFileName,
  activeFileLanguage,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('Rust');
  const [code, setCode] = useState<string>(SAMPLE_SNIPPETS['Rust']);
  const [analysis, setAnalysis] = useState<BpeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredToken, setHoveredToken] = useState<TokenReasoningProfile | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenReasoningProfile | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('block-chart');
  const [copiedTokens, setCopiedTokens] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const agentName = currentAgent?.name || 'Memory & Lifetime Safety Agent';
  const agentRole = currentAgent?.role || 'Systems Safety & Ownership Specialist';
  const agentId = currentAgent?.id || 'agent-memory-safety';

  const fetchTokenization = async (text: string, lang: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: text, language: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to tokenize:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenization(code, selectedLang);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(SAMPLE_SNIPPETS[lang]);
    setSelectedBlockId(null);
    fetchTokenization(SAMPLE_SNIPPETS[lang], lang);
  };

  const handleLoadFromWorkspace = () => {
    if (activeFileContent) {
      setCode(activeFileContent);
      const lang = activeFileLanguage || 'rust';
      setSelectedLang(lang.toUpperCase());
      setSelectedBlockId(null);
      fetchTokenization(activeFileContent, lang);
    }
  };

  const handleCopyTokens = () => {
    if (!analysis) return;
    const tokenIds = analysis.tokens.map((t) => t.id).join(', ');
    navigator.clipboard.writeText(`[${tokenIds}]`);
    setCopiedTokens(true);
    setTimeout(() => setCopiedTokens(false), 2000);
  };

  // Agent Cognitive Attention & Semantic Role Evaluation
  const evaluateTokenReasoning = (token: BpeToken): TokenReasoningProfile => {
    const raw = token.text.trim();
    const lower = raw.toLowerCase();

    // 1. Memory & Lifetime Primitives
    const isMemory =
      ['borrow', 'borrow_mut', 'free', 'malloc', 'strcpy', 'memcpy', 'refcell', 'weak_ptr', 'shared_ptr', 'null', 'nullptr', 'delete', 'static', 'mut', 'arc', 'rc'].some((k) => lower.includes(k)) ||
      raw === '*' ||
      raw === '&' ||
      raw.startsWith("'");

    // 2. Concurrency & Async Primitives
    const isConcurrency =
      ['mutex', 'thread', 'spawn', 'synchronized', 'lock', 'sleep', 'async', 'await', 'gather', 'promise', 'eventemitter', 'atomic', 'join'].some((k) => lower.includes(k));

    // 3. Types & Interface Bounds
    const isType =
      ['record', 'concept', 'template', 'typedef', 'struct', 'impl', 'class', 'uuid', 'bigdecimal', 'option', 'result', 'string', 'vec', 'int', 'double', 'u8', 'u32', 'char', 'const'].some((k) => lower.includes(k));

    // 4. Control Flow & Scope Delimiters
    const isControl =
      ['match', 'if', 'else', 'while', 'for', 'return', 'fn', 'def', 'throw', 'try', 'catch'].some((k) => lower === k) ||
      raw === '{' ||
      raw === '}' ||
      raw === '(' ||
      raw === ')' ||
      raw === ';';

    let category: TokenReasoningProfile['category'] = 'identifier';
    let attentionScore = 0.15;
    let reasoningNote = 'Contextual identifier or literal operand.';
    let triggeredRule: string | undefined = undefined;

    if (isMemory) {
      category = 'memory';
      attentionScore = 0.75;
      reasoningNote = 'Memory ownership / allocation primitive. Agent probes lifetime bounds and aliasing invariants.';
      triggeredRule = 'Rust E0502 Borrow Rule / CWE-120 Buffer Safety';
    } else if (isConcurrency) {
      category = 'concurrency';
      attentionScore = 0.70;
      reasoningNote = 'Concurrent synchronization primitive. Agent maps lock acquisition ordering and thread interleaving.';
      triggeredRule = 'AB-BA Deadlock Invariant / Race Condition Monitor';
    } else if (isType) {
      category = 'types';
      attentionScore = 0.55;
      reasoningNote = 'Type specification or generic constraint. Agent infers type variance and boundary adherence.';
      triggeredRule = 'Language Standard Type Safety';
    } else if (isControl) {
      category = 'control';
      attentionScore = 0.40;
      reasoningNote = 'Lexical scope and branching boundary. Agent constructs control flow graph branch targets.';
    } else {
      category = 'identifier';
      attentionScore = 0.20;
      reasoningNote = 'Variable name or symbol reference.';
    }

    // Weight adjustment based on the selected agent's specialty
    if (agentId.includes('memory') && category === 'memory') {
      attentionScore = Math.min(1.0, attentionScore + 0.25);
      if (lower.includes('borrow_mut') || lower.includes('strcpy') || lower.includes('free') || lower.includes('shared_ptr')) {
        attentionScore = 0.98;
        reasoningNote = `CRITICAL FOCUS: ${agentName} isolates this token as a primary defect trigger. Invariant verification checks active borrows and pointer validity.`;
      }
    } else if (agentId.includes('concurrency') && category === 'concurrency') {
      attentionScore = Math.min(1.0, attentionScore + 0.28);
      if (lower.includes('mutex') || lower.includes('synchronized') || lower.includes('requests') || lower.includes('sleep')) {
        attentionScore = 0.98;
        reasoningNote = `CRITICAL FOCUS: ${agentName} flags this synchronization token. Agent evaluates lock contention, thread starvation, and event-loop blocking.`;
      }
    } else if (agentId.includes('syntax') && category === 'types') {
      attentionScore = Math.min(1.0, attentionScore + 0.35);
      reasoningNote = `PRIMARY FOCUS: ${agentName} checks compiler AST invariants and null-safety contracts.`;
    }

    return {
      token,
      category,
      attentionScore: Number(attentionScore.toFixed(2)),
      reasoningNote,
      triggeredRule,
    };
  };

  const tokenProfiles: TokenReasoningProfile[] = (analysis?.tokens || []).map((t) =>
    evaluateTokenReasoning(t)
  );

  const filteredProfiles = tokenProfiles.filter((p) => {
    if (categoryFilter === 'all') return true;
    return p.category === categoryFilter;
  });

  // Code Block Partitioning & Reasoning Bottleneck Analysis
  const partitionCodeBlocks = (
    rawCode: string,
    profiles: TokenReasoningProfile[],
    language: string
  ): CodeBlockAnalysis[] => {
    const lines = rawCode.split('\n');
    if (lines.length === 0 || profiles.length === 0) return [];

    const lineBounds: { lineIndex: number; start: number; end: number; text: string }[] = [];
    let currOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      lineBounds.push({
        lineIndex: i + 1,
        start: currOffset,
        end: currOffset + text.length,
        text,
      });
      currOffset += text.length + 1;
    }

    const lineTokensMap = new Map<number, TokenReasoningProfile[]>();
    for (let i = 1; i <= lines.length; i++) {
      lineTokensMap.set(i, []);
    }

    let tokenRunningOffset = 0;
    for (const prof of profiles) {
      const tStart = prof.token.offsetStart !== undefined ? prof.token.offsetStart : tokenRunningOffset;
      tokenRunningOffset += prof.token.text.length;
      for (const lb of lineBounds) {
        if (tStart >= lb.start && tStart <= lb.end + 1) {
          lineTokensMap.get(lb.lineIndex)?.push(prof);
          break;
        }
      }
    }

    type LineGroup = {
      name: string;
      badge: string;
      startLine: number;
      endLine: number;
    };

    const totalLines = lines.length;
    let groups: LineGroup[] = [];

    // Domain presets for canonical samples
    if (rawCode.includes('process_task') && rawCode.includes('borrow_mut')) {
      groups = [
        { name: 'Function Signature & Invariant Lifetimes', badge: 'Signature & Lifetime', startLine: 1, endLine: 1 },
        { name: 'Shared Borrow Context Ingestion', badge: 'Shared Ref Invariant', startLine: 2, endLine: 2 },
        { name: 'Exclusive Mutation Hazard (E0502 Borrow Panic)', badge: 'Mutation Collision', startLine: 3, endLine: 6 },
        { name: 'None Branch Fallback & Scope Epilogue', badge: 'Epilogue & Teardown', startLine: 7, endLine: 8 },
      ];
    } else if (rawCode.includes('process_batch') && rawCode.includes('collector')) {
      groups = [
        { name: 'Signature & Mutable Default Arg Ingestion', badge: 'Default Binding Hazard', startLine: 1, endLine: 1 },
        { name: 'Synchronous I/O Blocking Point', badge: 'Event Loop Block', startLine: 2, endLine: 3 },
        { name: 'Async Gather & Return Resolution', badge: 'Async Evaluation', startLine: 4, endLine: 5 },
      ];
    } else if (rawCode.includes('create_packet') && rawCode.includes('strcpy')) {
      groups = [
        { name: 'Heap Allocation & Null Pointer Check', badge: 'Allocation Boundary', startLine: 1, endLine: 3 },
        { name: 'Unbounded Buffer Copy (CWE-120 Overflow)', badge: 'Memory Corruption', startLine: 4, endLine: 5 },
        { name: 'Pointer Return & Caller Hand-off', badge: 'Pointer Transfer', startLine: 6, endLine: 7 },
      ];
    } else if (rawCode.includes('make_shared') && rawCode.includes('parent->child')) {
      groups = [
        { name: 'Smart Pointer Instantiation', badge: 'Allocation & RefCount', startLine: 1, endLine: 3 },
        { name: 'Cyclic Reference Interlock (Memory Leak)', badge: 'Cyclic Retain Hazard', startLine: 4, endLine: 5 },
        { name: 'Return Root & Scope Lifetime Escape', badge: 'Scope Exit', startLine: 6, endLine: 7 },
      ];
    } else if (rawCode.includes('transferFunds') && rawCode.includes('setBalance')) {
      groups = [
        { name: 'Method Signature & State Lookups', badge: 'State Access', startLine: 1, endLine: 3 },
        { name: 'Check-Then-Act Race Condition Hazard', badge: 'Concurrency Hazard', startLine: 4, endLine: 8 },
        { name: 'Fallback Return & Monitor Exit', badge: 'Resolution', startLine: 9, endLine: 10 },
      ];
    } else if (rawCode.includes('StreamCache') && rawCode.includes('EventEmitter')) {
      groups = [
        { name: 'Event Listener Leak Registration', badge: 'Resource Leak', startLine: 1, endLine: 4 },
        { name: 'Async Persistence Mutation & Validation', badge: 'Async Mutation', startLine: 5, endLine: 9 },
      ];
    } else {
      if (totalLines <= 4) {
        groups = lines.map((l, idx) => ({
          name: `Statement ${idx + 1}: ${l.trim().slice(0, 32) || 'Code Line'}`,
          badge: `Block ${idx + 1}`,
          startLine: idx + 1,
          endLine: idx + 1,
        }));
      } else {
        const chunkSize = Math.max(2, Math.ceil(totalLines / 4));
        let currentLine = 1;
        let blockIdx = 1;
        while (currentLine <= totalLines) {
          const nextEnd = Math.min(totalLines, currentLine + chunkSize - 1);
          const chunkText = lines.slice(currentLine - 1, nextEnd).join(' ');
          let name = `Block ${blockIdx}: Structural Segment`;
          let badge = `Block ${blockIdx}`;
          if (currentLine === 1) {
            name = `Block 1: Interface & Declarations`;
            badge = 'Signature & Interface';
          } else if (nextEnd === totalLines) {
            name = `Block ${blockIdx}: Resolution & Teardown`;
            badge = 'Exit & Teardown';
          } else if (chunkText.match(/(borrow|malloc|strcpy|mutex|lock|set|write|free|shared|async)/i)) {
            name = `Block ${blockIdx}: Core Mutation & Invariant Logic`;
            badge = 'Mutation Hazard';
          } else if (chunkText.match(/(if|else|match|for|while|await|try|catch)/i)) {
            name = `Block ${blockIdx}: Branching & Control Flow`;
            badge = 'Decision Flow';
          }

          groups.push({
            name,
            badge,
            startLine: currentLine,
            endLine: nextEnd,
          });
          currentLine = nextEnd + 1;
          blockIdx++;
        }
      }
    }

    const totalTokensCount = profiles.length || 1;

    return groups.map((grp, idx) => {
      const blockProfiles: TokenReasoningProfile[] = [];
      for (let l = grp.startLine; l <= grp.endLine; l++) {
        const lt = lineTokensMap.get(l) || [];
        blockProfiles.push(...lt);
      }

      const blockTokens = blockProfiles.map((p) => p.token);
      const blockLines = lines.slice(grp.startLine - 1, grp.endLine);
      const snippet = blockLines.join('\n');
      const tokenCount = blockTokens.length;
      const tokensPercentage = (tokenCount / totalTokensCount) * 100;
      const lineCount = Math.max(1, grp.endLine - grp.startLine + 1);
      const avgTokensPerLine = tokenCount / lineCount;

      const criticalProfiles = blockProfiles.filter((p) => p.attentionScore >= 0.75 || p.category === 'memory' || p.category === 'concurrency');
      const criticalTokenCount = criticalProfiles.length;
      const byteLength = blockTokens.reduce((acc, t) => acc + (t.byteLength || t.text.length), 0);
      const compressionRatio = tokenCount > 0 ? byteLength / tokenCount : 1.0;

      let bottleneckRisk: 'high' | 'moderate' | 'optimal' = 'optimal';
      let reasoningExpansionMultiplier = 1.3;
      let bottleneckTitle = 'Linear Execution Flow';
      let bottleneckReason = 'Deterministic instruction sequence with no conflicting aliases or concurrency gates.';
      let mitigationAdvice = 'Maintain current token density and clean type annotations.';

      const lowerSnippet = snippet.toLowerCase();
      const hasBorrowMutConflict = lowerSnippet.includes('borrow_mut') && (rawCode.toLowerCase().includes('borrow()') || lowerSnippet.includes('borrow()'));
      const hasBufferOverflow = lowerSnippet.includes('strcpy') || lowerSnippet.includes('memcpy') || lowerSnippet.includes('gets');
      const hasUnsynchronizedRace = lowerSnippet.includes('getbalance') && lowerSnippet.includes('setbalance');
      const hasAsyncBlocking = lowerSnippet.includes('requests.get') && rawCode.includes('async');
      const hasCyclicRef = lowerSnippet.includes('child->parent') || (lowerSnippet.includes('shared_ptr') && lowerSnippet.includes('parent->child'));
      const hasEventLeak = lowerSnippet.includes('this.on(') || lowerSnippet.includes('addeventlistener');

      if (hasBorrowMutConflict || hasBufferOverflow || hasUnsynchronizedRace || hasAsyncBlocking || hasCyclicRef || hasEventLeak || criticalTokenCount >= 2 || (tokenCount > 8 && criticalTokenCount >= 1)) {
        bottleneckRisk = 'high';
        reasoningExpansionMultiplier = 3.8;
        bottleneckTitle = 'Critical Safety Invariant / Aliasing Hazard';
        if (hasBorrowMutConflict) {
          bottleneckReason = `Simultaneous shared borrow ('queue.borrow()') and exclusive mutable borrow ('queue.borrow_mut()') trigger an exponential reasoning search (~3.8x expansion). The agent's attention heads must simulate active borrow scopes and drop order in <think> tags to verify panic safety.`;
          mitigationAdvice = `Drop the shared reference explicitly before acquiring the mutable borrow, or isolate the borrow in a lexical block '{ ... }' to eliminate recursive reasoning branching.`;
        } else if (hasBufferOverflow) {
          bottleneckReason = `Unbounded memory copy ('strcpy') into a fixed-size buffer forces the agent to explore all call sites and string length bounds, causing a deep branching path in <think> token generation.`;
          mitigationAdvice = `Replace 'strcpy' with 'strncpy' or bounded 'snprintf(..., sizeof(buf))' to establish an immediate compile-time bounds invariant.`;
        } else if (hasUnsynchronizedRace) {
          bottleneckReason = `Unsynchronized check-then-act pattern creates a combinatorial thread interleaving graph in the model's KV cache, demanding high token reasoning to prove absence of lost updates.`;
          mitigationAdvice = `Enclose the transaction in a synchronized block or use an atomic CAS loop ('AtomicInteger.compareAndSet') to make state transitions atomic.`;
        } else if (hasAsyncBlocking) {
          bottleneckReason = `Synchronous HTTP calls inside an async event loop trigger deep diagnostic traces evaluating event loop latency and thread pool starvation.`;
          mitigationAdvice = `Switch to non-blocking 'httpx.AsyncClient' or run within 'asyncio.to_thread' to decouple I/O from the main loop.`;
        } else if (hasCyclicRef) {
          bottleneckReason = `Bi-directional 'std::shared_ptr' reference cycle prevents destructor invocation; reasoner must track refcount increments across heap graphs.`;
          mitigationAdvice = `Break the cyclic reference by converting the back-reference 'child->parent' to 'std::weak_ptr<Node>'.`;
        } else {
          bottleneckReason = `High concentration of critical invariant tokens (${criticalTokenCount}) forces the reasoner to branch recursively across safety rules.`;
          mitigationAdvice = `Refactor complex mutations into smaller helper functions to constrain the invariant verification scope.`;
        }
      } else if (lowerSnippet.includes('if ') || lowerSnippet.includes('if let') || lowerSnippet.includes('match') || lowerSnippet.includes('for ') || lowerSnippet.includes('while') || avgTokensPerLine > 12) {
        bottleneckRisk = 'moderate';
        reasoningExpansionMultiplier = 2.4;
        bottleneckTitle = 'Conditional Branching & Context Window Expansion';
        bottleneckReason = `Control flow branches require tracking mutually exclusive execution states in KV attention heads. Token density (${avgTokensPerLine.toFixed(1)} tok/line) increases context consumption.`;
        mitigationAdvice = `Simplify nested conditions using early guard returns or pattern matching.`;
      }

      const estimatedReasoningTokens = Math.round(tokenCount * reasoningExpansionMultiplier);

      const sortedTokens = [...blockProfiles]
        .sort((a, b) => b.attentionScore - a.attentionScore)
        .slice(0, 4)
        .map((p) => p.token.text.trim())
        .filter((t) => t.length > 0);

      return {
        id: `block-${idx + 1}`,
        name: grp.name,
        badge: grp.badge,
        startLine: grp.startLine,
        endLine: grp.endLine,
        codeSnippet: snippet,
        lineCount,
        tokenCount,
        tokensPercentage: Number(tokensPercentage.toFixed(1)),
        avgTokensPerLine: Number(avgTokensPerLine.toFixed(1)),
        criticalTokenCount,
        compressionRatio: Number(compressionRatio.toFixed(2)),
        reasoningExpansionMultiplier: Number(reasoningExpansionMultiplier.toFixed(1)),
        estimatedReasoningTokens,
        bottleneckRisk,
        bottleneckTitle,
        bottleneckReason,
        mitigationAdvice,
        dominantTokens: Array.from(new Set(sortedTokens)),
      };
    });
  };

  const codeBlocks: CodeBlockAnalysis[] = useMemo(() => {
    return partitionCodeBlocks(code, tokenProfiles, selectedLang);
  }, [code, tokenProfiles, selectedLang]);

  // Aggregate reasoning statistics
  const memoryTokenCount = tokenProfiles.filter((p) => p.category === 'memory').length;
  const concurrencyTokenCount = tokenProfiles.filter((p) => p.category === 'concurrency').length;
  const highAttentionTokens = tokenProfiles.filter((p) => p.attentionScore >= 0.75);

  const highRiskBlocksCount = codeBlocks.filter((b) => b.bottleneckRisk === 'high').length;
  const moderateRiskBlocksCount = codeBlocks.filter((b) => b.bottleneckRisk === 'moderate').length;
  const totalEstimatedReasoningTokens = codeBlocks.reduce((acc, b) => acc + b.estimatedReasoningTokens, 0);
  const overallExpansionRatio = analysis?.totalTokens
    ? (totalEstimatedReasoningTokens / analysis.totalTokens).toFixed(1)
    : '1.0';
  const peakDensityBlock = [...codeBlocks].sort((a, b) => b.avgTokensPerLine - a.avgTokensPerLine)[0];

  const activeSelectedBlock =
    codeBlocks.find((b) => b.id === selectedBlockId) ||
    codeBlocks.find((b) => b.bottleneckRisk === 'high') ||
    codeBlocks[0];

  // Raw BPE color cycler
  const bpeColors = [
    'bg-indigo-950/60 text-indigo-200 border-indigo-700/50',
    'bg-teal-950/60 text-teal-200 border-teal-700/50',
    'bg-amber-950/60 text-amber-200 border-amber-700/50',
    'bg-sky-950/60 text-sky-200 border-sky-700/50',
    'bg-fuchsia-950/60 text-fuchsia-200 border-fuchsia-700/50',
    'bg-emerald-950/60 text-emerald-200 border-emerald-700/50',
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6 bg-slate-950">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold text-slate-100">
              Qwen BPE Tokenizer & Reasoning Bottleneck Analyzer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quantify token distribution across code blocks, identify cognitive bottlenecks in{' '}
            <span className="text-indigo-400 font-semibold">{agentName}</span>, and inspect reasoning expansion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFileContent && (
            <button
              onClick={handleLoadFromWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Load from Workspace ({activeFileName || 'File'})</span>
            </button>
          )}

          <div className="flex items-center gap-1 border border-slate-800 rounded-lg p-1 bg-slate-900">
            {Object.keys(SAMPLE_SNIPPETS).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  selectedLang === lang
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row: Tokens, Invariants, Bottlenecks & Reasoning Expansion */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total BPE Tokens
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
              {analysis.totalTokens}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Vocab: 151,643+ (Qwen Base)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Reasoning Expansion
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
              ~{overallExpansionRatio}x
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Est. {totalEstimatedReasoningTokens} &lt;think&gt; tokens
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Bottleneck Hotspots
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums flex items-center gap-1.5">
              <span>{highRiskBlocksCount}</span>
              <span className="text-xs font-normal text-slate-500">
                ({moderateRiskBlocksCount} moderate)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              High cognitive branching blocks
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Peak Token Density
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
              {peakDensityBlock ? peakDensityBlock.avgTokensPerLine : 0} <span className="text-xs text-slate-500">tok/ln</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {peakDensityBlock ? peakDensityBlock.badge : 'Normal'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Compression Ratio
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              {analysis.compressionRatio} <span className="text-xs text-slate-500">bytes/tok</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {analysis.originalBytes} bytes total
            </p>
          </div>
        </div>
      )}

      {/* Code Block Distribution Multi-Segment Bar */}
      {codeBlocks.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">
                Code Block Token Distribution & Bottleneck Saliency
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {codeBlocks.length} Structural Blocks Partitioned
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="h-3 w-full bg-slate-800 rounded-md overflow-hidden flex">
            {codeBlocks.map((b) => {
              const bgClass =
                b.bottleneckRisk === 'high'
                  ? 'bg-rose-500 hover:bg-rose-400'
                  : b.bottleneckRisk === 'moderate'
                  ? 'bg-amber-500 hover:bg-amber-400'
                  : 'bg-emerald-500 hover:bg-emerald-400';
              return (
                <div
                  key={b.id}
                  style={{ width: `${Math.max(b.tokensPercentage, 4)}%` }}
                  onClick={() => {
                    setSelectedBlockId(b.id);
                    setViewMode('block-chart');
                  }}
                  className={`${bgClass} h-full transition-all cursor-pointer relative group border-r border-slate-950 last:border-r-0`}
                  title={`${b.name}: ${b.tokenCount} tokens (${b.tokensPercentage}%) - ${b.bottleneckRisk} risk`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>High Bottleneck (&ge; 3.5x reasoning)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Moderate Branching (2.0 - 3.4x)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Optimal Flow (&lt; 2.0x)</span>
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Click any block below or bar segment to inspect reasoning impact
            </span>
          </div>
        </div>
      )}

      {/* View Mode Switcher & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        {/* Mode selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setViewMode('block-chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              viewMode === 'block-chart'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
            <span>Block Token & Bottleneck Chart</span>
          </button>

          <button
            onClick={() => setViewMode('agent-heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              viewMode === 'agent-heatmap'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Agent Attention Heatmap</span>
          </button>

          <button
            onClick={() => setViewMode('semantic-roles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              viewMode === 'semantic-roles'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Semantic Role Breakdown</span>
          </button>

          <button
            onClick={() => setViewMode('bpe-raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              viewMode === 'bpe-raw'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Raw Subword BPE</span>
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 text-[11px] font-mono mr-1">Filter:</span>
          {(['all', 'memory', 'concurrency', 'types', 'control'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: COMPARATIVE BLOCK TOKEN CHART & REASONING BOTTLENECK ANALYSIS */}
      {viewMode === 'block-chart' && (
        <div className="space-y-6">
          {/* Summary Chart Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  Comparative Token Usage Across Code Blocks
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual bar comparison highlighting token consumption and reasoning expansion factors.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">
                  Total Code Budget: <span className="text-slate-100 font-bold">{analysis?.totalTokens || 0} tokens</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-bold">
                  Est. Reasoning: ~{totalEstimatedReasoningTokens} tokens
                </span>
              </div>
            </div>

            {/* Comparative Visual Bars */}
            <div className="space-y-4">
              {codeBlocks.map((block) => {
                const isSelected = activeSelectedBlock?.id === block.id;
                const isHigh = block.bottleneckRisk === 'high';
                const isModerate = block.bottleneckRisk === 'moderate';

                const borderClass = isSelected
                  ? isHigh
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-950/20'
                    : isModerate
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-950/20'
                    : 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/20'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700';

                const barGradient = isHigh
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : isModerate
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-400';

                const badgeClass = isHigh
                  ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                  : isModerate
                  ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700/60';

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${borderClass}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono border font-semibold ${badgeClass}`}>
                          {block.badge}
                        </span>
                        <span className="text-xs font-bold text-slate-100 font-mono">
                          {block.name}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">
                          · Lines {block.startLine}{block.startLine !== block.endLine ? `-${block.endLine}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-300 font-bold">
                          {block.tokenCount} tokens
                        </span>
                        <span className="text-slate-500">
                          ({block.tokensPercentage}%)
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border ${
                          isHigh
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : isModerate
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
                          {isHigh ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>High Bottleneck (~{block.reasoningExpansionMultiplier}x)</span>
                            </>
                          ) : isModerate ? (
                            <>
                              <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                              <span>Moderate Branching (~{block.reasoningExpansionMultiplier}x)</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Optimal Flow (~{block.reasoningExpansionMultiplier}x)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Proportional Bar Comparison */}
                    <div className="space-y-1">
                      <div className="h-3 w-full bg-slate-900 rounded-md overflow-hidden flex items-center border border-slate-800/80">
                        <div
                          style={{ width: `${Math.max(block.tokensPercentage, 3)}%` }}
                          className={`h-full ${barGradient} transition-all`}
                        />
                      </div>
                    </div>

                    {/* Sub-metrics & Hazard Tokens row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <div className="flex items-center gap-3">
                        <span>
                          Density: <span className="text-slate-200 font-semibold">{block.avgTokensPerLine} tok/line</span>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>
                          Compression: <span className="text-slate-200 font-semibold">{block.compressionRatio} B/tok</span>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>
                          Critical Invariants: <span className={`font-semibold ${block.criticalTokenCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{block.criticalTokenCount}</span>
                        </span>
                      </div>

                      {block.dominantTokens.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Key Subwords:</span>
                          {block.dominantTokens.map((tok, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]"
                            >
                              "{tok}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Reasoning Bottleneck Diagnostic Card for Selected Block */}
          {activeSelectedBlock && (
            <div className={`p-5 rounded-xl border bg-slate-900/40 space-y-4 ${
              activeSelectedBlock.bottleneckRisk === 'high'
                ? 'border-rose-500/50 shadow-sm shadow-rose-950'
                : activeSelectedBlock.bottleneckRisk === 'moderate'
                ? 'border-amber-500/50 shadow-sm shadow-amber-950'
                : 'border-emerald-500/50 shadow-sm shadow-emerald-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Flame className={`w-5 h-5 ${
                    activeSelectedBlock.bottleneckRisk === 'high'
                      ? 'text-rose-400'
                      : activeSelectedBlock.bottleneckRisk === 'moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      Reasoning Bottleneck Diagnostics: <span className="text-indigo-300 font-mono">{activeSelectedBlock.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluating cognitive branching, attention head contention, and &lt;think&gt; token expansion.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    Lines {activeSelectedBlock.startLine}-{activeSelectedBlock.endLine}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300 font-bold">
                    Est. &lt;think&gt; Burden: ~{activeSelectedBlock.estimatedReasoningTokens} tokens
                  </span>
                </div>
              </div>

              {/* Code Snippet for Selected Block */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Source Code Segment
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                  <pre>{activeSelectedBlock.codeSnippet}</pre>
                </div>
              </div>

              {/* Bottleneck Explanation & Engineering Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300 font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Cognitive Bottleneck Mechanism</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeSelectedBlock.bottleneckReason}
                  </p>
                  <div className="pt-2 border-t border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
                    <div>
                      <span className="text-slate-500">Reasoning Multiplier:</span>{' '}
                      <span className="text-amber-300 font-bold">~{activeSelectedBlock.reasoningExpansionMultiplier}x</span>
                    </div>
                    <div>
                      <span className="text-slate-500">KV Cache Invariant State:</span>{' '}
                      <span className="text-slate-300 font-semibold">{activeSelectedBlock.criticalTokenCount} active safety constraints</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 font-mono">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Recommended Engineering Refactoring</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeSelectedBlock.mitigationAdvice}
                  </p>
                  <div className="pt-2 border-t border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
                    <div>
                      <span className="text-slate-500">Target Efficiency:</span>{' '}
                      <span className="text-emerald-400 font-bold">&lt; 1.5x linear reasoning</span>
                    </div>
                    <div>
                      <span className="text-slate-500">GRPO / DPO Reward Impact:</span>{' '}
                      <span className="text-slate-300 font-semibold">Prevents hallucinated speculative branches in RL policy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2, 3, 4: INTERACTIVE TOKEN STREAM CANVAS */}
      {viewMode !== 'block-chart' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
          {/* Heatmap Legend */}
          {viewMode === 'agent-heatmap' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
              <div className="flex items-center gap-4">
                <span className="text-slate-400 font-semibold">Agent Saliency:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500/80 ring-2 ring-rose-400" />
                  <span className="text-rose-300">Critical Trigger (&ge; 0.90)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/60 ring-1 ring-amber-400" />
                  <span className="text-amber-300">High Invariant Focus (0.70 - 0.89)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-500/40" />
                  <span className="text-indigo-300">Structural Scope (0.35 - 0.69)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-800/80" />
                  <span className="text-slate-400">Contextual Base (&lt; 0.35)</span>
                </span>
              </div>

              <span className="text-slate-500 hidden md:inline">
                Selected Agent: <span className="text-indigo-400">{agentName}</span>
              </span>
            </div>
          )}

          {/* Semantic Role Legend */}
          {viewMode === 'semantic-roles' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
              <div className="flex items-center gap-4">
                <span className="text-slate-400 font-semibold">Roles:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-950 border border-rose-500" />
                  <span className="text-rose-300">Memory / Ownership</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-950 border border-amber-500" />
                  <span className="text-amber-300">Concurrency / Synchronization</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-950 border border-cyan-500" />
                  <span className="text-cyan-300">Type Bounds</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-950 border border-indigo-500" />
                  <span className="text-indigo-300">Control Invariants</span>
                </span>
              </div>
            </div>
          )}

          {/* Token boundary container */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs leading-8 max-h-[380px] overflow-y-auto flex flex-wrap gap-1 select-text">
            {filteredProfiles.map((profile) => {
              const token = profile.token;
              const isHovered = hoveredToken?.token.index === token.index;
              const isSelected = selectedToken?.token.index === token.index;

              let tokenStyle = '';
              if (viewMode === 'agent-heatmap') {
                if (profile.attentionScore >= 0.9) {
                  tokenStyle = 'bg-rose-950 text-rose-100 border-rose-500 font-bold ring-1 ring-rose-400 shadow-sm shadow-rose-950';
                } else if (profile.attentionScore >= 0.7) {
                  tokenStyle = 'bg-amber-950/80 text-amber-200 border-amber-500/80 font-semibold';
                } else if (profile.attentionScore >= 0.4) {
                  tokenStyle = 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60';
                } else {
                  tokenStyle = 'bg-slate-900/60 text-slate-400 border-slate-800';
                }
              } else if (viewMode === 'semantic-roles') {
                if (profile.category === 'memory') {
                  tokenStyle = 'bg-rose-950/80 text-rose-200 border-rose-600/70 font-semibold';
                } else if (profile.category === 'concurrency') {
                  tokenStyle = 'bg-amber-950/80 text-amber-200 border-amber-600/70 font-semibold';
                } else if (profile.category === 'types') {
                  tokenStyle = 'bg-cyan-950/80 text-cyan-200 border-cyan-600/70 font-semibold';
                } else if (profile.category === 'control') {
                  tokenStyle = 'bg-indigo-950/70 text-indigo-200 border-indigo-600/60';
                } else {
                  tokenStyle = 'bg-slate-900/60 text-slate-400 border-slate-800';
                }
              } else {
                tokenStyle = bpeColors[token.index % bpeColors.length];
              }

              return (
                <span
                  key={token.index}
                  onMouseEnter={() => setHoveredToken(profile)}
                  onMouseLeave={() => setHoveredToken(null)}
                  onClick={() => setSelectedToken(profile)}
                  className={`inline-block px-1.5 py-0.5 rounded border cursor-pointer transition-all ${tokenStyle} ${
                    isHovered || isSelected ? 'scale-110 ring-2 ring-indigo-400 z-10' : ''
                  }`}
                  title={`Token ${token.index}: ID ${token.id} (${profile.category})`}
                >
                  {token.text === ' ' ? '␣' : token.text === '\n' ? '↵\n' : token.text}
                </span>
              );
            })}
          </div>

          {/* Deep Token Cognitive Reasoning Inspector Card */}
          {(selectedToken || hoveredToken) && (
            <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/40 font-mono text-xs space-y-2">
              {(() => {
                const active = selectedToken || hoveredToken!;
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <Target className="w-4 h-4 text-indigo-400" />
                        <span className="text-slate-100 font-bold">
                          Token Inspection: <span className="text-indigo-300 font-extrabold bg-slate-900 px-2 py-0.5 rounded">"{active.token.text}"</span>
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">Index: {active.token.index}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-emerald-400 font-bold">Token ID: {active.token.id}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{active.token.byteLength} byte(s)</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 capitalize">
                          Role: <span className="text-indigo-400 font-semibold">{active.category}</span>
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-amber-400 font-bold">
                          Cognitive Attention: {(active.attentionScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-slate-300">
                      <div className="flex items-start gap-2">
                        <span className="text-indigo-400 font-semibold shrink-0">Agent Reasoning Deduction:</span>
                        <span className="leading-relaxed">{active.reasoningNote}</span>
                      </div>

                      {active.triggeredRule && (
                        <div className="flex items-center gap-2 text-rose-300 pt-1">
                          <span className="text-rose-400 font-semibold shrink-0">Associated Invariant Check:</span>
                          <span>{active.triggeredRule}</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Code Input Area with Tokenize Trigger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Editable Code Input ({selectedLang})</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyTokens}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-mono"
            >
              {copiedTokens ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedTokens ? 'Copied' : 'Copy Token IDs'}</span>
            </button>
            <button
              onClick={() => fetchTokenization(code, selectedLang)}
              disabled={loading}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono capitalize"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-tokenize & Evaluate Bottlenecks</span>
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            fetchTokenization(e.target.value, selectedLang);
          }}
          className="w-full p-4 font-mono text-xs leading-6 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
          placeholder="Paste or type code here to inspect how Qwen tokenizes and reasons about it..."
        />
      </div>
    </div>
  );
};

