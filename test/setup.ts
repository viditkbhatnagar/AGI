import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '@testing-library/jest-dom';

// Load environment variables
dotenv.config();

beforeAll(async () => {
  // Connect to test database
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  // Clean up database connection
  await mongoose.connection.close();
});