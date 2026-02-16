import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Exam from '../src/models/Exam.js';
import User from '../src/models/User.js';

function getCookie(response) {
  return response.headers['set-cookie'];
}

async function adminCookie() {
  const loginResponse = await request(app).post('/api/auth/admin-login').send({
    email: 'admin@jobprep.com',
    password: 'admin123'
  });
  return getCookie(loginResponse);
}

describe('Admin routes', () => {
  it('rejects non-admin users from admin dashboard', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Regular User',
      email: 'regular@example.com',
      password: 'password123'
    });

    const response = await request(app).get('/api/admin/dashboard').set('Cookie', getCookie(registerResponse));
    expect(response.status).toBe(403);
  });

  it('returns admin dashboard data for admin user', async () => {
    const cookie = await adminCookie();
    const response = await request(app).get('/api/admin/dashboard').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.totals).toBeTruthy();
    expect(response.body.performance).toBeTruthy();
  });

  it('creates an exam via admin route', async () => {
    const cookie = await adminCookie();
    const payload = {
      title: 'Admin Test Exam',
      category: 'BCS',
      examDate: new Date().toISOString(),
      durationMinutes: 60,
      totalMarks: 100
    };

    const response = await request(app).post('/api/admin/exam').set('Cookie', cookie).send(payload);

    expect(response.status).toBe(201);
    expect(response.body.title).toBe(payload.title);
    expect(response.body.category).toBe(payload.category);
  });

  it('supports preview + commit upload flow and stores history', async () => {
    const cookie = await adminCookie();
    const exam = await Exam.create({
      title: 'Upload Preview Exam',
      category: 'BCS',
      examDate: new Date(),
      questions: [
        {
          questionText: 'Existing question',
          options: ['A', 'B'],
          correctOptionIndex: 0
        }
      ]
    });

    const uploadRows = [
      {
        questionText: 'Existing question',
        options: ['A', 'B'],
        correctOptionIndex: 0
      },
      {
        questionText: 'New unique question',
        options: ['A', 'B'],
        correctOptionIndex: 1
      },
      {
        questionText: 'New unique question',
        options: ['A', 'B'],
        correctOptionIndex: 1
      }
    ];

    const previewResponse = await request(app)
      .post('/api/admin/question/upload-preview')
      .set('Cookie', cookie)
      .field('examId', exam._id.toString())
      .field('mode', 'append')
      .attach('file', Buffer.from(JSON.stringify(uploadRows), 'utf8'), 'question-upload.json');

    expect(previewResponse.status).toBe(201);
    expect(previewResponse.body.preview.counts.totalRows).toBe(3);
    expect(previewResponse.body.preview.counts.duplicateRows).toBe(2);
    expect(previewResponse.body.preview.counts.importableCount).toBe(1);

    const commitResponse = await request(app).post('/api/admin/question/upload-commit').set('Cookie', cookie).send({
      previewId: previewResponse.body.preview.previewId,
      duplicateHandling: 'skip'
    });

    expect(commitResponse.status).toBe(201);
    expect(commitResponse.body.importedCount).toBe(1);
    expect(commitResponse.body.skippedDuplicateCount).toBe(2);

    const updatedExam = await Exam.findById(exam._id).lean();
    expect(updatedExam.questions).toHaveLength(2);

    const historyResponse = await request(app).get('/api/admin/question/upload-history').set('Cookie', cookie);
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.total).toBe(1);
    expect(historyResponse.body.history[0].importedCount).toBe(1);
    expect(historyResponse.body.history[0].mode).toBe('append');
  });

  it('rejects preview upload when row count exceeds limit', async () => {
    const cookie = await adminCookie();
    const exam = await Exam.create({
      title: 'Row Limit Exam',
      category: 'Primary',
      examDate: new Date(),
      questions: []
    });

    const rows = Array.from({ length: 1001 }, (_, index) => ({
      questionText: `Question ${index + 1}`,
      options: ['A', 'B'],
      correctOptionIndex: 0
    }));

    const response = await request(app)
      .post('/api/admin/question/upload-preview')
      .set('Cookie', cookie)
      .field('examId', exam._id.toString())
      .field('mode', 'append')
      .attach('file', Buffer.from(JSON.stringify(rows), 'utf8'), 'too-many-rows.json');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/row limit/i);
  });

  it('soft deletes and restores exams without permanent data loss', async () => {
    const cookie = await adminCookie();
    const exam = await Exam.create({
      title: 'Soft Delete Exam',
      category: 'Bank',
      examDate: new Date(),
      questions: []
    });

    const deleteResponse = await request(app).delete(`/api/admin/exam/${exam._id}`).set('Cookie', cookie);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toMatch(/archived/i);

    const examFromCollection = await Exam.collection.findOne({ _id: exam._id });
    expect(examFromCollection).toBeTruthy();
    expect(examFromCollection.isDeleted).toBe(true);

    const listAfterDelete = await request(app).get('/api/exams');
    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body).toHaveLength(0);

    const restoreResponse = await request(app).post(`/api/admin/exam/${exam._id}/restore`).set('Cookie', cookie);
    expect(restoreResponse.status).toBe(200);
    expect(restoreResponse.body.message).toMatch(/restored/i);

    const listAfterRestore = await request(app).get('/api/exams');
    expect(listAfterRestore.status).toBe(200);
    expect(listAfterRestore.body).toHaveLength(1);
  });

  it('soft deletes and restores users with login access control', async () => {
    const cookie = await adminCookie();
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Archivable User',
      email: 'archivable@example.com',
      password: 'password123'
    });
    const userId = registerResponse.body.user.id;

    const deleteResponse = await request(app).delete(`/api/admin/users/${userId}`).set('Cookie', cookie);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toMatch(/archived/i);

    const deletedUser = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    expect(deletedUser).toBeTruthy();
    expect(deletedUser.isDeleted).toBe(true);

    const loginWhileDeleted = await request(app).post('/api/auth/login').send({
      email: 'archivable@example.com',
      password: 'password123'
    });
    expect(loginWhileDeleted.status).toBe(401);

    const restoreResponse = await request(app).post(`/api/admin/users/${userId}/restore`).set('Cookie', cookie);
    expect(restoreResponse.status).toBe(200);
    expect(restoreResponse.body.message).toMatch(/restored/i);

    const loginAfterRestore = await request(app).post('/api/auth/login').send({
      email: 'archivable@example.com',
      password: 'password123'
    });
    expect(loginAfterRestore.status).toBe(200);
  });
});
