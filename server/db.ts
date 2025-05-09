import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://agi_admin:X7UJ82nzrrtORPNM@dev.gdddmth.mongodb.net/agi_student_platform_dev?retryWrites=true&w=majority&appName=dev";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
    
    // Add these settings to help with development
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

export default connectDB;