import Ticket from '../models/Ticket.js';
import Book from '../models/Book.js';
import { classifyTicket, classifyFallback, normalizeCategory, normalizePriority, draftReply, generatePolicyFallbackDraft } from '../services/aiService.js';

// Creates a new ticket for an author and starts background AI classification & drafting
export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, bookId } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    // 1. Verify book ownership if a bookId was provided
    let verifiedBookId = null;
    if (bookId && bookId !== 'general') {
      const book = await Book.findOne({ _id: bookId, author: req.user.id });
      if (!book) {
        return res.status(400).json({ message: 'Selected book does not exist or belong to your account' });
      }
      verifiedBookId = book._id;
    }

    // 2. Create ticket immediately with defaults (AI classification runs in background)
    const ticket = await Ticket.create({
      author: req.user.id,
      book: verifiedBookId,
      subject: subject.trim(),
      description: description.trim(),
      status: 'Open',
      category: 'General Inquiry',
      priority: 'Medium',
      aiStatus: 'pending',
      unreadByAdmin: true,
      unreadByAuthor: false,
    });

    // 3. Populate book and respond immediately (strip confidential fields & unreadByAdmin)
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('book', 'title isbn status')
      .select('-internalNotes -aiDraft -unreadByAdmin');

    res.status(201).json(populatedTicket);

    const io = req.app.get('io');

    // Notify admins room right away so admins see the new ticket at once
    if (io) {
      (async () => {
        try {
          const docForAdmin = await Ticket.findById(ticket._id)
            .populate('book')
            .populate('author', 'name email phone city');
          if (docForAdmin) {
            io.to('admins').emit('ticket:updated', docForAdmin);
          }
        } catch (e) {
          console.warn('Initial admin ticket:updated broadcast failed:', e.message || e);
        }
      })();
    }

    // 4. Background async job: classify with AI and pre-generate first reply draft
    (async () => {
      try {
        // Step A: Classify ticket with AI (12s timeout) or intelligent fallback
        let classification;
        try {
          classification = await classifyTicket(subject.trim(), description.trim());
        } catch (cErr) {
          console.warn('Background classification failed:', cErr.message || cErr);
          classification = {
            ...classifyFallback(subject.trim(), description.trim()),
            aiStatus: 'failed',
          };
        }

        const category =
          normalizeCategory(classification?.category) ||
          classifyFallback(subject.trim(), description.trim()).category ||
          'General Inquiry';

        const priority =
          normalizePriority(classification?.priority) ||
          classifyFallback(subject.trim(), description.trim()).priority ||
          'Medium';

        const aiStatus = classification?.aiStatus || 'done';

        // Save classification only if aiStatus is still pending (protects against concurrent admin override)
        const classifiedDoc = await Ticket.findOneAndUpdate(
          { _id: ticket._id, aiStatus: 'pending' },
          { $set: { category, priority, aiStatus } },
          { new: true }
        )
          .populate('book')
          .populate('author', 'name email phone city');

        if (classifiedDoc && io) {
          // Broadcast to admins room
          io.to('admins').emit('ticket:classified', classifiedDoc);
          io.to('admins').emit('ticket:updated', classifiedDoc);

          // Broadcast clean doc to author's room
          const cleanDoc = classifiedDoc.toObject();
          delete cleanDoc.internalNotes;
          delete cleanDoc.aiDraft;
          delete cleanDoc.unreadByAdmin;
          io.to(req.user.id.toString()).emit('ticket:updated', cleanDoc);
        }

        // Step B: Generate initial AI reply draft using conditional update pattern
        const currentDoc = await Ticket.findById(ticket._id)
          .populate('book')
          .populate('author', 'name email');

        if (currentDoc && currentDoc.status !== 'Closed') {
          const startStatus = currentDoc.status;
          const startReplyCount = currentDoc.replies?.length || 0;

          let initialDraft = null;
          try {
            initialDraft = await draftReply(currentDoc, currentDoc.book, []);
          } catch (dErr) {
            console.warn('Background draft generation failed:', dErr.message || dErr);
            initialDraft = generatePolicyFallbackDraft(currentDoc, currentDoc.book, []);
          }

          if (initialDraft) {
            // Save draft only if ticket status and replies have not changed in the meantime
            const updated = await Ticket.findOneAndUpdate(
              { _id: ticket._id, status: startStatus, replies: { $size: startReplyCount } },
              { $set: { aiDraft: initialDraft, aiStatus: 'done' } },
              { new: true }
            )
              .populate('book')
              .populate('author', 'name email');

            if (updated && io) {
              io.to('admins').emit('ticket:updated', updated);
            }
          }
        }
      } catch (bgErr) {
        console.warn('Background classification and draft job encountered error:', bgErr.message || bgErr);
      }
    })();
  } catch (error) {
    next(error);
  }
};

// Returns all tickets raised by the authenticated author
export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ author: req.user.id })
      .populate('book', 'title isbn status')
      .populate('replies.sentBy', 'name role')
      .select('-internalNotes -aiDraft -unreadByAdmin')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

// Allows an author to reply to their own ticket (two-way conversation)
export const addAuthorReply = async (req, res, next) => {
  try {
    const { message } = req.body;

    // Validate message existence and length constraints
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message cannot be empty' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: 'Reply message cannot exceed 2000 characters' });
    }

    // Verify ticket exists and belongs to the authenticated author
    const ticket = await Ticket.findOne({ _id: req.params.id, author: req.user.id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Guard: closed tickets cannot receive replies
    if (ticket.status === 'Closed') {
      return res.status(400).json({ message: 'This ticket is closed. Please raise a new ticket.' });
    }

    // Push author reply with from: 'author' (status stays intact: Resolved remains Resolved)
    ticket.replies.push({
      message: message.trim(),
      sentBy: req.user.id,
      from: 'author',
      createdAt: new Date(),
    });

    // Author replied: unreadByAdmin becomes true; author's own actions never set unreadByAuthor
    ticket.unreadByAdmin = true;

    // Invalidate cached AI draft because the author has provided new input
    ticket.aiDraft = '';

    await ticket.save();

    // Populate associated fields for real-time broadcast and response
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('book', 'title isbn status')
      .populate('author', 'name email phone city')
      .populate('replies.sentBy', 'name role');

    // Real-time broadcast to admins room and author room
    const io = req.app.get('io');
    if (io && populatedTicket) {
      const cleanDoc = populatedTicket.toObject();
      delete cleanDoc.internalNotes;
      delete cleanDoc.aiDraft;
      delete cleanDoc.unreadByAdmin; // Authors never receive unreadByAdmin

      // Broadcast full populated doc (with unreadByAdmin) to admins room and queue
      io.to('admins').emit('ticket:updated', populatedTicket);
      io.to('admins').emit('ticket:classified', populatedTicket);

      // Broadcast clean doc to author's room
      io.to(req.user.id.toString()).emit('ticket:updated', cleanDoc);
    }

    // Return response with confidential fields stripped
    const cleanResponse = populatedTicket.toObject();
    delete cleanResponse.internalNotes;
    delete cleanResponse.aiDraft;
    delete cleanResponse.unreadByAdmin; // Authors never receive unreadByAdmin

    // Asynchronously pre-generate AI draft for admin based on author's latest reply
    (async () => {
      try {
        const fullTicket = await Ticket.findById(ticket._id)
          .populate('author', 'name email')
          .populate('book')
          .populate('replies.sentBy', 'name role');
        if (fullTicket && fullTicket.status !== 'Closed') {
          const startStatus = fullTicket.status;
          const startReplyCount = fullTicket.replies?.length || 0;

          let draft = null;
          try {
            draft = await draftReply(fullTicket, fullTicket.book, fullTicket.replies);
          } catch (err) {
            draft = generatePolicyFallbackDraft(fullTicket, fullTicket.book, fullTicket.replies);
          }
          if (draft) {
            // Save draft only if ticket status and replies have not changed in the meantime
            const updated = await Ticket.findOneAndUpdate(
              { _id: ticket._id, status: startStatus, replies: { $size: startReplyCount } },
              { $set: { aiDraft: draft, aiStatus: 'done' } },
              { new: true }
            )
              .populate('book')
              .populate('author', 'name email');

            if (updated) {
              const io = req.app.get('io');
              if (io) {
                io.to('admins').emit('ticket:updated', updated);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Background draft generation on reply failed:', err.message || err);
      }
    })();

    res.status(200).json(cleanResponse);
  } catch (error) {
    next(error);
  }
};

// Marks a ticket as read by the author (sets unreadByAuthor = false)
export const markTicketReadByAuthor = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, author: req.user.id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.unreadByAuthor = false;
    await ticket.save();

    const io = req.app.get('io');
    if (io) {
      io.to(req.user.id.toString()).emit('ticket:read', { ticketId: ticket._id });
    }

    res.json({ message: 'ok' });
  } catch (error) {
    next(error);
  }
};

