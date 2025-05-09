// server/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;
const RESET_DB = process.env.RESET_DB_ON_START === 'true';

export async function connectDB() {
  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, {
    // useNewUrlParser, useUnifiedTopology are on by default in Mongoose 6+
  });
  console.log('✅ Connected to MongoDB');

  if (RESET_DB) {
    console.log('🗑️ Dropping database (RESET_DB_ON_START=true)');
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    console.log('🗑️ Database dropped');
  }
}