import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IKycDocument {
    documentType: 'PASSPORT' | 'UTILITY_BILL' | 'INTERNATIONAL_PASSPORT' | 'RESIDENCE_PERMIT';
    filePath: string;
    submittedAt: Date;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  avatar: string;
  balance: number;
  role: 'USER' | 'ADMIN';
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycDocuments: IKycDocument[];
  kycRejectionReason?: string;
}

const kycDocumentSchema = new Schema<IKycDocument>({
    documentType: { type: String, required: true, enum: ['PASSPORT', 'UTILITY_BILL', 'INTERNATIONAL_PASSPORT', 'RESIDENCE_PERMIT'] },
    filePath: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  avatar: { type: String, default: 'default_avatar.png' },
  balance: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  },

  passwordResetCode: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  kycStatus: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NOT_SUBMITTED',
  },
  kycDocuments: [kycDocumentSchema],
  kycRejectionReason: { type: String },
}, {
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.model<IUser>('User', userSchema);

export default User;