import Book from '../models/Book.js';

// Returns all books belonging to the authenticated author
export const getMyBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    next(error);
  }
};
