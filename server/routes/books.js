import express from 'express';
import auth from '../middleware/auth.js';
import { getMyBooks } from '../controllers/bookController.js';

const router = express.Router();

// All book endpoints require authentication
router.use(auth);

// GET /api/books - author's own books
router.get('/', getMyBooks);

export default router;
