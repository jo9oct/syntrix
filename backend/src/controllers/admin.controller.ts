import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate('organizationId', 'name')
      .sort({ createdAt: -1 });

    const formatted = users.map((u: any) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      org: u.organizationId?.name || 'Sentrix Operations',
      status: u.isActive ? 'active' : 'suspended',
      lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never',
      createdAt: u.createdAt
    }));

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, organization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, password, and role' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let orgId = undefined;
    if (organization) {
      let org = await Organization.findOne({ name: organization });
      if (!org) {
        org = await Organization.create({ name: organization, ownerId: req.user._id });
      }
      orgId = org._id;
    } else {
      const defaultOrg = await Organization.findOne();
      orgId = defaultOrg?._id;
    }

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId: orgId,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        org: organization || 'Sentrix Operations',
        status: 'active',
        lastLogin: 'Never'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: String(user._id),
        status: user.isActive ? 'active' : 'suspended'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
