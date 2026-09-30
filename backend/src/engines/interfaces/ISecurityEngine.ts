export interface ScanConfig {
  targetUrl: string;
  tests: string[];
  intensity: 'light' | 'standard' | 'deep';
  authConfig?: { type: string; credential: string };
}

export interface ScanFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  description: string;
  affectedEndpoint: string;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface ScanResult {
  findings: ScanFinding[];
  duration: number;
  testsRun: number;
}

export interface ISecurityEngine {
  runScan(config: ScanConfig): Promise<ScanResult>;
}
