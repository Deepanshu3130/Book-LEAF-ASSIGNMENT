# Project Write-Up — BookLeaf Support Portal

> **Note on UI Design**: The portal's user interface is thoughtfully inspired by BookLeaf Publishing's official public website, incorporating their signature coral/blush colors, clean typography, and modern card layouts.

---

### 1. What I Prioritised

- **Accurate & Helpful AI Replies**:  
  Instead of generic robotic replies, the AI is given the author's real data (book sales, unpaid royalties, publishing status) and BookLeaf's actual company policies. It addresses authors warmly by first name, explains policies clearly, and never invents dates or numbers.

- **System Reliability (Never Crashing)**:  
  AI APIs can be slow, hit rate limits, or go down temporarily. I added a 6-second timeout and an automatic fallback system. Even if the AI service fails completely, tickets are still created, categorized using keyword rules, and admins can simply write and send replies manually without any interruptions.

- **Real-Time Communication**:  
  Support tickets feel like an active conversation. Using WebSockets (Socket.IO), whenever an admin or author replies, the other side sees it immediately without refreshing the page. Tickets show clear unread badges so nothing gets lost.

- **Clean Security & Privacy**:  
  Admins can write internal private notes on tickets that authors can never see. These notes, internal flags, and AI drafts are stripped out on the backend before data reaches the author.

---

### 2. Trade-Offs I Made

- **Embedded Replies inside Tickets**:  
  Replies and internal notes are stored directly inside each ticket document in MongoDB. This made queries fast and simple without having to join multiple database collections. For very long conversations with dozens of replies, a separate messages collection would be better later on.

- **Lightweight Read Badges**:  
  I used a simple `unreadByAdmin` flag on the ticket itself rather than a complex per-admin tracking table. This works smoothly for a small operations team and kept the code clean and fast.

- **UI-Only File Attachment**:  
  Following the assignment instructions, I included a clean file attachment field in the UI without setting up a full AWS S3 bucket. This kept setup simple and dependency-free while demonstrating the complete user flow.

- **Gemini Flash Model**:  
  I chose Google Gemini Flash because it is fast, inexpensive, and reliable. For customer support queries, speed and low cost matter much more than using a heavy, expensive model.

---

### 3. How I'd Evolve This in Production

- **Instant FAQ & Self-Help Suggestions**:  
  When an author starts typing a query (e.g. "When is royalty paid?"), show relevant quick answers from the BookLeaf FAQ so common questions can be answered instantly without needing a ticket.

- **Author Satisfaction Rating (CSAT)**:  
  After a ticket is resolved, give authors a simple 1-click rating (1 to 5 stars or "Was this helpful?") to help the BookLeaf team measure and improve support quality.

- **Real Image Uploads (S3 / Cloudinary)**:  
  Allow authors reporting printing or binding defects to upload actual photos of defective book copies for instant verification and reprint processing.

- **Email Notifications**:  
  Send authors an email alert whenever an admin replies so they know their issue has been addressed without having to keep the portal open.
