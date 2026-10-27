import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    book_id: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      required: true,
      trim: true,
    },
    genre: {
      type: String,
      required: true,
    },
    publication_date: {
      type: String,
      default: null,
      alias: 'publicationDate',
    },
    status: {
      type: String,
      required: true,
    },
    mrp: {
      type: Number,
      default: null,
    },
    author_royalty_per_copy: {
      type: Number,
      default: null,
    },
    total_copies_sold: {
      type: Number,
      default: 0,
      alias: 'copiesSold',
    },
    total_royalty_earned: {
      type: Number,
      default: 0,
      alias: 'royaltyEarned',
    },
    royalty_paid: {
      type: Number,
      default: 0,
      alias: 'royaltyPaid',
    },
    royalty_pending: {
      type: Number,
      default: 0,
      alias: 'royaltyPending',
    },
    last_royalty_payout_date: {
      type: String,
      default: null,
    },
    print_partner: {
      type: String,
      default: null,
    },
    available_on: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Book = mongoose.model('Book', bookSchema);
export default Book;
