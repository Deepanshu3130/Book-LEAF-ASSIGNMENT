import express from 'express';
import rateLimit from 'express-rate-limit';
import { login } from '../controllers/authController.js';

const router = express.Router();

// Rate limiter for authentication to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, login);

export default router;
