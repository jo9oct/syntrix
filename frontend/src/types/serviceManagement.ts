export type ServiceType = 'security_assessment' | 'secure_development';

export type ServiceOrderStatus =
  | 'pending_review'
  | 'under_review'
  | 'info_requested'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type ServicePriority = 'low' | 'medium' | 'high' | 'critical';

export type AssignedTeamType = 'security_engineering' | 'development' | 'malware_analysis';

export type ProjectPhase =
  | 'intake'
  | 'planning'
  | 'in_progress'
  | 'security_review'
  | 'admin_review'
  | 'client_acceptance'
  | 'delivered';

export type ProjectStatus =
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived'
  | 'planning'
  | 'in_development'
  | 'ready_for_security_review'
  | 'in_security_testing'
  | 'remediation_in_progress'
  | 'final_approval';

export type TaskType =
  | 'development'
  | 'security_audit'
  | 'vulnerability_fix'
  | 'retest_verification'
  | 'documentation';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface UserSummary {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
}

export interface InfoRequestItem {
  _id?: string;
  id?: string;
  requestedBy: UserSummary | string;
  question: string;
  requestedAt: string;
  answeredBy?: UserSummary | string;
  answer?: string;
  answeredAt?: string;
  status: 'pending' | 'answered';
}

export interface ServiceOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  title: string;
  serviceType: ServiceType;
  projectType?: string;
  submittedByDeveloper?: boolean;
  description: string;
  requirements?: string[];
  targetUrl: string;
  priority: ServicePriority;
  status: ServiceOrderStatus;
  clientId: UserSummary | string;
  organizationId: any;
  assignedTeam?: AssignedTeamType;
  assignedSpecialists?: (UserSummary | string)[];
  targetId?: string;
  deadline?: string;
  budget?: {
    estimated?: number;
    currency?: string;
    agreed?: number;
  };
  attachments?: Array<{
    name: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }>;
  infoRequests?: InfoRequestItem[];
  serviceProjectId?: string | ServiceProject;
  adminNotes?: string;
  clientSignoff?: {
    accepted?: boolean;
    acceptedAt?: string;
    feedback?: string;
    rating?: number;
  };
  comments?: OrderComment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderComment {
  _id?: string;
  sender: UserSummary | string;
  senderRole?: string;
  senderName?: string;
  message: string;
  createdAt: string;
}

export interface TestingFeedbackAttachment {
  name: string;
  url: string;
  fileType?: string;
  fileSize?: string;
}

export interface TestingFeedbackItem {
  _id?: string;
  rejectedBy?: UserSummary | string;
  reason: string;
  notes?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  attachments?: TestingFeedbackAttachment[];
  resolved?: boolean;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt?: string;
}

export interface DeliverableItem {
  _id?: string;
  name: string;
  title?: string;
  fileUrl: string;
  url?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  uploadedBy?: UserSummary | string;
  uploadedAt?: string;
  submittedAt?: string;
  approved?: boolean;
  approvedBy?: UserSummary | string;
}

export interface TaskComment {
  _id?: string;
  id?: string;
  author: UserSummary | string;
  message: string;
  createdAt: string;
}

export interface ProjectTask {
  _id: string;
  id?: string;
  taskCode: string;
  serviceProjectId: string | ServiceProject;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: ServicePriority;
  assignedTo?: UserSummary | string;
  createdBy?: UserSummary | string;
  findingId?: any; // linked finding
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProject {
  _id: string;
  id?: string;
  projectCode: string;
  serviceOrderId: ServiceOrder | string;
  title: string;
  serviceType: ServiceType;
  projectType?: string;
  submittedByDeveloper?: boolean;
  description?: string;
  targetUrl?: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  priority: ServicePriority;
  progress: number;
  developmentProgress?: number;
  securityTestingProgress?: number;
  deadline?: string;
  dueDate?: string;
  clientId: UserSummary | string;
  organizationId: any;
  developmentLead?: UserSummary | string;
  securityLead?: UserSummary | string;
  assignedTeam?: (UserSummary | string)[];
  assignedDevelopers?: (UserSummary | string)[];
  assignedSecurityEngineers?: (UserSummary | string)[];
  assignedMalwareAnalysts?: (UserSummary | string)[];
  tasks?: ProjectTask[];
  findings?: any[];
  deliverables?: DeliverableItem[];
  testingFeedback?: TestingFeedbackItem[];
  signOffs?: {
    securityLead?: {
      approved?: boolean;
      approvedBy?: UserSummary | string;
      approvedAt?: string;
      notes?: string;
      findingsSummary?: {
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
        open?: number;
        verified?: number;
      };
    };
    adminLead?: {
      approved?: boolean;
      approvedBy?: UserSummary | string;
      approvedAt?: string;
      notes?: string;
    };
    clientAcceptance?: {
      accepted?: boolean;
      acceptedBy?: UserSummary | string;
      acceptedAt?: string;
      feedback?: string;
      rating?: number;
    };
  };
  startDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  isDeliveredToClient?: boolean;
  deliveredAt?: string;
  deliveredBy?: UserSummary | string;
  deliveryNotes?: string;
  deliverablesPendingRelease?: boolean;
  createdAt: string;
  updatedAt: string;
}

