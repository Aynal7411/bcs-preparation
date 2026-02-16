import request from 'supertest';
import app from '../src/app.js';
import Exam from '../src/models/Exam.js';

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
});
