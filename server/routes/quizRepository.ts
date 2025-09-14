import express from 'express';
import { 
  uploadQuizDocument,
  createQuizRepository,
  getQuizRepository,
  getQuizById,
  updateQuizQuestions,
  deployQuizToModule,
  deleteQuiz,
  getRandomizedQuiz,
  uploadMiddleware
} from '../controllers/quizRepositoryController.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin, requireAdminAccess } from '../middleware/require-auth.js';

const router = express.Router();

// Admin routes - write operations require admin only, read operations allow admin+superadmin
router.post('/upload', auth, requireAdmin, uploadMiddleware, uploadQuizDocument);
router.post('/create', auth, requireAdmin, createQuizRepository);
router.get('/', auth, requireAdminAccess, getQuizRepository);
router.get('/:id', auth, requireAdminAccess, getQuizById);
router.put('/:id', auth, requireAdmin, updateQuizQuestions);
router.post('/:id/deploy', auth, requireAdmin, deployQuizToModule);
router.delete('/:id', auth, requireAdmin, deleteQuiz);

// Student routes - for randomized quiz access
router.get('/student/:courseSlug/:moduleIndex', auth, getRandomizedQuiz);

export default router;