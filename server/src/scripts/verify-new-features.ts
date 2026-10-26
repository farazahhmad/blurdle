import mongoose from 'mongoose';
import { User } from '../models/User';
import { Game } from '../models/Game';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function runTests() {
  console.log('🧪 Starting test verification suite for Blurdle new features...');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-blurdle';
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB for verification');
  } catch (err: any) {
    console.log('⚠️ Could not connect to remote DB directly for unit tests:', err.message);
    console.log('Testing offline models & auth cryptography...');
  }

  // 1. Password hash verification
  const password = 'SecretPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const match = await bcrypt.compare(password, hash);
  if (!match) throw new Error('Password hashing verification failed');
  console.log('✅ Password bcrypt hash and compare verified');

  // 2. JWT issuance & verification
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';
  const token = jwt.sign({ userId: 'mock-user-123', email: 'test@example.com', displayName: 'Tester' }, secret);
  const decoded = jwt.verify(token, secret) as any;
  if (decoded.userId !== 'mock-user-123') throw new Error('JWT verification failed');
  console.log('✅ JWT signing and decoding verified');

  // 3. Schema validation check
  const testUser = new User({
    email: 'TestUser@Example.COM',
    displayName: 'TestUser',
  });
  if (testUser.email !== 'testuser@example.com') {
    throw new Error('User schema lowercase normalization failed');
  }
  console.log('✅ User model normalization verified');

  // 4. Game model playedOnDate check
  const testGame = new Game({
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    puzzleNumber: 9999,
  });
  if (testGame.playedOnDate !== true) {
    throw new Error('Game playedOnDate default value should be true');
  }
  console.log('✅ Game model backward-compatible defaults verified');

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  console.log('🎉 All automated unit verifications passed cleanly!');
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
