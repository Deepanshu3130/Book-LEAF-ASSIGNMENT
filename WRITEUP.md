# BookLeaf Author Support Portal — Architecture & Approach Write-Up

**Candidate Technical Submission — Full-Stack Developer Position**  
*Document Deliverable 4: Approach, Trade-Offs & Production Evolution (Max 1 Page)*

---

### 1. What I Prioritised

1. **Grounded, Production-Grade AI (Not Generic Fluff)**:
   Author support requires factual accuracy and empathy. Rather than making simple zero-shot LLM calls, I engineered a category-aware knowledge retrieval system in `aiService.js`. When generating drafts, the system injects the author’s real database records (copies sold, unpaid royalties, book status) and category-specific company policies. The prompt enforces strict rules: never invent numbers or promise completed actions without verification, always address authors by first name, and align tone with BookLeaf's partnership values.
2. **Resilience & Graceful Degradation**:
   External AI APIs can experience latency spikes, rate limits, or 503 service disruptions. I implemented a dual-layer safety net: a 6-second timeout circuit breaker backed by a deterministic, regex-based keyword heuristic (`classifyFallback`) and policy templates (`generatePolicyFallbackDraft`). Even during a total AI outage, ticket creation never fails, royalties and ISBN issues are still accurately prioritized, and support agents can seamlessly write replies manually.
3. **Real-Time Two-Way Workflow (Author & Admin)**:
   Authors need transparency without manual page refreshing. I built a bidirectional Socket.IO layer with private author rooms and an `admins` broadcast room. Both interfaces feature a WhatsApp-style unread tracking system (`unreadByAdmin` and `unreadByAuthor`) that dynamically decrements badges on ticket expansion and highlights new replies across open browser tabs.
4. **Data Privacy & Security**:
   Internal notes (`internalNotes`), staff assignments, and cached AI drafts are strictly isolated. All author-facing REST responses and WebSocket broadcasts pass through sanitization filters to ensure confidential notes never reach authors.

---

### 2. Trade-Offs Made

| Decision | What I Chose | What I Traded Off | Rationale |
|---|---|---|---|
| **Data Modeling** | Embedded subdocuments for `replies` and `internalNotes` inside `Ticket`. | Separate relational/normalized collections for messages and notes. | Eliminates multi-table joins, guarantees atomic updates on status/reply transitions, and simplifies document hydration. |
| **Admin Read Receipts** | Single `unreadByAdmin` boolean on the ticket document. | Many-to-many per-agent read tracking table. | Lightweight and sufficient for a focused support team; unread counts decrement when any admin opens the ticket. |
| **File Attachments** | Polished UI attachment input (as specified in the assignment brief). | Multi-part S3 upload pipeline with presigned URLs. | Kept codebase free of heavy cloud SDK dependencies while delivering the complete user interaction flow. |
| **Model Selection** | Google Gemini Flash (`gemini-3.5-flash`). | Heavy frontier models (e.g., Claude Opus / GPT-4o). | Delivers sub-second classification and drafting latency with near-zero token costs, perfect for 1,200+ monthly book operations. |

---

### 3. How I Would Evolve This Into a Production System

1. **Distributed Job Queue (BullMQ + Redis)**:
   Decouple background AI triage and automated email notifications from the Express HTTP event loop. Workers would process classification with automatic exponential retries and concurrency control.
2. **Context & Semantic Caching**:
   Utilize Gemini's prompt caching for the static BookLeaf Knowledge Base. For high-volume periods (e.g. quarterly royalty releases), common author inquiries ("Where is my Q3 royalty?") can hit a vector cache to provide instant, sub-50ms drafts at an 80% reduction in token costs.
3. **Multi-Agent Per-Admin Inboxes**:
   Expand the unread architecture into per-agent read cursors and round-robin auto-assignment based on category specializations (e.g., dedicated finance agents for Royalty & Payments).
4. **Cloud Object Storage (AWS S3 / GCP Cloud Storage)**:
   Enable virus-scanned image uploads with presigned URLs so authors reporting printing or binding defects can upload photos directly to support tickets.
5. **Automated SLA Tracking & Escalation Engine**:
   Add a Redis-backed cron monitor that flags tickets exceeding BookLeaf's 24-hour and 48-hour response windows, automatically escalating overdue royalty issues to operations leads.
