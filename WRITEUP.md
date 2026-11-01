# Project Write-Up – BookLeaf Support Portal

> **Note on UI Design**: The portal's user interface is thoughtfully inspired by BookLeaf Publishing's official public website, incorporating their signature coral/blush colors (`#F2687A`, `#FDEEF0`), clean typography, and modern card layouts.

---

### 1. What I Prioritised

- **Sub-Second Ticket Creation & Non-Blocking Asynchronous Triage**:  
  Authors should never sit watching a spinner waiting for an LLM to respond. When an author submits a ticket, the server immediately persists it with sensible defaults and returns HTTP 201 in under 100ms. AI classification and initial draft generation execute asynchronously in the background and push results live via Socket.IO.

- **Accurate, Policy-Grounded AI with Race-Condition Safety**:  
  The AI is grounded in BookLeaf's real publishing policies and the author's live book data (sales, unpaid royalties, publishing status). To prevent race conditions where a slow background draft overwrites an active conversation, drafts are saved using conditional atomic updates (`$size` and `status` checks) — any stale draft is silently discarded. Additionally, previewing an alternate status in the admin UI never modifies the saved ticket in the database.

- **System Reliability & Dual-Layer Fallbacks**:  
  AI APIs can be slow, experience latency spikes, or encounter rate limits on free tiers. All LLM calls have a strict 12-second guard timeout. If Gemini is unavailable, a rule-based heuristic classifies the ticket with `aiStatus: 'failed'`, and the admin interface displays a transparent note explaining that rules were used and prompting review.

- **Hardened Real-Time WebSocket Security & Privacy**:  
  Socket connections are authenticated via JWT during the handshake. Rooms are assigned strictly by the server (`userId` and `'admins'`), eliminating client-side room spoofing. Private internal notes, AI drafts, and internal flags are scrubbed before reaching authors, and administrative events (`ticket:classified`, `ticket:read`) are emitted exclusively to the `admins` room.

- **Defensive Input Validation & Proxy Trust**:  
  Admin query filters (`status`, `category`, `priority`) are strictly whitelisted, date filters are validated and parsed to Indian Standard Time (IST, UTC+5:30) boundaries, and Express is configured with `trust proxy` so rate limiters identify real client IPs behind cloud reverse proxies like Render.

---

### 2. Trade-Offs I Made

- **Atomic Conditional Updates vs. Heavyweight Distributed Locks**:  
  To solve the background draft race condition, I used MongoDB's native atomic `findOneAndUpdate` with `{ status: startStatus, replies: { $size: startReplyCount } }`. This discarded stale drafts cleanly in a single database operation without introducing Redis, Redlock, or message queue brokers, keeping the application simple, explainable, and dependency-free.

- **Embedded Subdocuments for Replies & Internal Notes**:  
  Replies and internal notes are stored directly inside the `Ticket` document in MongoDB. This guarantees atomic updates, simplifies data management, and avoids multi-table joins. For an enterprise handling thousands of replies per ticket, migrating message bodies to a separate collection would be the next step.

- **Lightweight Document-Level Read Badges**:  
  I used simple `unreadByAdmin` and `unreadByAuthor` flags on the ticket itself rather than a complex per-admin read receipts table. This keeps the data model lean and perfectly serves a focused support team.

- **Handshake-Level Socket Authentication**:  
  Instead of allowing clients to send custom "join" messages, authentication happens once during the WebSocket handshake using the verified JWT. This prevents any author from joining administrative broadcast channels.

- **Gemini Flash-Lite Model**:  
  I chose Google Gemini Flash-Lite because it provides high instruction-following adherence, rapid response times, and near-zero operational costs for customer support triage.

---

### 3. How I'd Evolve This in Production

- **Dedicated Message Queue for Background AI**:  
  Under heavy concurrent load, queueing classification and draft generation tasks in a Redis-backed worker (such as BullMQ) would provide retries with exponential backoff and fine-grained concurrency control.

- **Personalized Per-Admin Read Receipts**:  
  Track `lastReadAt` timestamps per admin user ID to offer personalized unread indicators in larger support organizations.

- **Cloud Image & File Storage (AWS S3 / Cloudinary)**:  
  Connect presigned upload URLs so authors reporting printing or binding defects can upload high-resolution photos of damaged copies directly to S3.

- **Instant FAQ & Self-Help Suggestions**:  
  As authors type their ticket subject, display instant answers from BookLeaf's knowledge base to resolve common queries without submitting a ticket.

- **Author Satisfaction Rating (CSAT)**:  
  Upon ticket resolution, invite authors to rate their support experience (1–5 stars) with quick feedback tags to measure service quality over time.

- **Omnichannel Email & SMS Notifications**:  
  Integrate transactional email providers (e.g. Resend or SendGrid) to notify authors when an admin posts a reply, with magic links straight into the ticket conversation.
