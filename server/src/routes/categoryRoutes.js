import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  getExamsByCategory,
  getStudyMaterialsByCategory
} from '../controllers/categoryController.js';

const router = Router();

router.get('/', getCategories);
router.get('/:id/exams', getExamsByCategory);
router.get('/:id/materials', getStudyMaterialsByCategory);
router.get('/:slug', getCategoryBySlug);

export default router;
