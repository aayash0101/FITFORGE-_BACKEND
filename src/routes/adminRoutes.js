import express from 'express';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/users', protect, adminOnly, asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, total: users.length, users });
}));

export default router;