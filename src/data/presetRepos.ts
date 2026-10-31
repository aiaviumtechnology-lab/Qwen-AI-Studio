import { PresetRepository } from '../types/agent';

export const PRESET_REPOSITORIES: PresetRepository[] = [
  {
    id: 'rust-pipeline',
    name: 'rust-channel-queue',
    description: 'Concurrent worker pool with RefCell borrow conflict, lifetime mismatch, and Mutex deadlock risk',
    primaryLanguage: 'rust',
    languages: ['rust'],
    files: [
      {
        path: 'src/main.rs',
        name: 'main.rs',
        language: 'rust',
        content: `use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct TaskQueue {
    tasks: RefCell<Vec<String>>,
}

impl TaskQueue {
    pub fn new() -> Self {
        Self {
            tasks: RefCell::new(Vec::new()),
        }
    }

    pub fn process_next(&self) {
        // BUG 1: E0502 / Runtime Panic - Simultaneous borrow and borrow_mut in the same scope
        let current = self.tasks.borrow();
        if let Some(task) = current.first() {
            println!("Processing: {}", task);
            // This causes a runtime RefCell borrow panic because 'current' is still in scope!
            self.tasks.borrow_mut().remove(0);
        }
    }
}

pub fn spawn_workers() {
    let queue = Arc::new(Mutex::new(TaskQueue::new()));
    let lock_a = Arc::new(Mutex::new(1));
    let lock_b = Arc::new(Mutex::new(2));

    // BUG 2: Potential AB-BA Deadlock between threads
    let a1 = Arc::clone(&lock_a);
    let b1 = Arc::clone(&lock_b);
    let h1 = thread::spawn(move || {
        let _guard_a = a1.lock().unwrap();
        thread::sleep(std::time::Duration::from_millis(10));
        let _guard_b = b1.lock().unwrap();
    });

    let a2 = Arc::clone(&lock_a);
    let b2 = Arc::clone(&lock_b);
    let h2 = thread::spawn(move || {
        let _guard_b = b2.lock().unwrap(); // Inverted lock acquisition order!
        thread::sleep(std::time::Duration::from_millis(10));
        let _guard_a = a2.lock().unwrap();
    });

    h1.join().unwrap();
    h2.join().unwrap();
}

fn main() {
    let q = TaskQueue::new();
    q.tasks.borrow_mut().push("job-1".to_string());
    q.process_next();
    spawn_workers();
}
`,
      },
      {
        path: 'src/worker.rs',
        name: 'worker.rs',
        language: 'rust',
        content: `// Worker lifetime parameter annotation
pub struct DataProcessor<'a> {
    pub buffer: &'a mut Vec<u8>,
}

impl<'a> DataProcessor<'a> {
    pub fn new(buffer: &'a mut Vec<u8>) -> Self {
        Self { buffer }
    }

    // BUG: Returning a reference to local variable that drops at end of fn
    pub fn extract_slice(&self) -> &'static [u8] {
        // Invariant violation: trying to coerce shorter lifetime to 'static
        &self.buffer[..]
    }
}
`,
      },
    ],
  },
  {
    id: 'python-async',
    name: 'python-async-crawler',
    description: 'Async crawler with event-loop blocking synchronous I/O, mutable default argument, and unhandled gather exception',
    primaryLanguage: 'python',
    languages: ['python'],
    files: [
      {
        path: 'crawler/pipeline.py',
        name: 'pipeline.py',
        language: 'python',
        content: `import asyncio
import time
import requests # BUG: synchronous blocking library inside asyncio loop!

class BatchCollector:
    # BUG 1: Mutable default argument accumulates state across instances!
    def __init__(self, buffer=[]):
        self.buffer = buffer

    def add_result(self, item):
        self.buffer.append(item)
        return len(self.buffer)

async def fetch_url(url: str, collector: BatchCollector):
    # BUG 2: Blocking synchronous requests.get() stops the entire asyncio event loop
    print(f"Starting fetch: {url}")
    response = requests.get(url, timeout=5) # Should use aiohttp or httpx.AsyncClient
    collector.add_result(response.status_code)
    return response.status_code

async def run_audit():
    collector = BatchCollector()
    urls = [
        "https://api.github.com",
        "https://httpbin.org/delay/1",
        "invalid-protocol://error"
    ]

    # BUG 3: asyncio.gather without return_exceptions=True crashes on first error
    tasks = [fetch_url(u, collector) for u in urls]
    results = await asyncio.gather(*tasks)
    print("Completed batch:", results)

if __name__ == "__main__":
    asyncio.run(run_audit())
`,
      },
    ],
  },
  {
    id: 'c-packet-parser',
    name: 'c-network-parser',
    description: 'Raw network packet parser with unbounded strcpy buffer overflow, missing free() memory leak, and use-after-free',
    primaryLanguage: 'c',
    languages: ['c'],
    files: [
      {
        path: 'src/packet.c',
        name: 'packet.c',
        language: 'c',
        content: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char hostname[32];
    int port;
    char *payload;
} Packet;

Packet* create_packet(const char* host, int port, const char* data) {
    Packet *p = (Packet*)malloc(sizeof(Packet));
    if (!p) return NULL;

    p->port = port;

    // BUG 1: Unbounded strcpy into 32-byte buffer -> Classic Stack/Heap Buffer Overflow (CWE-120)
    strcpy(p->hostname, host);

    size_t len = strlen(data);
    p->payload = (char*)malloc(len + 1);
    if (p->payload) {
        strcpy(p->payload, data);
    }
    return p;
}

void process_and_free(Packet *p) {
    if (!p) return;

    printf("Host: %s:%d\\n", p->hostname, p->port);

    // Free the struct
    free(p);

    // BUG 2: Use-After-Free (CWE-416) - Dereferencing p->payload after p was already freed!
    if (p->payload) {
        printf("Payload: %s\\n", p->payload);
        free(p->payload);
    }
    // BUG 3: If p->payload wasn't freed properly, memory leak occurs.
}

int main() {
    // Malicious long hostname triggering overflow
    const char *long_host = "very-long-untrusted-hostname-exceeding-thirty-two-bytes-by-far.corp.net";
    Packet *pkt = create_packet(long_host, 8080, "GET /index.html HTTP/1.1");
    process_and_free(pkt);
    return 0;
}
`,
      },
    ],
  },
  {
    id: 'cpp-entity-system',
    name: 'cpp-game-entity',
    description: 'Scene graph entity manager with circular shared_ptr leak, dangling lambda reference capture, and missing virtual destructor',
    primaryLanguage: 'cpp',
    languages: ['cpp'],
    files: [
      {
        path: 'src/entity.cpp',
        name: 'entity.cpp',
        language: 'cpp',
        content: `#include <iostream>
#include <memory>
#include <vector>
#include <functional>

class Node;

class Component {
public:
    // BUG 1: Non-virtual destructor in polymorphic base class -> undefined behavior on delete
    ~Component() {
        std::cout << "Component destroyed\\n";
    }
    virtual void update() = 0;
};

class Node {
public:
    std::string name;
    std::vector<std::shared_ptr<Component>> components;

    // BUG 2: Circular reference between parent Node and child Node causes permanent memory leak!
    // Should use std::weak_ptr for child-to-parent reference
    std::shared_ptr<Node> parent;
    std::shared_ptr<Node> child;

    Node(std::string n) : name(n) {}
    ~Node() {
        std::cout << "Node " << name << " destroyed\\n";
    }
};

std::function<void()> create_updater() {
    int local_counter = 42;
    // BUG 3: Lambda capturing local stack variable by reference [&] -> Dangling reference invocation!
    return [&]() {
        std::cout << "Counter value: " << local_counter << "\\n";
    };
}

int main() {
    auto parent = std::make_shared<Node>("Root");
    auto child = std::make_shared<Node>("Child");

    // Creating cycle: parent -> child and child -> parent
    parent->child = child;
    child->parent = parent; // Cycle prevents reference count from ever reaching 0!

    auto bad_closure = create_updater();
    bad_closure(); // Undefined behavior: reading garbage from popped stack frame

    return 0;
}
`,
      },
    ],
  },
  {
    id: 'java-bank-transfer',
    name: 'java-concurrency-bank',
    description: 'High-concurrency bank transfer service with unsynchronized balance check race condition and potential NullPointerException',
    primaryLanguage: 'java',
    languages: ['java'],
    files: [
      {
        path: 'src/main/java/com/bank/AccountService.java',
        name: 'AccountService.java',
        language: 'java',
        content: `package com.bank;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AccountService {
    private final Map<String, Account> accounts = new ConcurrentHashMap<>();

    public static class Account {
        private final String id;
        private double balance; // BUG 1: Non-volatile, non-atomic double field accessed concurrently

        public Account(String id, double balance) {
            this.id = id;
            this.balance = balance;
        }

        public double getBalance() { return balance; }
        public void setBalance(double b) { this.balance = b; }
    }

    public boolean transfer(String fromId, String toId, double amount) {
        Account from = accounts.get(fromId);
        Account to = accounts.get(toId);

        // BUG 2: Missing null checks on accounts.get() -> NullPointerException risk
        // BUG 3: Check-Then-Act race condition: balance checked outside atomic transaction
        if (from.getBalance() >= amount) {
            // Context switch here allows another thread to withdraw, leading to overdraft!
            try {
                Thread.sleep(5);
            } catch (InterruptedException ignored) {}

            from.setBalance(from.getBalance() - amount);
            to.setBalance(to.getBalance() + amount);
            return true;
        }
        return false;
    }
}
`,
      },
    ],
  },
  {
    id: 'javascript-stream-cache',
    name: 'javascript-stream-cache',
    description: 'Node.js streaming event emitter with memory leak from unbound listeners and unhandled promise rejection',
    primaryLanguage: 'javascript',
    languages: ['javascript'],
    files: [
      {
        path: 'src/streamCache.js',
        name: 'streamCache.js',
        language: 'javascript',
        content: `const EventEmitter = require('events');

class DataStreamService extends EventEmitter {
    constructor() {
        super();
        this.cache = new Map();
    }

    attachListener(sessionToken, onData) {
        // BUG 1: Adding listener on every request without removing -> Memory Leak (MaxListenersExceededWarning)
        this.on('stream_chunk', (chunk) => {
            onData(chunk);
        });
    }

    async processBatch(items) {
        // BUG 2: Unhandled Promise rejection if any item throws
        const promises = items.map(async (item) => {
            if (item.id === null || item.id === undefined) {
                throw new Error("Invalid item ID encountered");
            }
            return this.saveToDatabase(item);
        });

        // Promise.all rejects immediately without handling partial successes or cleanup
        return Promise.all(promises);
    }

    async saveToDatabase(item) {
        return { saved: true, id: item.id };
    }
}

module.exports = { DataStreamService };
`,
      },
    ],
  },
];
