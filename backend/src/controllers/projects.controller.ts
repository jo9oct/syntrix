import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Organization } from '../models/Organization';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const filter = (req.user?.role === 'admin' || req.user?.role === 'security_engineer' || !req.user?.organizationId)
      ? {}
      : { organizationId: req.user.organizationId };
    const projects = await Project.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne();
      orgId = defaultOrg?._id;
    }
    const project = await Project.create({
      ...req.body,
      organizationId: orgId,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(200).json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body, { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(200).json({ success: true, data: project });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
