import Ticket from '../models/Ticket.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { draftReply, rewriteReply } from '../services/aiService.js';

// Priority weight lookup for sorting (lower value = higher urgency)
const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// Returns the filtered and urgency-sorted admin ticket queue
export const getTicketsQueue = async (req, res, next) => {
  try {
    const { status, category, priority, date, assignedTo } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;

    // Filter by tickets assigned specifically to the current admin
    if (assignedTo === 'me') {
      query.assignedTo = req.user.id;
    }

    // Filter by specific calendar date (YYYY-MM-DD) if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const tickets = await Ticket.find(query)
      .populate('author', 'name email phone city')
      .populate('book', 'title isbn status')
      .populate('assignedTo', 'name email');

    // Admin queue sorting:
    // 1. Resolved/Closed tickets sink to the bottom (newest updatedAt first).
    // 2. Active tickets: most urgent priority first (Critical -> High -> Medium -> Low).
    // 3. Ties broken by oldest first (earliest createdAt) to prevent starvation.
    const sortedTickets = tickets.sort((a, b) => {
      const aResolved = a.status === 'Resolved' || a.status === 'Closed';
      const bResolved = b.status === 'Resolved' || b.status === 'Closed';

      if (aResolved && !bResolved) return 1;
      if (!aResolved && bResolved) return -1;

      if (!aResolved && !bResolved) {
        const aPriority = PRIORITY_ORDER[a.priority] ?? 2;
        const bPriority = PRIORITY_ORDER[b.priority] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      // For completed tickets, sort newest first
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(sortedTickets);
  } catch (error) {
    next(error);
  }
};

// Returns full ticket details including author, book, replies, and internal notes
export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('author', 'name email phone city')
      .populate('book')
      .populate('assignedTo', 'name email')
      .populate('replies.sentBy', 'name role')
      .populate('internalNotes.admin', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

// Sends an official admin reply to the author (with optional markResolved or markClosed flag)
export const replyToTicket = async (req, res, next) => {
  try {
    const { message, markResolved, markClosed } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Guard: closed tickets cannot receive any further replies
    if (ticket.status === 'Closed') {
      return res.status(400).json({ message: 'This ticket is closed. No further replies can be sent.' });
    }

    // Append reply with from: 'admin'
    ticket.replies.push({
      message: message.trim(),
      sentBy: req.user.id,
      from: 'admin',
      createdAt: new Date(),
    });

    // Auto-assign ticket to replying admin if currently unassigned so it appears in "My tickets"
    if (!ticket.assignedTo) {
      ticket.assignedTo = req.user.id;
    }

    // If markClosed is true, set status to Closed; if markResolved is true, set to Resolved; otherwise advance Open to In Progress
    if (markClosed) {
      ticket.status = 'Closed';
    } else if (markResolved) {
      ticket.status = 'Resolved';
    } else if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    // Admin replied: unreadByAuthor becomes true; admin's own action never sets unreadByAdmin
    ticket.unreadByAuthor = true;

    // Invalidate cached AI draft because the conversation has moved forward
    ticket.aiDraft = '';

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('author', 'name email phone city')
      .populate('book')
      .populate('assignedTo', 'name email')
      .populate('replies.sentBy', 'name role')
      .populate('internalNotes.admin', 'name email');

    // Real-time broadcast to author room and admin queue
    const io = req.app.get('io');
    if (io) {
      const cleanTicket = populatedTicket.toObject();
      delete cleanTicket.internalNotes;
      delete cleanTicket.aiDraft;
      delete cleanTicket.unreadByAdmin; // Authors never receive unreadByAdmin

      io.to(ticket.author.toString()).emit('ticket:updated', cleanTicket);
      io.to('admins').emit('ticket:updated', populatedTicket);
      io.emit('ticket:classified', populatedTicket);
    }

    res.json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

// Updates ticket status, category, priority, or assignedTo staff member
export const updateTicket = async (req, res, next) => {
  try {
    const { status, category, priority, assignedTo } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // If admin is closing the ticket and it was not already closed, automatically send a closing notification to author
    if (status === 'Closed' && ticket.status !== 'Closed') {
      const authorDoc = await User.findById(ticket.author);
      const authorFirstName = authorDoc?.name ? authorDoc.name.trim().split(' ')[0] : 'Author';
      ticket.replies.push({
        message: `Hi ${authorFirstName},\n\nAs you confirmed that your issue has been solved, we are closing this ticket. Thank you for choosing BookLeaf Publishing! If you ever need help in the future, please feel free to raise a new ticket.\n\nWarm regards,\nBookLeaf Support Team`,
        sentBy: req.user.id,
        from: 'admin',
        createdAt: new Date(),
      });
      ticket.status = 'Closed';
    } else if (status) {
      ticket.status = status;
    }

    // Changing status sets unreadByAuthor = true so the author knows the status progressed
    if (status) {
      ticket.unreadByAuthor = true;
    }

    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;

    // Invalidate cached AI draft so future drafts match the updated status/category
    ticket.aiDraft = '';

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('author', 'name email phone city')
      .populate('book')
      .populate('assignedTo', 'name email')
      .populate('replies.sentBy', 'name role')
      .populate('internalNotes.admin', 'name email');

    // Real-time broadcast to author room and admin queue
    const io = req.app.get('io');
    if (io) {
      const cleanTicket = populatedTicket.toObject();
      delete cleanTicket.internalNotes;
      delete cleanTicket.aiDraft;
      delete cleanTicket.unreadByAdmin; // Authors never receive unreadByAdmin

      io.to(ticket.author.toString()).emit('ticket:updated', cleanTicket);
      io.to('admins').emit('ticket:updated', populatedTicket);
      io.emit('ticket:classified', populatedTicket);
    }

    res.json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

// Adds a private internal note visible exclusively to administrators
export const addInternalNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Note text cannot be empty' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.internalNotes.push({
      text: text.trim(),
      admin: req.user.id,
      createdAt: new Date(),
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('internalNotes.admin', 'name email');

    res.json(populatedTicket.internalNotes);
  } catch (error) {
    next(error);
  }
};

// Generates or regenerates an AI draft reply
export const generateDraft = async (req, res, next) => {
  try {
    const { status: overrideStatus } = req.body || {};

    const ticket = await Ticket.findById(req.params.id)
      .populate('author', 'name email')
      .populate('book')
      .populate('replies.sentBy', 'name role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // If an explicit status was supplied (e.g. from the admin status selector), apply it for the draft
    if (overrideStatus && ['Open', 'In Progress', 'Resolved', 'Closed'].includes(overrideStatus)) {
      ticket.status = overrideStatus;
    }

    try {
      const draft = await draftReply(ticket, ticket.book, ticket.replies);
      ticket.aiDraft = draft;
      ticket.aiStatus = 'done';
      await ticket.save();

      res.json({
        aiDraft: draft,
        aiStatus: 'done',
      });
    } catch (aiError) {
      console.error('Draft generation error:', aiError.message || aiError);
      ticket.aiStatus = 'failed';
      await ticket.save();

      res.status(503).json({
        message: 'AI is unavailable right now. You can write the reply manually.',
        aiStatus: 'failed',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Rewrites an existing reply draft using Gemini AI with one of 4 stylistic modes
export const rewriteTicketReply = async (req, res, next) => {
  try {
    const { text, mode } = req.body;
    const validModes = ['Polish', 'Shorter', 'More empathetic', 'More formal'];

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text to rewrite is required' });
    }

    if (text.length > 3000) {
      return res.status(400).json({ message: 'Text exceeds maximum limit of 3000 characters' });
    }

    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({
        message: `Mode must be one of: ${validModes.join(', ')}`,
      });
    }

    try {
      const rewrittenText = await rewriteReply(text.trim(), mode);
      res.json({ rewrittenText });
    } catch (aiErr) {
      console.error('Rewrite generation error:', aiErr.message || aiErr);
      res.status(503).json({
        message: 'Rewrite is unavailable right now',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Marks a ticket as read by an administrator (sets unreadByAdmin = false)
export const markTicketReadByAdmin = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.unreadByAdmin = false;
    await ticket.save();

    res.json({ message: 'ok' });
  } catch (error) {
    next(error);
  }
};
