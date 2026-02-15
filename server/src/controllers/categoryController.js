import Exam from '../models/Exam.js';
import { categoryMaterials, categoryMeta } from '../data/categoryData.js';

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function findCategoryByParam(param) {
  const needle = normalize(param);
  return categoryMeta.find((c) => c.id === needle || c.slug === needle || normalize(c.name) === needle);
}

export async function getCategories(req, res, next) {
  try {
    const counts = await Exam.aggregate([{ $group: { _id: '$category', totalExams: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((row) => [row._id, row.totalExams]));

    const categories = categoryMeta.map((item) => ({
      ...item,
      totalExams: countMap.get(item.name) || 0,
      totalMaterials: (categoryMaterials[item.slug] || []).length
    }));

    return res.json(categories);
  } catch (error) {
    return next(error);
  }
}

export async function getCategoryBySlug(req, res, next) {
  try {
    const category = findCategoryByParam(req.params.slug);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const totalExams = await Exam.countDocuments({ category: category.name });

    return res.json({
      ...category,
      totalExams,
      totalMaterials: (categoryMaterials[category.slug] || []).length
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamsByCategory(req, res, next) {
  try {
    const category = findCategoryByParam(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const exams = await Exam.find({ category: category.name }).sort({ examDate: 1, createdAt: -1 });

    return res.json({
      category,
      count: exams.length,
      exams
    });
  } catch (error) {
    return next(error);
  }
}

export async function getStudyMaterialsByCategory(req, res, next) {
  try {
    const category = findCategoryByParam(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const materials = categoryMaterials[category.slug] || [];

    return res.json({
      category,
      count: materials.length,
      materials
    });
  } catch (error) {
    return next(error);
  }
}
