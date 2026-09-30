import { Request, Response } from 'express';
import { Finding } from '../models/Finding';
import { Project } from '../models/Project';
import { Organization } from '../models/Organization';

export const getFindings = async (req: Request, res: Response) => {
  try {
    const filter: any = (req.user?.role === 'admin' || req.user?.role === 'security_engineer' || !req.user?.organizationId)
      ? {}
      : { organizationId: req.user.organizationId };
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const findings = await Finding.find(filter)
      .populate('projectId', 'name')
      .populate('assignedDeveloper', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: findings.length, data: findings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createFinding = async (req: Request, res: Response) => {
  try {
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne();
      orgId = defaultOrg?._id;
    }
    const finding = await Finding.create({
      ...req.body,
      organizationId: orgId
    });

    if (finding.projectId) {
      const critCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'critical', status: { $ne: 'closed' } });
      const highCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'high', status: { $ne: 'closed' } });
      const medCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'medium', status: { $ne: 'closed' } });
      const lowCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'low', status: { $ne: 'closed' } });
      await Project.findByIdAndUpdate(finding.projectId, {
        riskSummary: { critical: critCount, high: highCount, medium: medCount, low: lowCount }
      });
    }

    res.status(201).json({ success: true, data: finding });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getFinding = async (req: Request, res: Response) => {
  try {
    const query = (req.user?.role === 'admin' || req.user?.role === 'security_engineer' || !req.user?.organizationId)
      ? { _id: req.params.id }
      : { _id: req.params.id, organizationId: req.user.organizationId };
    const finding = await Finding.findOne(query)
      .populate('projectId', 'name').populate('assignedDeveloper', 'name email');
    if (!finding) return res.status(404).json({ success: false, error: 'Finding not found' });
    res.status(200).json({ success: true, data: finding });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateFinding = async (req: Request, res: Response) => {
  try {
    const query = (req.user?.role === 'admin' || req.user?.role === 'security_engineer' || !req.user?.organizationId)
      ? { _id: req.params.id }
      : { _id: req.params.id, organizationId: req.user.organizationId };
    const finding = await Finding.findOneAndUpdate(
      query,
      req.body, { new: true, runValidators: true }
    );
    if (!finding) return res.status(404).json({ success: false, error: 'Finding not found' });

    // Update project risk summary
    const critCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'critical', status: { $ne: 'closed' } });
    const highCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'high', status: { $ne: 'closed' } });
    const medCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'medium', status: { $ne: 'closed' } });
    const lowCount = await Finding.countDocuments({ projectId: finding.projectId, severity: 'low', status: { $ne: 'closed' } });
    await Project.findByIdAndUpdate(finding.projectId, {
      riskSummary: { critical: critCount, high: highCount, medium: medCount, low: lowCount }
    });

    res.status(200).json({ success: true, data: finding });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

