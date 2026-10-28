import Ticket from '../models/Ticket.js';
import Book from '../models/Book.js';
import { classifyTicket, classifyFallback, draftReply, generatePolicyFallbackDraft } from '../services/aiService.js';

// Creates a new ticket for an author and starts background AI classification
export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, bookId } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    // Verify book ownership if a bookId was provided
    let verifiedBookId = null;
    if (bookId && bookId !== 'general') {
      const book = await Book.findOne({ _id: bookId, author: req.user.id });
      if (!book) {
        return res.status(400).json({ message: 'Selected book does not exist or belong to your account' });
      }
      verifiedBookId = book._id;
    }

    // Fast & intelligent classification (Gemini with 6s timeout or smart policy fallback)
    let classification = {
      category: 'General Inquiry',
      priority: 'Medium',
      aiStatus: 'done',
    };
    try {
      classification = await classifyTicket(subject.trim(), description.trim());
    } catch (cErr) {
      classification = classifyFallback(subject.trim(), description.trim());
    }

    // Create ticket immediately with accurate category and priority
    const ticket = await Ticket.create({
      author: req.user.id,
      book: verifiedBookId,
      subject: subject.trim(),
      description: description.trim(),
      status: 'Open',
      category: classification.category || 'General Inquiry',
      priority: classification.priority || 'Medium',
      aiStatus: classification.aiStatus || 'done',
      unreadByAdmin: true,
      unreadByAuthor: false,
    });

    // Populate book before returning response (strip confidential fields & unreadByAdmin)
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('book', 'title isbn status')
      .select('-internalNotes -aiDraft -unreadByAdmin');

    // Respond immediately with fully classified ticket
    res.status(201).json(populatedTicket);

    // Notify admins room and author room immediately with the classified ticket
    const initialIo = req.app.get('io');
    if (initialIo) {
      (async () => {
        try {
          const fullDocForAdmin = await Ticket.findById(ticket._id)
            .populate('book')
            .populate('author', 'name email phone city');
          if (fullDocForAdmin) {
            initialIo.to('admins').emit('ticket:updated', fullDocForAdmin);
            initialIo.emit('ticket:classified', fullDocForAdmin);
          }
        } catch (e) {}
      })();
    }

    // Asynchronous background pre-generation of AI reply draft for admin
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        const fullDocForDraft = await Ticket.findById(ticket._id)
          .populate('book')
          .populate('author', 'name email');
        if (fullDocForDraft) {
          let initialDraft = null;
          try {
            initialDraft = await draftReply(fullDocForDraft, fullDocForDraft.book, []);
          } catch (err) {
            initialDraft = generatePolicyFallbackDraft(fullDocForDraft, fullDocForDraft.book, []);
          }
          if (initialDraft) {
            fullDocForDraft.aiDraft = initialDraft;
            await fullDocForDraft.save();
            const io = req.app.get('io');
            if (io) {
              io.to('admins').emit('ticket:updated', fullDocForDraft);
            }
          }
        }
      } catch (dErr) {
        console.warn('Initial background draft generation failed:', dErr.message || dErr);
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
      io.emit('ticket:classified', populatedTicket);

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
        if (fullTicket) {
          let draft = null;
          try {
            draft = await draftReply(fullTicket, fullTicket.book, fullTicket.replies);
          } catch (err) {
            draft = generatePolicyFallbackDraft(fullTicket, fullTicket.book, fullTicket.replies);
          }
          if (draft) {
            fullTicket.aiDraft = draft;
            fullTicket.aiStatus = 'done';
            await fullTicket.save();
            const io = req.app.get('io');
            if (io) {
              io.to('admins').emit('ticket:updated', fullTicket);
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

