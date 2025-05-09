// server/models/user.ts
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'student';
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin','student'], required: true }
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = function(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUserDocument>('User', UserSchema);