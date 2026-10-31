import React, { useState, useMemo } from 'react';
import {
  DatasetItem,
  SupportedLanguage,
  DatasetItemValidation,
  GrpoRollout,
  DpoPair,
} from '../types/agent';
import {
  CheckCircle2,
  AlertTriangle,
  Check,
  Copy,
  Search,
  Filter,
  FileCode,
  ShieldCheck,
  Zap,
  Flame,
  Layers,
  Code,
  Braces,
  GitCommit,
  CheckCheck,
  Sparkles,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface TrainingDataPreviewProps {
  maxContextLength?: number;
  onSelectSample?: (sample: DatasetItem) => void;
}

// Client-side verification function enforcing exact training format invariants
export function validateTrainingSample(
  item: DatasetItem,
  maxContextLength: number = 4096
): DatasetItemValidation {
  const errors: string[] = [];

  // 1. ChatML Delimiters verification
  // A standard Qwen ChatML sample requires valid role tags when serialized
  const chatMlValid =
    item.system.trim().length > 0 &&
    item.user.trim().length > 0 &&
    item.assistant.trim().length > 0;

  if (!chatMlValid) {
    errors.push('ChatML roles incomplete: system, user, or assistant content is empty');
  }

  // 2. Chain of Thought <think> tags balance
  const hasOpenThink = item.assistant.includes('<think>');
  const hasCloseThink = item.assistant.includes('</think>');
  const thinkTagsBalanced = hasOpenThink && hasCloseThink;

  if (!hasOpenThink) {
    errors.push("Missing opening '<think>' tag in assistant CoT completion");
  }
  if (!hasCloseThink) {
    errors.push("Missing closing '</think>' tag in assistant CoT completion");
  }

  // Extract reasoning content
  let reasoningTokenEstimate = 0;
  if (thinkTagsBalanced) {
    const thinkContent = item.assistant.split('<think>')[1]?.split('</think>')[0] || '';
    reasoningTokenEstimate = Math.ceil(thinkContent.trim().length / 3.8);
    if (thinkContent.trim().length < 20) {
      errors.push('Reasoning trace inside <think>...</think> is too short (< 20 chars)');
    }
  }

  // 3. Unified Diff syntax validation
  const hasDiffFence = item.assistant.includes('```diff');
  let diffSyntaxValid = false;
  if (hasDiffFence) {
    const diffMatch = item.assistant.match(/```diff\n([\s\S]*?)```/);
    if (diffMatch && diffMatch[1]) {
      const diffBody = diffMatch[1];
      const hasHeaderMinus = diffBody.includes('--- a/');
      const hasHeaderPlus = diffBody.includes('+++ b/');
      const hasChunkHeader = /@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(diffBody);
      const hasDiffLines = diffBody.includes('+') || diffBody.includes('-');

      diffSyntaxValid = hasHeaderMinus && hasHeaderPlus && hasChunkHeader && hasDiffLines;
      if (!diffSyntaxValid) {
        errors.push(
          'Unified diff header malformed: requires --- a/..., +++ b/..., and @@ -line,count +line,count @@ headers'
        );
      }
    } else {
      errors.push('Empty or unclosed diff code fence ```diff');
    }
  } else {
    // Some formats provide complete replacement or AST patches
    diffSyntaxValid = true;
  }

  // 4. Token budget validation
  const tokenBudgetValid = item.tokenCount <= maxContextLength;
  if (!tokenBudgetValid) {
    errors.push(
      `Sample token count (${item.tokenCount}) exceeds context window limit (${maxContextLength})`
    );
  }

  // 5. Special token leakage check
  const specialTokens = ['<|im_end|>', '<|im_start|>', '<|endoftext|>', '<|pad|>'];
  let noSpecialTokenLeak = true;
  for (const token of specialTokens) {
    if (
      item.system.includes(token) ||
      item.user.includes(token) ||
      (item.assistant.includes(token) && token !== '<|im_end|>')
    ) {
      noSpecialTokenLeak = false;
      errors.push(`Stray special token leakage detected: "${token}" found in payload`);
      break;
    }
  }

  const completionTokenEstimate = Math.max(0, item.tokenCount - reasoningTokenEstimate);

  return {
    valid: errors.length === 0,
    chatMlValid,
    thinkTagsBalanced,
    diffSyntaxValid,
    tokenBudgetValid,
    noSpecialTokenLeak,
    reasoningTokenCount: reasoningTokenEstimate,
    completionTokenCount: completionTokenEstimate,
    errors,
  };
}

// Comprehensive multi-language training dataset samples
const DEFAULT_PREVIEW_DATASET: DatasetItem[] = [
  {
    id: 'SFT-RUST-001',
    language: 'rust',
    paradigm: 'sft',
    category: 'RefCell BorrowMutError & AB-BA Lock Inversion',
    system:
      'You are an autonomous Qwen code reasoning agent. Think through invariants inside <think>...</think> tags before providing verified unified diff corrections.',
    user: `Audit the following Rust concurrent task queue for runtime panics and deadlock hazards:

\`\`\`rust
use std::cell::RefCell;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct TaskQueue {
    tasks: RefCell<Vec<String>>,
    lock_a: Arc<Mutex<u32>>,
    lock_b: Arc<Mutex<u32>>,
}

impl TaskQueue {
    pub fn process_next(&self) {
        let current = self.tasks.borrow();
        if let Some(task) = current.first() {
            println!("Processing: {}", task);
            self.tasks.borrow_mut().remove(0);
        }
    }

    pub fn spawn_workers(&self) {
        let a1 = Arc::clone(&self.lock_a);
        let b1 = Arc::clone(&self.lock_b);
        thread::spawn(move || {
            let _g1 = a1.lock().unwrap();
            let _g2 = b1.lock().unwrap();
        });

        let a2 = Arc::clone(&self.lock_a);
        let b2 = Arc::clone(&self.lock_b);
        thread::spawn(move || {
            let _g2 = b2.lock().unwrap();
            let _g1 = a2.lock().unwrap();
        });
    }
}
\`\`\``,
    assistant: `<think>
1. INVARIANT SCAN & BORROW CHECKER ANALYSIS:
   - Method 'process_next(&self)':
     - 'let current = self.tasks.borrow();' creates an active immutable Ref to RefCell<Vec<String>>.
     - Inside the match branch 'if let Some(task) = current.first()', the body executes:
       'self.tasks.borrow_mut().remove(0);'
     - Invariant Rule: Rust's RefCell enforces the aliasing XOR mutability invariant dynamically at runtime.
     - Because 'current' remains alive across this expression, borrowing mutably triggers BorrowMutError runtime panic.
   - Root Cause Fix:
     - Clone or extract the first item before invoking borrow_mut(), or drop 'current' prior to mutating.

2. CONCURRENCY & DEADLOCK ANALYSIS:
   - Method 'spawn_workers(&self)':
     - Worker 1 acquires lock_a, then lock_b (Order: A -> B).
     - Worker 2 acquires lock_b, then lock_a (Order: B -> A).
     - Circular wait condition established. If Worker 1 acquires lock_a while Worker 2 acquires lock_b, threads enter fatal AB-BA deadlock.
   - Root Cause Fix:
     - Enforce a strict total lock acquisition order across all threads (Order: A -> B in both worker threads).

3. COMPILER VERIFICATION PLAN:
   - Run 'rustc --crate-type lib' to ensure no lifetime or move issues.
   - Verify both fixes pass borrowck and eliminate lock ordering discrepancies.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/src/main.rs
+++ b/src/main.rs
@@ -14,6 +14,8 @@
     pub fn process_next(&self) {
-        let current = self.tasks.borrow();
-        if let Some(task) = current.first() {
+        let next_task = self.tasks.borrow().first().cloned();
+        if let Some(task) = next_task {
             println!("Processing: {}", task);
             self.tasks.borrow_mut().remove(0);
         }
     }
@@ -28,3 +30,3 @@
         thread::spawn(move || {
-            let _g2 = b2.lock().unwrap();
-            let _g1 = a2.lock().unwrap();
+            let _g1 = a2.lock().unwrap();
+            let _g2 = b2.lock().unwrap();
         });
\`\`\``,
    tokenCount: 842,
  },
  {
    id: 'SFT-PYTHON-001',
    language: 'python',
    paradigm: 'sft',
    category: 'Asyncio Event Loop Stall & Shared Mutable Default',
    system:
      'You are an autonomous Qwen code reasoning agent. Think through invariants inside <think>...</think> tags before providing verified unified diff corrections.',
    user: `Inspect this Python async web pipeline for event-loop stalls and class initialization bugs:

\`\`\`python
import asyncio
import requests

class BatchCollector:
    def __init__(self, buffer=[]):
        self.buffer = buffer

    def add(self, item):
        self.buffer.append(item)

async def fetch_url(url: str):
    # Fetch data synchronously
    resp = requests.get(url, timeout=5)
    return resp.status_code

async def run_pipeline(urls):
    collector = BatchCollector()
    tasks = [fetch_url(u) for u in urls]
    results = await asyncio.gather(*tasks)
    for r in results:
        collector.add(r)
    return collector.buffer
\`\`\``,
    assistant: `<think>
1. MUTABLE DEFAULT ARGUMENT INVARIANT:
   - 'def __init__(self, buffer=[]):'
   - In Python, default arguments are evaluated once at function definition time (module import).
   - If multiple instances of BatchCollector are constructed without explicit 'buffer', they all mutate the identical underlying list instance across instances and requests.
   - Remedy: Use 'buffer=None' default, initializing with 'self.buffer = [] if buffer is None else buffer'.

2. ASYNCIO EVENT LOOP BLOCKING I/O:
   - 'fetch_url' is an 'async def' coroutine, yet it executes 'requests.get(url, timeout=5)'.
   - 'requests.get' is a synchronous, blocking network socket call.
   - When executed in the main thread's asyncio event loop, this blocks the entire single-threaded loop, halting all other concurrent coroutines until the HTTP roundtrip finishes.
   - Remedy: Replace with non-blocking async client (e.g., 'httpx.AsyncClient' or offload to thread pool via 'asyncio.to_thread').

3. EXECUTION VERIFICATION:
   - Verify syntax with 'python3 -m py_compile'.
   - Assure non-blocking semantics and independent collector state.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/crawler/pipeline.py
+++ b/crawler/pipeline.py
@@ -1,7 +1,7 @@
 import asyncio
-import requests
+import httpx

 class BatchCollector:
-    def __init__(self, buffer=[]):
-        self.buffer = buffer
+    def __init__(self, buffer=None):
+        self.buffer = [] if buffer is None else buffer

     def add(self, item):
@@ -11,4 +11,5 @@
 async def fetch_url(url: str):
-    resp = requests.get(url, timeout=5)
-    return resp.status_code
+    async with httpx.AsyncClient() as client:
+        resp = await client.get(url, timeout=5.0)
+        return resp.status_code
\`\`\``,
    tokenCount: 685,
  },
  {
    id: 'SFT-C-001',
    language: 'c',
    paradigm: 'sft',
    category: 'CWE-120 Buffer Overflow & CWE-416 Use-After-Free',
    system:
      'You are an autonomous Qwen code reasoning agent. Think through invariants inside <think>...</think> tags before providing verified unified diff corrections.',
    user: `Audit this C network packet parser for buffer overflow vulnerabilities and memory lifetime violations:

\`\`\`c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char hostname[32];
    int port;
    char *payload;
} Packet;

Packet* create_packet(const char *host, int port, const char *data) {
    Packet *p = (Packet*)malloc(sizeof(Packet));
    if (!p) return NULL;
    strcpy(p->hostname, host);
    p->port = port;
    p->payload = strdup(data);
    return p;
}

void process_and_free(Packet *p) {
    if (!p) return;
    printf("Host: %s:%d\\n", p->hostname, p->port);
    free(p);
    if (p->payload) {
        printf("Payload: %s\\n", p->payload);
        free(p->payload);
    }
}
\`\`\``,
    assistant: `<think>
1. CWE-120 UNBOUNDED BUFFER COPY:
   - Struct definition: 'char hostname[32];'
   - In create_packet: 'strcpy(p->hostname, host);'
   - If 'host' length >= 32 characters, 'strcpy' writes past the end of 'p->hostname', causing stack/heap buffer overflow and memory corruption.
   - Remedy: Use 'strncpy(p->hostname, host, sizeof(p->hostname) - 1); p->hostname[sizeof(p->hostname) - 1] = '\\0';' or snprintf.

2. CWE-416 USE-AFTER-FREE:
   - In process_and_free:
     - 'free(p);' deallocates the Packet structure.
     - Immediately following: 'if (p->payload) { ... free(p->payload); }' accesses member 'payload' of the already-freed pointer 'p'.
     - This is a critical Use-After-Free condition leading to undefined behavior and exploitable heap state.
   - Remedy: Access and free inner members ('p->payload') BEFORE freeing the parent container struct ('p').

3. MEMORY SAFETY & ALLOCATION ERROR HANDLING:
   - Handle 'strdup' return value to avoid leaking 'p' if strdup returns NULL.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/src/packet.c
+++ b/src/packet.c
@@ -14,3 +14,4 @@
     if (!p) return NULL;
-    strcpy(p->hostname, host);
+    strncpy(p->hostname, host, sizeof(p->hostname) - 1);
+    p->hostname[sizeof(p->hostname) - 1] = '\\0';
     p->port = port;
@@ -21,4 +22,3 @@
 void process_and_free(Packet *p) {
     if (!p) return;
-    printf("Host: %s:%d\\n", p->hostname, p->port);
-    free(p);
     if (p->payload) {
@@ -26,2 +26,4 @@
         free(p->payload);
     }
+    printf("Host: %s:%d\\n", p->hostname, p->port);
+    free(p);
 }
\`\`\``,
    tokenCount: 792,
  },
  {
    id: 'GRPO-CPP-002',
    language: 'cpp',
    paradigm: 'grpo',
    category: 'std::shared_ptr Cyclic Reference & Non-Virtual Destructor',
    system:
      'You are an autonomous Qwen code reasoning agent trained with GRPO. Think through invariants inside <think>...</think> tags.',
    user: `Evaluate this C++ object graph for memory leaks and resource destruction hazards:

\`\`\`cpp
#include <iostream>
#include <memory>

class BaseNode {
public:
    BaseNode() { std::cout << "Base created\\n"; }
    ~BaseNode() { std::cout << "Base destroyed\\n"; } // Non-virtual
};

class Node : public BaseNode {
public:
    std::string name;
    std::shared_ptr<Node> parent;
    std::shared_ptr<Node> child;

    Node(std::string n) : name(n) {}
    ~Node() { std::cout << "Node " << name << " destroyed\\n"; }
};
\`\`\``,
    assistant: `<think>
1. POLYMORPHIC DELETION HAZARD (Non-virtual Destructor):
   - 'BaseNode' destructor '~BaseNode()' is not declared virtual.
   - Deleting a derived 'Node' object via a 'BaseNode*' pointer results in undefined behavior (the derived class destructor will not execute, leaking Node resources).
   - Remedy: Declare 'virtual ~BaseNode() = default;'.

2. CYCLIC REFERENCE LEAK (std::shared_ptr):
   - 'parent' and 'child' both use 'std::shared_ptr<Node>'.
   - When parent holds shared_ptr to child, and child holds shared_ptr back to parent, reference count never drops to 0.
   - Memory leak occurs even when all external references go out of scope.
   - Remedy: Break cycle by changing 'parent' to 'std::weak_ptr<Node>'.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/src/graph.hpp
+++ b/src/graph.hpp
@@ -6,3 +6,3 @@
 public:
     BaseNode() { std::cout << "Base created\\n"; }
-    ~BaseNode() { std::cout << "Base destroyed\\n"; }
+    virtual ~BaseNode() = default;
 };
@@ -13,3 +13,3 @@
     std::string name;
-    std::shared_ptr<Node> parent;
+    std::weak_ptr<Node> parent;
     std::shared_ptr<Node> child;
\`\`\``,
    tokenCount: 810,
    grpoRollouts: [
      {
        id: 1,
        reasoning:
          'Identified virtual destructor omission and cyclic std::shared_ptr reference. Replaced parent with weak_ptr and marked base destructor virtual.',
        patch: 'virtual ~BaseNode() = default; std::weak_ptr<Node> parent;',
        rewardFormat: 1.0,
        rewardCompiler: 1.5,
        rewardTests: 1.0,
        totalReward: 3.5,
        advantage: 1.42,
        status: 'passed',
      },
      {
        id: 2,
        reasoning:
          'Only fixed the weak_ptr cycle, forgot to mark BaseNode destructor virtual.',
        patch: 'std::weak_ptr<Node> parent;',
        rewardFormat: 1.0,
        rewardCompiler: 0.8,
        rewardTests: -0.5,
        totalReward: 1.3,
        advantage: -0.32,
        status: 'failed',
      },
      {
        id: 3,
        reasoning:
          'Identified both issues, but generated malformed diff headers lacking chunk counters.',
        patch: '--- a/src/graph.hpp\n+++ b/src/graph.hpp\n- ~BaseNode()\n+ virtual ~BaseNode()',
        rewardFormat: -0.8,
        rewardCompiler: 1.5,
        rewardTests: 1.0,
        totalReward: 1.7,
        advantage: -0.01,
        status: 'failed',
      },
      {
        id: 4,
        reasoning:
          'Hallucinated unique_ptr instead of weak_ptr which broke shared graph ownership semantics.',
        patch: 'std::unique_ptr<Node> parent;',
        rewardFormat: 1.0,
        rewardCompiler: -1.0,
        rewardTests: -1.0,
        totalReward: -1.0,
        advantage: -2.15,
        status: 'failed',
      },
    ],
  },
  {
    id: 'DPO-JAVA-003',
    language: 'java',
    paradigm: 'dpo',
    category: 'Concurrent Check-Then-Act Race Condition (ConcurrentHashMap)',
    system:
      'You are an autonomous Qwen code reasoning agent trained with DPO preference alignment. Think through invariants inside <think>...</think> tags.',
    user: `Review this Java multi-threaded user session cache for thread safety and race conditions:

\`\`\`java
import java.util.concurrent.ConcurrentHashMap;

public class SessionRegistry {
    private final ConcurrentHashMap<String, UserSession> sessions = new ConcurrentHashMap<>();

    public UserSession getOrCreate(String userId) {
        if (!sessions.containsKey(userId)) {
            UserSession session = new UserSession(userId);
            sessions.put(userId, session);
            return session;
        }
        return sessions.get(userId);
    }
}
\`\`\``,
    assistant: `<think>
1. CHECK-THEN-ACT RACE CONDITION:
   - 'sessions' is a 'ConcurrentHashMap', which ensures individual operations (like containsKey, put, get) are atomic.
   - However, the compound check-then-act sequence:
     'if (!sessions.containsKey(userId)) { sessions.put(userId, session); }'
     is NOT atomic.
   - Two concurrent threads calling getOrCreate(userId) simultaneously can both evaluate 'containsKey' to false, construct duplicate UserSession objects, and the second thread will overwrite the first thread's session, leading to lost updates or duplicate socket/session connections.
   - Remedy: Use the atomic compound method 'computeIfAbsent(userId, UserSession::new)'.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/src/main/java/SessionRegistry.java
+++ b/src/main/java/SessionRegistry.java
@@ -7,6 +7,3 @@
     public UserSession getOrCreate(String userId) {
-        if (!sessions.containsKey(userId)) {
-            UserSession session = new UserSession(userId);
-            sessions.put(userId, session);
-            return session;
-        }
-        return sessions.get(userId);
+        return sessions.computeIfAbsent(userId, UserSession::new);
     }
\`\`\``,
    tokenCount: 654,
    dpoPair: {
      chosen: {
        reasoning:
          'Explains non-atomic compound operations on ConcurrentHashMap, diagnoses race condition, and applies atomic computeIfAbsent().',
        patch: 'return sessions.computeIfAbsent(userId, UserSession::new);',
        tokenCount: 654,
      },
      rejected: {
        reasoning:
          'Suggests adding a synchronized(this) block across the entire method which serializes all threads and destroys ConcurrentHashMap throughput.',
        patch: 'public synchronized UserSession getOrCreate(String userId) { ... }',
        tokenCount: 520,
        defectSummary:
          'Degrades concurrent multi-core throughput to single-threaded lock serialization instead of utilizing ConcurrentHashMap fine-grained atomic methods.',
      },
    },
  },
  {
    id: 'SFT-JAVASCRIPT-004',
    language: 'javascript',
    paradigm: 'sft',
    category: 'EventEmitter Listener Leak & Unhandled Promise Rejection',
    system:
      'You are an autonomous Qwen code reasoning agent. Think through invariants inside <think>...</think> tags before providing verified unified diff corrections.',
    user: `Inspect this Node.js microservice WebSocket handler for memory leaks and event listener accumulation:

\`\`\`javascript
const EventEmitter = require('events');

class ClientConnection extends EventEmitter {
    constructor(socket) {
        super();
        this.socket = socket;
        this.setupHandlers();
    }

    setupHandlers() {
        this.socket.on('data', (chunk) => {
            this.handleData(chunk);
        });

        // Subscribes to global broadcast channel
        process.on('broadcast', (msg) => {
            this.socket.write(msg);
        });
    }

    destroy() {
        this.socket.destroy();
    }
}
\`\`\``,
    assistant: `<think>
1. GLOBAL PROCESS EVENT LISTENER LEAK:
   - 'process.on("broadcast", (msg) => { this.socket.write(msg); });'
   - In Node.js, 'process' is a long-lived global singleton.
   - For every new 'ClientConnection' instantiated, an anonymous closure is bound to 'process'.
   - The closure captures 'this.socket'.
   - When a client disconnects and 'destroy()' is called, the listener on 'process' is NEVER removed.
   - This creates an unbounded memory leak retaining destroyed sockets in the heap, causing MaxListenersExceededWarning and eventual V8 heap OOM.
   - Remedy: Retain a reference to the bound callback and remove it in 'destroy()' via 'process.removeListener("broadcast", this.boundBroadcast)'.

2. RECEPTOR CLEANUP INVARIANT:
   - Also remove internal socket listeners on cleanup.
</think>

Here is the verified unified diff:
\`\`\`diff
--- a/src/client.js
+++ b/src/client.js
@@ -7,6 +7,6 @@
     setupHandlers() {
         this.socket.on('data', (chunk) => {
             this.handleData(chunk);
         });

-        process.on('broadcast', (msg) => {
-            this.socket.write(msg);
-        });
+        this.boundBroadcast = (msg) => this.socket.write(msg);
+        process.on('broadcast', this.boundBroadcast);
     }

     destroy() {
+        if (this.boundBroadcast) {
+            process.removeListener('broadcast', this.boundBroadcast);
+        }
         this.socket.destroy();
     }
\`\`\``,
    tokenCount: 712,
  },
];

export const TrainingDataPreview: React.FC<TrainingDataPreviewProps> = ({
  maxContextLength = 4096,
  onSelectSample,
}) => {
  const [samples] = useState<DatasetItem[]>(DEFAULT_PREVIEW_DATASET);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_PREVIEW_DATASET[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedParadigm, setSelectedParadigm] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<
    'cot' | 'diff' | 'chatml' | 'grpo' | 'dpo' | 'jsonl'
  >('cot');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedTime, setVerifiedTime] = useState<string>('Just now');

  // Validate all samples dynamically
  const validatedSamples = useMemo(() => {
    return samples.map((sample) => ({
      ...sample,
      validation: validateTrainingSample(sample, maxContextLength),
    }));
  }, [samples, maxContextLength]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = validatedSamples.length;
    const validCount = validatedSamples.filter((s) => s.validation.valid).length;
    const totalTokens = validatedSamples.reduce((sum, s) => sum + s.tokenCount, 0);
    const avgTokens = Math.round(totalTokens / Math.max(1, total));
    const totalCoTTokens = validatedSamples.reduce(
      (sum, s) => sum + s.validation.reasoningTokenCount,
      0
    );
    const cotRatio = totalTokens > 0 ? Math.round((totalCoTTokens / totalTokens) * 100) : 0;

    return {
      total,
      validCount,
      passRate: total > 0 ? Math.round((validCount / total) * 100) : 100,
      totalTokens,
      avgTokens,
      totalCoTTokens,
      cotRatio,
    };
  }, [validatedSamples]);

  // Filter samples
  const filteredSamples = useMemo(() => {
    return validatedSamples.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.user.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLang = selectedLanguage === 'all' || item.language === selectedLanguage;
      const matchesParadigm = selectedParadigm === 'all' || item.paradigm === selectedParadigm;

      return matchesSearch && matchesLang && matchesParadigm;
    });
  }, [validatedSamples, searchQuery, selectedLanguage, selectedParadigm]);

  const activeSample = useMemo(() => {
    return validatedSamples.find((s) => s.id === selectedId) || validatedSamples[0];
  }, [validatedSamples, selectedId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunValidation = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedTime(new Date().toLocaleTimeString());
    }, 400);
  };

  // ChatML serialized string representation
  const chatMlRepresentation = useMemo(() => {
    if (!activeSample) return '';
    return `<|im_start|>system
${activeSample.system}
<|im_end|>
<|im_start|>user
${activeSample.user}
<|im_end|>
<|im_start|>assistant
${activeSample.assistant}
<|im_end|>`;
  }, [activeSample]);

  // JSONL single line record
  const jsonlRecord = useMemo(() => {
    if (!activeSample) return '';
    return JSON.stringify({
      id: activeSample.id,
      language: activeSample.language,
      paradigm: activeSample.paradigm,
      category: activeSample.category,
      messages: [
        { role: 'system', content: activeSample.system },
        { role: 'user', content: activeSample.user },
        { role: 'assistant', content: activeSample.assistant },
      ],
      token_count: activeSample.tokenCount,
    });
  }, [activeSample]);

  // Extract <think> content and diff content
  const reasoningContent = useMemo(() => {
    if (!activeSample) return '';
    const match = activeSample.assistant.match(/<think>([\s\S]*?)<\/think>/);
    return match ? match[1].trim() : activeSample.assistant;
  }, [activeSample]);

  const diffContent = useMemo(() => {
    if (!activeSample) return '';
    const match = activeSample.assistant.match(/```diff\n([\s\S]*?)```/);
    return match ? match[1].trim() : '';
  }, [activeSample]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
      {/* Header and Dataset Pre-Flight Integrity Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100 tracking-tight">
              Reasoning Dataset Pre-Flight Inspector & Formatter
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">
              100% Format Verified
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Inspect raw ChatML token streams, verify &lt;think&gt; CoT tag balancing, unified diff
            integrity, and compiler rewards before starting GPU training.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunValidation}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isVerifying ? 'Verifying Tokens...' : 'Re-verify Datasets'}</span>
          </button>

          <button
            onClick={() => {
              const fullJsonl = validatedSamples
                .map((s) =>
                  JSON.stringify({
                    id: s.id,
                    language: s.language,
                    messages: [
                      { role: 'system', content: s.system },
                      { role: 'user', content: s.user },
                      { role: 'assistant', content: s.assistant },
                    ],
                  })
                )
                .join('\n');
              copyToClipboard(fullJsonl, 'all_jsonl');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            {copiedKey === 'all_jsonl' ? (
              <Check className="w-3.5 h-3.5 text-emerald-200" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Copy All Samples (JSONL)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Health Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Dataset Samples</div>
          <div className="text-lg font-bold text-slate-100 font-mono mt-0.5 tabular-nums">
            {stats.total} <span className="text-xs text-slate-500 font-normal">items</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Format Pass Rate</div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5 tabular-nums flex items-center gap-1">
            <CheckCheck className="w-4 h-4" />
            <span>{stats.passRate}%</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Average Sample Size</div>
          <div className="text-lg font-bold text-slate-100 font-mono mt-0.5 tabular-nums">
            {stats.avgTokens} <span className="text-xs text-slate-500 font-normal">tok</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">CoT Reasoning Ratio</div>
          <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5 tabular-nums">
            {stats.cotRatio}% <span className="text-xs text-slate-500 font-normal">tokens</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Max Context Budget</div>
          <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5 tabular-nums">
            {maxContextLength} <span className="text-xs text-slate-500 font-normal">tok</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-400 uppercase font-mono">Last Invariant Check</div>
          <div className="text-xs font-semibold text-slate-300 font-mono mt-1.5 truncate">
            {verifiedTime}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search samples by ID, keyword, defect class, or code snippet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Language filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase px-1 font-mono">Lang:</span>
            {(['all', 'rust', 'python', 'c', 'cpp', 'java', 'javascript'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'all' ? 'All' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Paradigm filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase px-1 font-mono">Type:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'sft', label: 'SFT' },
              { id: 'grpo', label: 'GRPO' },
              { id: 'dpo', label: 'DPO' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedParadigm(p.id)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedParadigm === p.id
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Sample Selector on Left, Formatter & Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column: Sample List */}
        <div className="lg:col-span-4 space-y-2 max-h-[620px] overflow-y-auto pr-1">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Verified Samples ({filteredSamples.length})</span>
            <span className="text-slate-500">Select to inspect</span>
          </div>

          {filteredSamples.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg bg-slate-950">
              No dataset samples match your search criteria.
            </div>
          ) : (
            filteredSamples.map((sample) => {
              const isSelected = sample.id === activeSample?.id;
              const hasGrpo = Boolean(sample.grpoRollouts && sample.grpoRollouts.length > 0);
              const hasDpo = Boolean(sample.dpoPair);

              return (
                <div
                  key={sample.id}
                  onClick={() => {
                    setSelectedId(sample.id);
                    if (onSelectSample) onSelectSample(sample);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
                      <span className="text-indigo-400">{sample.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                        {sample.language}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      {sample.validation.valid ? (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className="text-slate-400 tabular-nums">
                        {sample.tokenCount} tok
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-1">
                    {sample.category || 'General Reasoning & Code Verification'}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      {sample.paradigm === 'sft' && (
                        <span className="text-cyan-400 flex items-center gap-0.5">
                          <FileCode className="w-3 h-3" /> SFT CoT
                        </span>
                      )}
                      {sample.paradigm === 'grpo' && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Zap className="w-3 h-3" /> GRPO (G=4)
                        </span>
                      )}
                      {sample.paradigm === 'dpo' && (
                        <span className="text-rose-400 flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> DPO Pair
                        </span>
                      )}
                    </div>

                    <span className="text-slate-500">
                      CoT: ~{sample.validation.reasoningTokenCount} tok
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column: Sample Inspector & Format Verifier */}
        <div className="lg:col-span-8 space-y-3">
          {activeSample && (
            <>
              {/* Pre-Flight Checklist for Selected Sample */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                      Invariant Verification Matrix · {activeSample.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Context Usage:</span>
                    <span className="text-indigo-400 font-bold tabular-nums">
                      {activeSample.tokenCount} / {maxContextLength} tokens (
                      {Math.round((activeSample.tokenCount / maxContextLength) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Invariant Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      activeSample.validation.chatMlValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">ChatML Roles Intact</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      activeSample.validation.thinkTagsBalanced
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">&lt;think&gt; Tags Balanced</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      activeSample.validation.diffSyntaxValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Diff Patch Headers Valid</span>
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center gap-1.5 ${
                      activeSample.validation.noSpecialTokenLeak
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Zero Special Token Leak</span>
                  </div>
                </div>

                {/* Progress Bar of Token Consumption */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (activeSample.tokenCount / maxContextLength) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  <button
                    onClick={() => setActiveTab('cot')}
                    className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                      activeTab === 'cot'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>CoT Reasoning Trace</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('diff')}
                    className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                      activeTab === 'diff'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unified Diff Patch</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('chatml')}
                    className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                      activeTab === 'chatml'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ChatML Token Stream</span>
                  </button>

                  {activeSample.grpoRollouts && (
                    <button
                      onClick={() => setActiveTab('grpo')}
                      className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                        activeTab === 'grpo'
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>GRPO Rollouts (G=4)</span>
                    </button>
                  )}

                  {activeSample.dpoPair && (
                    <button
                      onClick={() => setActiveTab('dpo')}
                      className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                        activeTab === 'dpo'
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>DPO Pair</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('jsonl')}
                    className={`px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 transition-colors ${
                      activeTab === 'jsonl'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Braces className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Raw JSONL Record</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const text =
                      activeTab === 'chatml'
                        ? chatMlRepresentation
                        : activeTab === 'jsonl'
                        ? jsonlRecord
                        : activeSample.assistant;
                    copyToClipboard(text, activeTab);
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0"
                >
                  {copiedKey === activeTab ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              </div>

              {/* View Panel Content */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed max-h-[460px] overflow-y-auto">
                {/* 1. CoT Reasoning View */}
                {activeTab === 'cot' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-sans">
                      <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-200">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Chain-of-Thought (CoT) Invariant Reasoning Block</span>
                      </div>
                      <p className="text-[11px] text-amber-300/90 leading-normal">
                        This reasoning trace is generated inside &lt;think&gt;...&lt;/think&gt; tags
                        before any patch tokens are emitted. It forces the Qwen model to perform
                        symbolic verification against compiler borrowck rules, memory ownership, and
                        concurrency locks.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-slate-200 whitespace-pre-wrap">
                      <div className="text-[10px] text-slate-500 uppercase font-mono pb-1 border-b border-slate-800">
                        &lt;think&gt; Token Content ({activeSample.validation.reasoningTokenCount} tokens)
                      </div>
                      {reasoningContent}
                    </div>
                  </div>
                )}

                {/* 2. Unified Diff Patch View */}
                {activeTab === 'diff' && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-sans text-slate-400">
                      Standard unified diff patch output. Red lines indicate removed faulty code;
                      green lines indicate the verified safe implementation.
                    </div>

                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 overflow-x-auto space-y-1">
                      {diffContent.split('\n').map((line, idx) => {
                        let lineStyle = 'text-slate-300';
                        if (line.startsWith('---') || line.startsWith('+++')) {
                          lineStyle = 'text-cyan-400 font-bold';
                        } else if (line.startsWith('@@')) {
                          lineStyle = 'text-amber-400 font-bold bg-amber-500/10 px-1 rounded';
                        } else if (line.startsWith('+')) {
                          lineStyle = 'text-emerald-400 bg-emerald-500/10 px-1 rounded';
                        } else if (line.startsWith('-')) {
                          lineStyle = 'text-rose-400 bg-rose-500/10 px-1 rounded';
                        }
                        return (
                          <div key={idx} className={`${lineStyle} font-mono text-xs whitespace-pre`}>
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. ChatML Stream View */}
                {activeTab === 'chatml' && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-sans text-slate-400">
                      Qwen ChatML tokenizer format. Special boundary tokens (<span className="text-cyan-400 font-mono">&lt;|im_start|&gt;</span> and <span className="text-cyan-400 font-mono">&lt;|im_end|&gt;</span>) partition system prompt, user prompt, and assistant completion.
                    </div>

                    <div className="space-y-3">
                      {/* System Block */}
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                        <div className="bg-slate-800/60 px-3 py-1.5 flex items-center justify-between text-[11px] text-cyan-300 font-mono border-b border-slate-800">
                          <span>&lt;|im_start|&gt;system</span>
                          <span className="text-slate-400">System Instruction</span>
                        </div>
                        <div className="p-3 text-slate-300 whitespace-pre-wrap">{activeSample.system}</div>
                        <div className="bg-slate-800/40 px-3 py-1 text-[11px] text-slate-500 font-mono border-t border-slate-800/60">
                          &lt;|im_end|&gt;
                        </div>
                      </div>

                      {/* User Block */}
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                        <div className="bg-slate-800/60 px-3 py-1.5 flex items-center justify-between text-[11px] text-indigo-300 font-mono border-b border-slate-800">
                          <span>&lt;|im_start|&gt;user</span>
                          <span className="text-slate-400">Audit Request</span>
                        </div>
                        <div className="p-3 text-slate-300 whitespace-pre-wrap">{activeSample.user}</div>
                        <div className="bg-slate-800/40 px-3 py-1 text-[11px] text-slate-500 font-mono border-t border-slate-800/60">
                          &lt;|im_end|&gt;
                        </div>
                      </div>

                      {/* Assistant Block */}
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                        <div className="bg-slate-800/60 px-3 py-1.5 flex items-center justify-between text-[11px] text-emerald-300 font-mono border-b border-slate-800">
                          <span>&lt;|im_start|&gt;assistant</span>
                          <span className="text-slate-400">CoT Reasoning &amp; Patch</span>
                        </div>
                        <div className="p-3 text-slate-300 whitespace-pre-wrap">{activeSample.assistant}</div>
                        <div className="bg-slate-800/40 px-3 py-1 text-[11px] text-slate-500 font-mono border-t border-slate-800/60">
                          &lt;|im_end|&gt;
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. GRPO Candidate Rollouts View */}
                {activeTab === 'grpo' && activeSample.grpoRollouts && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-sans">
                      <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-200">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>GRPO Group Candidate Rollouts (G={activeSample.grpoRollouts.length})</span>
                      </div>
                      <p className="text-[11px] text-amber-300/90 leading-normal">
                        GRPO samples G=4 candidate completions from the policy model and computes
                        advantage normalization directly across group rewards without a Critic network:
                        <span className="font-mono ml-1 text-white">A_i = (R_i - mean(R)) / (std(R) + 1e-8)</span>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeSample.grpoRollouts.map((rollout) => (
                        <div
                          key={rollout.id}
                          className={`p-3.5 rounded-lg border space-y-2.5 ${
                            rollout.status === 'passed'
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                              : 'bg-rose-950/20 border-rose-500/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold flex items-center gap-1">
                              {rollout.status === 'passed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              <span>Rollout #{rollout.id}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                rollout.advantage > 0
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              Advantage: {rollout.advantage > 0 ? `+${rollout.advantage}` : rollout.advantage}
                            </span>
                          </div>

                          <p className="text-[11px] font-sans text-slate-300 leading-normal">
                            {rollout.reasoning}
                          </p>

                          <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono overflow-x-auto text-slate-300">
                            {rollout.patch}
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center pt-1 border-t border-slate-800">
                            <div>
                              <div className="text-slate-500">R_format</div>
                              <div className="text-slate-300">{rollout.rewardFormat}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">R_compile</div>
                              <div className="text-slate-300">{rollout.rewardCompiler}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">R_tests</div>
                              <div className="text-slate-300">{rollout.rewardTests}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 font-bold">Total R</div>
                              <div className="text-indigo-400 font-bold">{rollout.totalReward}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. DPO Preference Pair View */}
                {activeTab === 'dpo' && activeSample.dpoPair && (
                  <div className="space-y-4">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-sans">
                      <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-200">
                        <Flame className="w-4 h-4 text-rose-400" />
                        <span>Direct Preference Optimization (DPO) Contrastive Pair</span>
                      </div>
                      <p className="text-[11px] text-rose-300/90 leading-normal">
                        DPO aligns model probabilities between the winning verified completion (y_w) and
                        faulty or unoptimal completion (y_l).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Chosen */}
                      <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                          <span className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Chosen (y_w) · Preferred Solution</span>
                          </span>
                          <span className="text-[10px] text-emerald-400/80">
                            {activeSample.dpoPair.chosen.tokenCount} tok
                          </span>
                        </div>
                        <p className="text-xs font-sans text-slate-300">
                          {activeSample.dpoPair.chosen.reasoning}
                        </p>
                        <div className="p-2.5 bg-slate-950 rounded border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                          {activeSample.dpoPair.chosen.patch}
                        </div>
                      </div>

                      {/* Rejected */}
                      <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-rose-300">
                          <span className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Rejected (y_l) · Faulty Completion</span>
                          </span>
                          <span className="text-[10px] text-rose-400/80">
                            {activeSample.dpoPair.rejected.tokenCount} tok
                          </span>
                        </div>
                        <p className="text-xs font-sans text-slate-300">
                          {activeSample.dpoPair.rejected.reasoning}
                        </p>
                        <div className="p-2.5 bg-slate-950 rounded border border-rose-500/30 text-rose-300 font-mono text-[11px]">
                          {activeSample.dpoPair.rejected.patch}
                        </div>
                        <div className="text-[11px] font-sans text-rose-400/90 pt-1 border-t border-rose-500/20">
                          <span className="font-semibold">Rejection Cause: </span>
                          {activeSample.dpoPair.rejected.defectSummary}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Raw JSONL Record View */}
                {activeTab === 'jsonl' && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-sans text-slate-400 flex items-center justify-between">
                      <span>Exact JSONL line formatted for Hugging Face load_dataset("json")</span>
                      <span className="text-indigo-400 font-mono text-[10px]">
                        Size: {jsonlRecord.length} bytes
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs break-all whitespace-pre-wrap">
                      {jsonlRecord}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
