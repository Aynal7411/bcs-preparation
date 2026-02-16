import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Exam from './models/Exam.js';

const DEFAULT_URL = 'https://chakribangla.com/bcs-question-solution/46-bcs.html';
const FALLBACK_URL = 'https://bcsanalysis.com/46th-bcs-preliminary-question/';
const LETTER_TO_INDEX = new Map([
  ['ক', 0],
  ['খ', 1],
  ['গ', 2],
  ['ঘ', 3],
  ['ঙ', 4],
  ['A', 0],
  ['B', 1],
  ['C', 2],
  ['D', 3],
  ['a', 0],
  ['b', 1],
  ['c', 2],
  ['d', 3]
]);

function toAsciiDigits(value) {
  const map = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9'
  };

  return String(value || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('');
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlToLines(html) {
  const sanitized = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n');

  return sanitized
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function parseAnswerIndex(answerText, options) {
  const cleaned = normalizeText(answerText);
  const letterMatch = cleaned.match(/\(?([কখগঘঙA-Da-d])\)?/);
  if (letterMatch) {
    const byLetter = LETTER_TO_INDEX.get(letterMatch[1]);
    if (Number.isInteger(byLetter) && byLetter >= 0 && byLetter < options.length) {
      return byLetter;
    }
  }

  const answerWithoutPrefix = cleaned
    .replace(/^[উu]ত্তর[:ঃ]?\s*/i, '')
    .replace(/^Ans(?:wer)?[:ঃ]?\s*/i, '')
    .trim();

  const matchedIndex = options.findIndex((option) => normalizeText(option).includes(answerWithoutPrefix));
  if (matchedIndex >= 0) {
    return matchedIndex;
  }

  return null;
}

function pushQuestionIfValid(list, current) {
  if (!current) return;
  if (!current.questionText || current.options.length < 2) return;
  if (!Number.isInteger(current.correctOptionIndex)) return;
  if (current.correctOptionIndex < 0 || current.correctOptionIndex >= current.options.length) return;

  list.push({
    questionText: current.questionText,
    options: current.options,
    correctOptionIndex: current.correctOptionIndex,
    explanation: current.explanation || ''
  });
}

function parseQuestionsAndAnswers(lines) {
  const questions = [];
  let current = null;

  for (const rawLine of lines) {
    const line = normalizeText(rawLine);

    const questionMatch = line.match(/^([০-৯\d]{1,3})\s*[.)।:-]+\s*(.+)$/);
    if (questionMatch) {
      const questionNumber = Number.parseInt(toAsciiDigits(questionMatch[1]), 10);
      if (questionNumber >= 1 && questionNumber <= 200) {
        pushQuestionIfValid(questions, current);
        current = {
          questionText: normalizeText(questionMatch[2]),
          options: [],
          correctOptionIndex: null,
          explanation: ''
        };
        continue;
      }
    }

    if (!current) continue;

    const optionMatch = line.match(/^\(?([কখগঘঙA-Da-d])\)?[.)]\s*(.+)$/);
    if (optionMatch) {
      current.options.push(normalizeText(optionMatch[2]));
      continue;
    }

    const answerMatch = line.match(/^(উত্তর|Ans(?:wer)?)[:ঃ]?\s*(.+)$/i);
    if (answerMatch) {
      const answerBody = normalizeText(answerMatch[2]);
      const index = parseAnswerIndex(answerBody, current.options);
      if (index !== null) {
        current.correctOptionIndex = index;
        current.explanation = `Answer key: ${answerBody}`;
      }
      continue;
    }
  }

  pushQuestionIfValid(questions, current);

  const deduped = [];
  const seen = new Set();
  for (const item of questions) {
    const key = normalizeText(item.questionText).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BCS-Importer/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}. Status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithFallback(primaryUrl) {
  try {
    const html = await fetchHtml(primaryUrl);
    return { html, sourceUrl: primaryUrl };
  } catch (primaryError) {
    if (primaryUrl === FALLBACK_URL) {
      throw primaryError;
    }

    const html = await fetchHtml(FALLBACK_URL);
    return { html, sourceUrl: FALLBACK_URL };
  }
}

function readUrlArg() {
  const fromArg = process.argv.find((item) => item.startsWith('--url='));
  if (fromArg) {
    return fromArg.replace('--url=', '').trim();
  }
  return DEFAULT_URL;
}

async function run() {
  const targetUrl = readUrlArg();
  await connectDB();

  const { html, sourceUrl } = await fetchWithFallback(targetUrl);
  const lines = stripHtmlToLines(html);
  const parsedQuestions = parseQuestionsAndAnswers(lines);

  if (parsedQuestions.length < 100) {
    throw new Error(
      `Parsed question count (${parsedQuestions.length}) is too low. Please verify source format. Source: ${sourceUrl}`
    );
  }

  const examPayload = {
    title: '46th BCS Preliminary',
    category: 'BCS',
    examDate: new Date('2024-04-26T00:00:00.000Z'),
    totalMarks: 200,
    durationMinutes: 120,
    isFeatured: true,
    questions: parsedQuestions,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  };

  const exam = await Exam.findOneAndUpdate(
    { title: examPayload.title, category: examPayload.category },
    { $set: examPayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('46th BCS import complete');
  console.log(`Source used: ${sourceUrl}`);
  console.log(`Exam ID: ${exam._id}`);
  console.log(`Total questions imported: ${parsedQuestions.length}`);
}

run()
  .catch((error) => {
    console.error('Failed to import 46th BCS questions from URL', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
