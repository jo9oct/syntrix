import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'super-secret-development-key-change-in-production', {
    expiresIn: '7d'
  });

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, organization } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);

    let org = await Organization.findOne({ name: organization });
    if (!org) {
      const tempUser = new User({ name, email, password: hashed, role: 'client_owner', isActive: true });
      await tempUser.save();
      org = await Organization.create({ name: organization, ownerId: tempUser._id, members: [{ userId: tempUser._id, role: 'owner' }] });
      tempUser.organizationId = org._id as any;
      await tempUser.save();
      const token = signToken(String(tempUser._id));
      return res.status(201).json({ success: true, data: { token, user: { id: tempUser._id, name, email, role: tempUser.role } } });
    }

    const user = await User.create({ name, email, password: hashed, role: 'client_member', organizationId: org._id, isActive: true });
    const token = signToken(String(user._id));
    res.status(201).json({ success: true, data: { token, user: { id: user._id, name, email, role: user.role } } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(String(user._id));
    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: req.user });
};
