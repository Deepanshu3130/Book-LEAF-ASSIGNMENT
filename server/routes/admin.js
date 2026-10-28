import express from 'express';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import {
  getTicketsQueue,
  getTicketById,
  replyToTicket,
  updateTicket,
  addInternalNote,
  generateDraft,
  rewriteTicketReply,
  markTicketReadByAdmin,
} from '../controllers/adminController.js';

const router = express.Router();

// Rate limiter for AI draft generation to protect upstream API costs
const draftLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 draft requests per 15 min
  message: { message: 'Too many AI draft requests. Please wait a few minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin endpoints require authentication and admin role
router.use(auth);
router.use(isAdmin);

// Ticket queue with filters
router.get('/tickets', getTicketsQueue);

// Single ticket detail
router.get('/tickets/:id', getTicketById);

// Send reply (support both /reply and /replies)
router.post('/tickets/:id/reply', replyToTicket);
router.post('/tickets/:id/replies', replyToTicket);

// Update status, category, priority, assignedTo (support /tickets/:id, /override, /assign)
router.patch('/tickets/:id', updateTicket);
router.patch('/tickets/:id/override', updateTicket);
router.patch('/tickets/:id/assign', updateTicket);

// Add private internal note
router.post('/tickets/:id/notes', addInternalNote);

// Generate or regenerate AI draft
router.post('/tickets/:id/draft', draftLimiter, generateDraft);

// Rewrite an existing draft using AI
router.post('/tickets/:id/rewrite', draftLimiter, rewriteTicketReply);

// Mark ticket as read by admin
router.post('/tickets/:id/read', markTicketReadByAdmin);

export default router;
