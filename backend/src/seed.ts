import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Organization } from './models/Organization';
import { Project } from './models/Project';
import { Finding } from './models/Finding';
import { MalwareCase } from './models/MalwareCase';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sentrix';

const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB at', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    console.log('🗑️ Clearing existing test collections...');
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Project.deleteMany({});
    await Finding.deleteMany({});
    await MalwareCase.deleteMany({});

    console.log('👤 Hashing security credentials...');
    const password = await bcrypt.hash('password123', 12);

    // 1. Client Owner
    const clientOwner = await User.create({
      name: 'John Doe',
      email: 'john@acmecorp.local',
      password,
      role: 'client_owner',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isActive: true
    });

    console.log('🏢 Creating primary organization...');
    const org = await Organization.create({
      name: 'Acme Corp',
      description: 'Global Financial & Enterprise Logistics Corp',
      ownerId: clientOwner._id,
      members: [{ userId: clientOwner._id, role: 'owner' }]
    });

    clientOwner.organizationId = org._id as any;
    await clientOwner.save();

    // 2. Security Engineer
    const engineer = await User.create({
      name: 'Jane Smith',
      email: 'jane@sentrix.local',
      password,
      role: 'security_engineer',
      organizationId: org._id,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isActive: true
    });

    // 3. Remediation Developer
    const developer = await User.create({
      name: 'Alex Rivera',
      email: 'dev@sentrix.local',
      password,
      role: 'developer',
      organizationId: org._id,
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isActive: true
    });

    // 4. Malware Analyst
    const analyst = await User.create({
      name: 'Sarah Connor',
      email: 'sarah@sentrix.local',
      password,
      role: 'malware_analyst',
      organizationId: org._id,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isActive: true
    });

    // 5. Platform Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@sentrix.local',
      password,
      role: 'admin',
      organizationId: org._id,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isActive: true
    });

    console.log('📁 Creating realistic enterprise projects...');
    const project1 = await Project.create({
      name: 'Main Web Portal Security Audit',
      description: 'Comprehensive dynamic penetration test and OWASP verification of customer web application.',
      organizationId: org._id,
      serviceType: 'web_app',
      status: 'active',
      targetUrl: 'https://portal.acmecorp.local',
      environment: 'Production',
      riskSummary: { critical: 1, high: 2, medium: 2, low: 1 },
      createdBy: engineer._id
    });

    const project2 = await Project.create({
      name: 'Mobile Core Banking API',
      description: 'REST and GraphQL endpoint security inspection, authorization fuzzing, and rate limit checks.',
      organizationId: org._id,
      serviceType: 'api',
      status: 'active',
      riskSummary: { critical: 0, high: 1, medium: 3, low: 0 },
      createdBy: engineer._id
    });

    const project3 = await Project.create({
      name: 'Internal Network Tool Assessment',
      description: 'Internal microservice security posture and secret management audit.',
      organizationId: org._id,
      serviceType: 'web_app',
      status: 'completed',
      riskSummary: { critical: 0, high: 0, medium: 1, low: 2 },
      createdBy: clientOwner._id
    });

    console.log('🐛 Creating verified vulnerability findings...');
    await Finding.insertMany([
      {
        title: 'SQL Injection in User Authentication Route',
        severity: 'critical',
        description: 'Authentication bypass and raw data extraction possible via unsanitized SQL concatenation in username parameter.',
        affectedEndpoint: 'POST /api/v1/auth/login',
        evidence: 'POST /api/login HTTP/1.1\nContent-Type: application/json\n\n{"username": "admin\' OR \'1\'=\'1\' --", "password": "test"}',
        impact: 'Full database read and write compromise, unauthorized admin session generation.',
        recommendation: 'Use parameterized queries / prepared statements with ORM query builders.',
        status: 'open',
        cvssScore: 9.8,
        projectId: project1._id,
        organizationId: org._id,
        assignedDeveloper: developer._id
      },
      {
        title: 'Broken Object Level Authorization (IDOR) on Invoices',
        severity: 'high',
        description: 'Access control check is absent when querying billing invoices by UUID, allowing horizontal privilege escalation.',
        affectedEndpoint: 'GET /api/v1/invoices/:id',
        evidence: 'GET /api/v1/invoices/inv-98124 HTTP/1.1\nAuthorization: Bearer customer_b_token (returned customer A invoice)',
        impact: 'Leakage of financial records and customer PII across tenants.',
        recommendation: 'Enforce tenant-isolated repository checks in middleware before query execution.',
        status: 'in_progress',
        cvssScore: 8.5,
        projectId: project1._id,
        organizationId: org._id,
        assignedDeveloper: developer._id,
        remediationNotes: 'Refactoring ownership validation middleware in auth service.',
        commitRef: 'git commit 4a8f9c2: Add req.user context checks'
      },
      {
        title: 'Reflected Cross-Site Scripting (XSS) in Catalog Search',
        severity: 'medium',
        description: 'Search parameter reflects directly into the DOM without HTML entity encoding or sanitization.',
        affectedEndpoint: 'GET /catalog/search?q=',
        evidence: 'GET /catalog/search?q=<script>alert(document.cookie)</script>',
        impact: 'Execution of arbitrary JavaScript in the victim browser session.',
        recommendation: 'Apply contextual HTML entity encoding and strict Content Security Policy headers.',
        status: 'ready_for_retest',
        cvssScore: 6.1,
        projectId: project1._id,
        organizationId: org._id,
        assignedDeveloper: developer._id,
        remediationNotes: 'Applied DOMPurify on search query input and merged to staging.',
        commitRef: 'PR #142: DOMPurify & HTML encoding applied'
      },
      {
        title: 'Missing Strict-Transport-Security & Content-Security-Policy',
        severity: 'low',
        description: 'HTTP response headers do not enforce HSTS (max-age) or a restrictive CSP policy.',
        affectedEndpoint: 'Global HTTP Responses',
        evidence: 'Strict-Transport-Security: header is absent from server response headers.',
        impact: 'Susceptibility to SSL-stripping man-in-the-middle attacks.',
        recommendation: 'Configure HSTS preload headers in reverse proxy (Nginx / Cloudflare).',
        status: 'fixed',
        cvssScore: 3.4,
        projectId: project1._id,
        organizationId: org._id,
        assignedDeveloper: developer._id,
        remediationNotes: 'Added HSTS header with max-age=31536000 and includeSubDomains.',
        commitRef: 'nginx.conf: add_header Strict-Transport-Security'
      },
      {
        title: 'GraphQL Introspection Query Enabled in Production',
        severity: 'medium',
        description: 'GraphQL endpoint exposes full schema details and unreleased mutations to anonymous callers.',
        affectedEndpoint: 'POST /graphql',
        evidence: '{"query": "{ __schema { types { name } } }"} returned full schema hierarchy.',
        impact: 'Aids attackers in reconnaissance and parameter discovery.',
        recommendation: 'Disable introspection in production environment.',
        status: 'open',
        cvssScore: 5.3,
        projectId: project2._id,
        organizationId: org._id,
        assignedDeveloper: developer._id
      }
    ]);

    console.log('🦠 Creating real malware triage cases...');
    await MalwareCase.insertMany([
      {
        caseName: 'Suspicious Invoice Dropper',
        sampleName: 'invoice_2026.pdf.exe',
        sampleHash: {
          md5: 'd41d8cd98f00b204e9800998ecf8427e',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        },
        sampleSize: 1048576,
        analystId: analyst._id,
        status: 'complete',
        riskLevel: 'critical',
        classification: 'Trojan.Downloader.Heuristic',
        iocs: ['185.220.101.47', 'malicious-c2-gateway.org', 'C:\\Windows\\Temp\\loader.dll'],
        mitreAttack: [
          'T1566: Spearphishing Attachment',
          'T1204: Malicious File Execution',
          'T1071: Standard Application Protocol C2'
        ],
        reportGenerated: true
      },
      {
        caseName: 'Obfuscated PowerShell Memory Loader',
        sampleName: 'update_service.ps1',
        sampleHash: {
          md5: '8b1a9953c4611296a827abf8c47804d7',
          sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
        },
        sampleSize: 24500,
        analystId: analyst._id,
        status: 'in_progress',
        riskLevel: 'high',
        classification: 'Script.PowerShell.Koadic',
        iocs: ['45.142.214.12', 'Invoke-Expression encoded command'],
        reportGenerated: false
      },
      {
        caseName: 'Internal Network Audit Binary',
        sampleName: 'network_scanner.py',
        sampleHash: {
          md5: 'e4d909c290d0fb1ca068ffaddf22cbd0',
          sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
        },
        sampleSize: 4500,
        analystId: analyst._id,
        status: 'new',
        riskLevel: 'low',
        classification: 'Clean / Admin Tool',
        iocs: [],
        reportGenerated: false
      }
    ]);

    console.log('✅ Real Database Seeding Complete!');
    console.log('----------------------------------------------------');
    console.log('🔑 Verified Accounts (All passwords: password123)');
    console.log('  1. Platform Admin     : admin@sentrix.local');
    console.log('  2. Security Engineer  : jane@sentrix.local');
    console.log('  3. Client Owner       : john@acmecorp.local');
    console.log('  4. Remediation Dev    : dev@sentrix.local');
    console.log('  5. Malware Analyst    : sarah@sentrix.local');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
