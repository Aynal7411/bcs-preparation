import request from 'supertest';
import app from '../src/app.js';
import Exam from '../src/models/Exam.js';

function getCookie(response) {
  return response.headers['set-cookie'];
}

describe('Exam routes', () => {
  it('lists available exams', async () => {
    await Exam.create({
      title: 'Listable Exam',
      category: 'BCS',
      examDate: new Date(),
      questions: [
        {
          questionText: 'What is 2 + 2?',
          options: ['3', '4'],
          correctOptionIndex: 1
        }
      ]
    });

    const response = await request(app).get('/api/exams');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
  });

  it('supports start and submit exam flow', async () => {
    const exam = await Exam.create({
      title: 'Submission Exam',
      category: 'Primary',
      examDate: new Date(),
      totalMarks: 100,
      questions: [
        {
          questionText: 'Capital of Bangladesh?',
          options: ['Dhaka', 'Chittagong'],
          correctOptionIndex: 0
        }
      ]
    });

    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Exam Student',
      email: 'exam-student@example.com',
      password: 'password123'
    });
    const cookie = getCookie(registerResponse);

    const startResponse = await request(app).post(`/api/exams/start/${exam._id}`).set('Cookie', cookie);
    expect(startResponse.status).toBe(201);

    const questionId = String(exam.questions[0]._id);
    const submitResponse = await request(app)
      .post(`/api/exams/submit/${exam._id}`)
      .set('Cookie', cookie)
      .send({
        answers: [
          {
            questionId,
            selectedOptionIndex: 0
          }
        ]
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.result.status).toBe('submitted');
    expect(submitResponse.body.result.correctAnswers).toBe(1);
  });
});
