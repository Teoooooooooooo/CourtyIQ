const request = require('supertest');
const app = require('../src/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock Prisma Client BEFORE importing it
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // Mock the transaction object passed to the callback
      const tx = {
        user: { create: jest.fn() }
      };
      return callback(tx);
    })
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Returns the mocked instance

describe('Auth API Unit Tests', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'mysecretpassword';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';
  });

  afterAll(() => {
    // If the server listens, we should close it, but app.js just exports app and starts synchronously. 
    // In strict testing we might mock app.listen, but jest will exit anyway.
  });

  it('should register a new user successfully (200 + token)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    
    // Mock the transaction callback's `tx.user.create` result
    // The auth logic does: const user = await tx.user.create({...}); return user;
    // So the mock transaction will return what the inner mock returns.
    // wait, our mock implementation above passes `tx`! We need to mock tx.user.create inside the test
    const mockUser = { id: 'uuid-123', name: 'Test User', email: testEmail };
    
    jest.spyOn(prisma, '$transaction').mockImplementation(async (cb) => {
      const tx = { user: { create: jest.fn().mockResolvedValue(mockUser) } };
      return cb(tx);
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: testEmail,
        password: testPassword
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testEmail);
  });

  it('should fail to register with a duplicate email (409)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-existing', email: testEmail });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate User',
        email: testEmail,
        password: testPassword
      });
    
    expect(res.statusCode).toEqual(409);
    expect(res.body).toHaveProperty('error', 'Email already registered');
  });

  it('should login successfully with correct credentials (200 + token)', async () => {
    const passwordHash = await bcrypt.hash(testPassword, 1);
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-123', name: 'Login User', email: testEmail, passwordHash });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testEmail);
  });

  it('should fail to login with wrong password (401)', async () => {
    const passwordHash = await bcrypt.hash('differentpassword', 1);
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-123', email: testEmail, passwordHash });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });
});
