import { Types } from 'mongoose';
export interface IUser {
  _id: Types.ObjectId;

  name: string;

  email: string;

  password: string;

  role: Types.ObjectId;

  phone?: string;

  address?: string;

  point?: number; // điểm tích lũy

  isVerified: boolean;

  createdAt: Date;

  updatedAt: Date;
}
