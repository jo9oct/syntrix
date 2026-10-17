
// STATUS: UPDATED
// FILE: backend/src/seed.js
// PURPOSE: Seed test users, organizations, projects, and malware cases without Finding dependencies.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { User } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { Project } from "./models/Project.js";
import { MalwareCase } from "./models/MalwareCase.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const seedDatabase = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Database seeding is disabled in production.");
    }

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required.");
    }

    let databaseName;

    try {
      const connectionUrl = new URL(MONGODB_URI);
      databaseName = connectionUrl.pathname.replace(/^\/+/, "");
    } catch {
      throw new Error("MONGODB_URI is not a valid MongoDB connection URL.");
    }

    if (!databaseName || ["admin", "local", "config"].includes(databaseName)) {
      throw new Error(
        "Refusing to seed an unspecified or system database. Set MONGODB_URI to a dedicated test database.",
      );
    }

    console.log("Connecting to the test database...");

    await mongoose.connect(MONGODB_URI);

    console.log("Clearing existing test collections...");

    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Project.deleteMany({}),
      MalwareCase.deleteMany({}),
    ]);

    console.log("Creating test credentials...");

    const password = await bcrypt.hash("password123", 12);

    // 1. Client Owner
    const clientOwner = await User.create({
      name: "John Doe",
      email: "john@acmecorp.local",
      password,
      role: "client_owner",
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      isActive: true,
    });

    // 2. Organization
    const org = await Organization.create({
      name: "Acme Corp",
      description: "Global Financial & Enterprise Logistics Corp",
      ownerId: clientOwner._id,
      members: [
        {
          userId: clientOwner._id,
          role: "owner",
        },
      ],
    });

    clientOwner.organizationId = org._id;
    await clientOwner.save();

    // 3. Security Engineer
    const engineer = await User.create({
      name: "Jane Smith",
      email: "jane@sentrix.local",
      password,
      role: "security_engineer",
      organizationId: org._id,
      subscriptionTier: "enterprise",
      subscriptionStatus: "active",
      isActive: true,
    });

    // 4. Remediation Developer
    await User.create({
      name: "Alex Rivera",
      email: "dev@sentrix.local",
      password,
      role: "developer",
      organizationId: org._id,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      isActive: true,
    });

    // 5. Malware Analyst
    const analyst = await User.create({
      name: "Sarah Connor",
      email: "sarah@sentrix.local",
      password,
      role: "malware_analyst",
      organizationId: org._id,
      subscriptionTier: "enterprise",
      subscriptionStatus: "active",
      isActive: true,
    });

    // 6. Platform Admin
    await User.create({
      name: "System Admin",
      email: "admin@sentrix.local",
      password,
      role: "admin",
      organizationId: org._id,
      subscriptionTier: "enterprise",
      subscriptionStatus: "active",
      isActive: true,
    });

    console.log("Creating test projects...");

    await Project.create([
      {
        name: "Main Web Portal Security Audit",
        description:
          "Comprehensive dynamic penetration test and OWASP verification of a customer web application.",
        organizationId: org._id,
        serviceType: "web_app",
        status: "active",
        riskSummary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        createdBy: engineer._id,
      },
      {
        name: "Mobile Core Banking API",
        description:
          "REST and GraphQL endpoint security inspection, authorization fuzzing, and rate-limit checks.",
        organizationId: org._id,
        serviceType: "api",
        status: "active",
        riskSummary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        createdBy: engineer._id,
      },
      {
        name: "Internal Network Tool Assessment",
        description:
          "Internal microservice security posture and secret-management audit.",
        organizationId: org._id,
        serviceType: "web_app",
        status: "completed",
        riskSummary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        createdBy: clientOwner._id,
      },
    ]);

    console.log("Creating test malware triage cases...");

    await MalwareCase.insertMany([
      {
        caseName: "Suspicious Invoice Dropper",
        sampleName: "invoice_2026.pdf.exe",
        sampleHash: {
          md5: "d41d8cd98f00b204e9800998ecf8427e",
          sha256:
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        sampleSize: 1048576,
        mimeType: "application/octet-stream",
        analystId: analyst._id,
        status: "complete",
        riskLevel: "critical",
        classification: "Trojan.Downloader.Heuristic",
        iocs: [
          "185.220.101.47",
          "malicious-c2-gateway.org",
          String.raw`C:\Windows\Temp\loader.dll`,
        ],
        mitreAttack: [
          "T1566: Spearphishing Attachment",
          "T1204: Malicious File Execution",
          "T1071: Standard Application Protocol C2",
        ],
        reportGenerated: true,
      },
      {
        caseName: "Obfuscated PowerShell Memory Loader",
        sampleName: "update_service.ps1",
        sampleHash: {
          md5: "8b1a9953c4611296a827abf8c47804d7",
          sha256:
            "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        },
        sampleSize: 24500,
        mimeType: "text/plain",
        analystId: analyst._id,
        status: "in_progress",
        riskLevel: "high",
        classification: "Script.PowerShell.Koadic",
        iocs: ["45.142.214.12", "Invoke-Expression encoded command"],
        reportGenerated: false,
      },
      {
        caseName: "Internal Network Audit Binary",
        sampleName: "network_scanner.py",
        sampleHash: {
          md5: "e4d909c290d0fb1ca068ffaddf22cbd0",
          sha256:
            "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
        },
        sampleSize: 4500,
        mimeType: "text/x-python",
        analystId: analyst._id,
        status: "new",
        riskLevel: "low",
        classification: "Clean / Admin Tool",
        iocs: [],
        reportGenerated: false,
      },
    ]);

    console.log("Test database seeding complete!");
    console.log("----------------------------------------------------");
    console.log("Test accounts (all passwords: password123)");
    console.log("1. Platform Admin    : admin@sentrix.local");
    console.log("2. Security Engineer : jane@sentrix.local");
    console.log("3. Client Owner      : john@acmecorp.local");
    console.log("4. Remediation Dev   : dev@sentrix.local");
    console.log("5. Malware Analyst   : sarah@sentrix.local");
    console.log("----------------------------------------------------");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch((error) => {
        console.error("Failed to disconnect from MongoDB:", error);
      });
    }
  }
};

await seedDatabase();
