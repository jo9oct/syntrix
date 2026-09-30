import { Request, Response } from 'express';
import { Assessment } from '../models/Assessment';
import { Finding } from '../models/Finding';
import { Project } from '../models/Project';
import { Organization } from '../models/Organization';
import { MockSecurityEngine } from '../engines/mock/MockSecurityEngine';

const engine = new MockSecurityEngine();

export const getAssessments = async (req: Request, res: Response) => {
  try {
    const filter: any = (req.user?.role === 'admin' || req.user?.role === 'security_engineer' || !req.user?.organizationId)
      ? {}
      : { organizationId: req.user.organizationId };
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: assessments.length, data: assessments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const startAssessment = async (req: Request, res: Response) => {
  try {
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne();
      orgId = defaultOrg?._id;
    }
    const assessment = await Assessment.create({
      ...req.body,
      organizationId: orgId,
      createdBy: req.user._id,
      status: 'running',
      startedAt: new Date()
    });

    res.status(201).json({ success: true, data: assessment });

    // Run async scan in background
    process.nextTick(async () => {
      try {
        const result = await engine.runScan({
          targetUrl: assessment.targetUrl,
          tests: assessment.selectedTests,
          intensity: assessment.intensity
        });

        // Create findings
        const findingIds = [];
        let crit = 0, high = 0, med = 0, low = 0;

        for (const f of result.findings) {
          const newFinding = await Finding.create({
            title: f.title,
            severity: f.severity,
            description: f.description,
            affectedEndpoint: f.affectedEndpoint,
            evidence: f.evidence,
            impact: f.impact,
            recommendation: f.recommendation,
            status: 'open',
            assessmentId: assessment._id,
            projectId: assessment.projectId,
            organizationId: assessment.organizationId
          });
          findingIds.push(newFinding._id);

          if (f.severity === 'critical') crit++;
          else if (f.severity === 'high') high++;
          else if (f.severity === 'medium') med++;
          else if (f.severity === 'low') low++;
        }

        // Update Assessment
        await Assessment.findByIdAndUpdate(assessment._id, {
          status: 'completed',
          completedAt: new Date(),
          findings: findingIds,
          totalTests: result.testsRun,
          completedTests: result.testsRun,
          progress: 100
        });

        // Update Project Risk Summary (this is a simplified append for the mock)
        const project = await Project.findById(assessment.projectId);
        if (project) {
          project.riskSummary.critical += crit;
          project.riskSummary.high += high;
          project.riskSummary.medium += med;
          project.riskSummary.low += low;
          await project.save();
        }

      } catch (err) {
        console.error('Assessment failed', assessment._id, err);
        await Assessment.findByIdAndUpdate(assessment._id, { status: 'failed' });
      }
    });

  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getAssessment = async (req: Request, res: Response) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .populate('findings');
    if (!assessment) return res.status(404).json({ success: false, error: 'Assessment not found' });
    res.status(200).json({ success: true, data: assessment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
