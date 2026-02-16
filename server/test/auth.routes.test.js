import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

describe('Auth routes', () => {
  it('registers a user directly without OTP', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Student One',
      email: 'student1@example.com',
      password: 'password123',
      examTargets: ['BCS']
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('student1@example.com');
    expect(response.body.user.role).toBe('student');
    expect(response.headers['set-cookie']).toBeTruthy();
  });

  it('registers and logs in a user with phone-only identifier', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Phone User',
      phone: '01700000000',
      password: 'password123'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.phone).toBe('01700000000');
    expect(registerResponse.body.user.email).toBeUndefined();

    const loginResponse = await request(app).post('/api/auth/login').send({
      phone: '01700000000',
      password: 'password123'
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.phone).toBe('01700000000');
  });

  it('blocks registration using reserved admin email', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Not Admin',
      email: 'admin@jobprep.com',
      password: 'password123'
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/reserved/i);
  });

  it('logs in a user via email and password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Student Two',
      email: 'student2@example.com',
      password: 'password123'
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'student2@example.com',
      password: 'password123'
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('student2@example.com');
    expect(response.headers['set-cookie']).toBeTruthy();
  });

  it('allows fixed admin login and upgrades role to admin', async () => {
    const hashed = await bcrypt.hash('old-pass', 10);
    await User.create({
      name: 'Aynal Haque',
      email: 'admin@jobprep.com',
      password: hashed,
      role: 'student'
    });

    const response = await request(app).post('/api/auth/admin-login').send({
      email: 'admin@jobprep.com',
      password: 'admin123'
    });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('admin');

    const updatedUser = await User.findOne({ email: 'admin@jobprep.com' }).lean();
    expect(updatedUser.role).toBe('admin');
  });

  it('rejects wrong admin password', async () => {
    const response = await request(app).post('/api/auth/admin-login').send({
      email: 'admin@jobprep.com',
      password: 'wrong-password'
    });

    expect(response.status).toBe(401);
  });
});
