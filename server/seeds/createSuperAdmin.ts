import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/agi_student_platform';

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ email: 'agiadmin@example.com' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      return;
    }

    // Create super admin user
    const superAdmin = new User({
      username: 'superadmin',
      email: 'agiadmin@example.com',
      password: 'agiAdmin@@1234567', // Will be hashed by the pre-save hook
      role: 'superadmin',
      accessEnabled: true
    });

    await superAdmin.save();
    console.log('Super admin created successfully');
    console.log('Email: agiadmin@example.com');
    console.log('Password: agiAdmin@@1234567');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSuperAdmin();
}

export { createSuperAdmin };