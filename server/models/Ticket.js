import mongoose from 'mongoose';

// Reply subdocument schema (messages visible to authors and admins)
const replySchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  from: {
    type: String,
    enum: ['author', 'admin'],
    default: 'admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Internal notes subdocument schema (confidential notes for admins only)
const internalNoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: general / account level tickets do not reference a specific book
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    category: {
      type: String,
      enum: [
        'Royalty & Payments',
        'ISBN & Metadata Issues',
        'Printing & Quality',
        'Distribution & Availability',
        'Book Status & Production Updates',
        'General Inquiry',
      ],
      default: 'General Inquiry',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    aiStatus: {
      type: String,
      enum: ['pending', 'done', 'failed'],
      default: 'pending',
    },
    aiDraft: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    unreadByAdmin: {
      type: Boolean,
      default: false,
    },
    unreadByAuthor: {
      type: Boolean,
      default: false,
    },
    replies: [replySchema],
    internalNotes: [internalNoteSchema],
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
