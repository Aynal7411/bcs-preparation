import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Exam from './models/Exam.js';
import ExamResult from './models/ExamResult.js';
import QuestionBookmark from './models/QuestionBookmark.js';
import Payment from './models/Payment.js';
import JobCircular from './models/JobCircular.js';
import Testimonial from './models/Testimonial.js';
import { buildBcsPreliminaryExamSets } from './data/bcsPreliminarySets.js';

await connectDB();

await Promise.all([
  User.deleteMany({}),
  Exam.deleteMany({}),
  ExamResult.deleteMany({}),
  QuestionBookmark.deleteMany({}),
  Payment.deleteMany({}),
  JobCircular.deleteMany({}),
  Testimonial.deleteMany({})
]);

const adminPass = await bcrypt.hash('admin123', 10);
await User.create({ name: 'Admin', email: 'admin@jobprep.com', password: adminPass, role: 'admin' });

const baseExams = [
  {
    title: '43rd BCS Model Test',
    category: 'BCS',
    examDate: new Date('2026-02-20'),
    isFeatured: true,
    enrolledStudents: 12000,
    questions: [
      {
        questionText: 'Which article of the Constitution of Bangladesh relates to fundamental rights?',
        options: ['Article 26-47A', 'Article 1-7', 'Article 70', 'Article 102'],
        correctOptionIndex: 0,
        explanation: 'Fundamental rights are covered under Articles 26-47A.'
      },
      {
        questionText: 'Who wrote the book Pather Panchali?',
        options: ['Kazi Nazrul Islam', 'Rabindranath Tagore', 'Bibhutibhushan Bandyopadhyay', 'Sarat Chandra Chattopadhyay'],
        correctOptionIndex: 2,
        explanation: 'Pather Panchali was written by Bibhutibhushan Bandyopadhyay.'
      }
    ]
  },
  {
    title: 'Primary Teacher Full Syllabus',
    category: 'Primary',
    examDate: new Date('2026-02-24'),
    isFeatured: true,
    enrolledStudents: 8700,
    questions: [
      {
        questionText: 'What is the value of 12 x 8?',
        options: ['86', '96', '106', '92'],
        correctOptionIndex: 1,
        explanation: '12 multiplied by 8 equals 96.'
      },
      {
        questionText: 'Which is a noun?',
        options: ['Quickly', 'Beautiful', 'Honesty', 'Run'],
        correctOptionIndex: 2,
        explanation: 'Honesty is an abstract noun.'
      }
    ]
  },
  {
    title: 'NTRCA Practice Set',
    category: 'NTRCA',
    examDate: new Date('2026-02-28'),
    isFeatured: true,
    enrolledStudents: 6900,
    questions: [
      {
        questionText: 'Which teaching method emphasizes student participation?',
        options: ['Lecture Method', 'Discussion Method', 'Dictation Method', 'Translation Method'],
        correctOptionIndex: 1,
        explanation: 'Discussion method is based on active participation of students.'
      },
      {
        questionText: 'Bloom taxonomy primarily describes what?',
        options: ['Weather pattern', 'Learning objectives', 'School management', 'Language structure'],
        correctOptionIndex: 1,
        explanation: 'Bloom taxonomy classifies learning objectives.'
      }
    ]
  }
];

const bcsPreliminarySets = buildBcsPreliminaryExamSets(10, 50);

await Exam.insertMany([...baseExams, ...bcsPreliminarySets]);

await JobCircular.insertMany([
  {
    title: 'Bangladesh Bank Officer General',
    organization: 'Bangladesh Bank',
    category: 'Bank',
    deadline: new Date('2026-03-05'),
    detailsUrl: 'https://erecruitment.bb.org.bd'
  },
  {
    title: 'NTRCA 6th Cycle Recruitment',
    organization: 'NTRCA',
    category: 'NTRCA',
    deadline: new Date('2026-03-12'),
    detailsUrl: 'https://ntrca.gov.bd'
  }
]);

await Testimonial.insertMany([
  { studentName: 'Rahim Uddin', examName: '43rd BCS', message: 'The mock tests were very close to real exam pattern.', rankOrResult: 'Cadre' },
  { studentName: 'Nusrat Jahan', examName: 'Primary Teacher', message: 'Daily practice improved my speed and accuracy.', rankOrResult: 'Selected' },
  { studentName: 'Mizanur Rahman', examName: 'Bank Job', message: 'Job updates and explanations were extremely useful.', rankOrResult: 'Written Passed' }
]);

console.log('Seed complete');
await mongoose.connection.close();
