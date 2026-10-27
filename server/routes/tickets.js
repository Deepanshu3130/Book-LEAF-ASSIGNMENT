import express from 'express';
import auth from '../middleware/auth.js';
import {
  createTicket,
  getMyTickets,
  addAuthorReply,
  markTicketReadByAuthor,
} from '../controllers/ticketController.js';

const router = express.Router();

// All ticket routes require authentication
router.use(auth);

// POST /api/tickets - Create ticket
router.post('/', createTicket);

// GET /api/tickets/mine - Author's tickets with replies
router.get('/mine', getMyTickets);

// POST /api/tickets/:id/replies - Author two-way reply on their own ticket
router.post('/:id/replies', addAuthorReply);

// POST /api/tickets/:id/read - Mark ticket as read by author
router.post('/:id/read', markTicketReadByAuthor);

export default router;
