# 🛡️ Sentrix Cybersecurity Platform

> **Enterprise-Grade Cyber Threat Management, Vulnerability Remediation, Malware Analysis & Subscription Platform.**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js_20-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Live Services & Port Map](#-live-services--port-map)
- [Quick Start Guide (Docker)](#-quick-start-guide-docker)
- [Default Verified Accounts](#-default-verified-accounts)
- [Inspecting the Live Database](#-inspecting-the-live-database)
- [Key Features](#-key-features)
- [REST API Reference](#-rest-api-reference)
- [Environment Configuration](#-environment-configuration)
- [Local Development Without Docker](#-local-development-without-docker)

---

## 🌐 Overview

**Sentrix** is a production-grade cybersecurity operations platform designed to bridge the gap between security researchers, developers, platform administrators, and executive stakeholders. It provides:

- **Unified Vulnerability Management**: Track vulnerabilities across their entire lifecycle (Discovery $\rightarrow$ Triage $\rightarrow$ Remediation $\rightarrow$ Retest $\rightarrow$ Resolution).
- **Malware Analysis Sandbox**: Static analysis, dynamic emulation, behavioral heuristics, and IOC extraction.
- **Strict Role-Based Multi-Tenancy**: Dedicated workspaces and tailored operational consoles for 5 distinct roles.
- **Integrated Payment Gateway**: Real-time Chapa integration supporting local and international payment methods (telebirr, CBEBirr, Awash, Amole, and Card).
- **Admin Governance**: Multi-tenant user management with role assignment and cryptographic password hashing.

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │             Host Browser (User)              │
                               └──────┬──────────────────┬──────────────┬─────┘
                                      │ :5173            │ :3001        │ :8081
                                      ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Docker Network (scentrix_cyber_platform_default)                            │
│                                                                             │
│   ┌─────────────────────┐       ┌──────────────────────┐                   │
│   │     sentrix-web     │       │     sentrix-api      │                   │
│   │   (React 19/Vite)   │──────▶│ (Express 5/Mongoose) │                   │
│   │     Port: 5173      │       │      Port: 3001      │                   │
│   └─────────────────────┘       └──────────┬───────────┘                   │
│                                            │                                │
│                                            ▼                                │
│                                 ┌──────────────────────┐                    │
│                                 │    sentrix-mongo     │                    │
│   ┌─────────────────────┐       │   (MongoDB Engine)   │                    │
│   │sentrix-mongo-express│──────▶│      Port: 27017     │                    │
│   │ (Database Web GUI)  │       └──────────┬───────────┘                    │
│   │     Port: 8081      │                  │                                │
│   └─────────────────────┘                  ▼                                │
│                                 ┌──────────────────────┐                    │
│                                 │ Volume: mongodb_data │                    │
│                                 └──────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Role-Based Access Control (RBAC)

Authentication is strictly enforced. Direct console bypassing without authenticated credentials is blocked. Each user is routed strictly to their dedicated workspace based on their verified role:

| Role | Target Workspace | Primary Responsibilities |
| :--- | :--- | :--- |
| **Platform Admin** (`admin`) | `/dashboard/admin` | User provisioning, audit governance, system configurations, tenant control. |
| **Security Engineer** (`security_engineer`) | `/dashboard` | Vulnerability assessment, scan pipelines, pen-test findings, severity scoring. |
| **Client Owner** (`client_owner`) | `/dashboard` & `/dashboard/billing` | Executive overview, asset tracking, project scoping, subscription payments via Chapa. |
| **Malware Analyst** (`malware_analyst`) | `/dashboard/malware` | Static binary disassembly, behavioral traces, IOC extraction, Yara/MITRE mapping. |
| **Remediation Dev** (`developer`) | `/dashboard/remediation` | Kanban workflow, patch development, remediation tickets, verification requests. |

---

## 🚀 Live Services & Port Map

When running with Docker, all services are mapped to localhost:

| Service | Container Name | Host URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `sentrix-web` | [http://localhost:5173](http://localhost:5173) | Single-Page Application (SPA) with dark cyber UI |
| **Backend REST API** | `sentrix-api` | [http://localhost:3001/api](http://localhost:3001/api) | Express API, auth guards, business logic |
| **API Health Check** | `sentrix-api` | [http://localhost:3001/api/health](http://localhost:3001/api/health) | Live container health probe |
| **Database Web GUI** | `sentrix-mongo-express`| [http://localhost:8081](http://localhost:8081) | Interactive table and document viewer |
| **Database Server** | `sentrix-mongo` | `localhost:27017` | MongoDB 8.x document store |

---

## ⚡ Quick Start Guide (Docker)

Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.

### 1. Launch the Stack
Run from the project root:
```bash
docker compose up -d
```
*Starts MongoDB, the Express Backend API, the React Frontend, and Mongo Express in detached mode.*

### 2. Seed the Database
Populate verified test accounts, enterprise projects, findings, and malware cases:
```bash
docker compose exec api npm run seed
```

### 3. Open the Application
Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Stop the Stack
```bash
docker compose down
```
*(All data is safely persisted in the `mongodb_data` volume and will be available on next startup).*

---

## 🔑 Default Verified Accounts

All seeded accounts use the password: **`password123`**

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@sentrix.local` | Full platform governance, create new users, system audits. |
| **Security Engineer** | `jane@sentrix.local` | Create findings, run automated scans, triage vulnerabilities. |
| **Client Owner** | `john@acmecorp.local` | View Acme Corp portal, initialize Chapa billing & upgrades. |
| **Malware Analyst** | `sarah@sentrix.local` | Analyze suspicious binaries, extract IOCs, submit analysis. |
| **Remediation Dev** | `dev@sentrix.local` | Manage Kanban fix boards, submit patches, verify resolutions. |

---

## 🔍 Inspecting the Live Database

You have two easy ways to view all database tables (collections) and documents:

### Method A: Web GUI (Mongo Express)
1. Open **[http://localhost:8081](http://localhost:8081)**.
2. Click on the **`sentrix`** database.
3. Browse and edit collections visually:
   - `users`
   - `projects`
   - `findings`
   - `malwarecases`
   - `organizations`
   - `transactions`
   - `assessments`

### Method B: Terminal / Docker Desktop
From any terminal:
```bash
# View all tables (collections)
docker exec sentrix-mongo mongosh sentrix --eval "show collections"

# View all registered users
docker exec sentrix-mongo mongosh sentrix --eval "db.users.find({}, {email: 1, role: 1, _id: 0})"

# Open interactive MongoDB shell
docker exec -it sentrix-mongo mongosh sentrix
```

---

## ✨ Key Features

### 1. Multi-Channel Payment Forms (Chapa Integration)
- Dynamic payment methods with specialized, responsive checkout forms:
  - **telebirr**: Mobile number validation (`+2519...` / `+2517...`).
  - **CBEBirr / Commercial Bank of Ethiopia**: Direct CBE account integration.
  - **Awash Bank / AwashPay**: Secure internet banking redirection.
  - **Amole / Dashen Bank**: Verified Amole identifier support.
  - **Credit / Debit Cards**: Visa and MasterCard processing.
- Direct Chapa API transaction initialization and verification flow (`/api/payments/verify/:tx_ref`).

### 2. Admin User Creation Engine
- Platform Admins can provision new users directly from the Admin console (`/dashboard/admin`).
- Secure cryptographic password hashing with `bcryptjs` (salt rounds: 10).
- Immediate assignment of any system role (`security_engineer`, `client_owner`, `developer`, `malware_analyst`, `admin`).

### 3. Clean Workspace Registration
- New organizations and workspace administrators register at `/register`.
- Upon successful workspace setup, users are cleanly redirected to `/login` to authenticate with their assigned role.

### 4. Interactive Vulnerability & Malware Workflows
- **Finding Severity Tracking**: Real-time status changes (`open`, `in_progress`, `resolved`, `closed`).
- **Malware Sandbox**: Emulation logs, PE header analysis, static hash indexing (MD5, SHA256).

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user and receive signed JWT | No |
| `POST` | `/api/auth/register` | Register new organization and client owner | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & role | Yes |
| `POST` | `/api/auth/logout` | Invalidate active session | Yes |

### Admin Governance (`/api/admin`)
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/users` | Create new system user with assigned role | `admin` |
| `GET` | `/api/admin/users` | List all registered system users | `admin` |
| `GET` | `/api/admin/stats` | Platform-wide operational statistics | `admin` |

### Security Findings & Projects (`/api/findings`, `/api/projects`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | List all scoped security projects | Yes |
| `POST` | `/api/projects` | Create a new security assessment project | Yes |
| `GET` | `/api/findings` | Query vulnerability findings with filters | Yes |
| `POST` | `/api/findings` | Report a new vulnerability finding | Yes |
| `PATCH` | `/api/findings/:id` | Update finding status or remediation notes | Yes |

### Chapa Payments (`/api/payments`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/initialize` | Generate Chapa transaction checkout URL | Yes |
| `GET` | `/api/payments/verify/:tx_ref` | Query Chapa API and update transaction status | Yes |
| `GET` | `/api/payments/history` | View organization transaction history | Yes |

---

## ⚙️ Environment Configuration

Environment variables are managed inside `docker-compose.yml` for containerized runs, and via `.env` files for local development:

### Backend (`backend/.env`)
```ini
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/sentrix
JWT_SECRET=super-secret-development-key-change-in-production
NODE_ENV=development

# Chapa Payment Gateway
CHAPA_SECRET_KEY=CHAPA_TEST_PRIV_Y_E5QaFeS-kuM_j64hccd-5RQ5IuTaiGQU8_uNJC
CHAPA_PUBLIC_KEY=CHAPA_TEST_PUB_RGZaLprTEfS8H-13PnxA85jgJqzTFp3p2iUyDiG6
CHAPA_BASE_URL=https://api.chapa.global/v1
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:3001/api
```

---

## 💻 Local Development Without Docker

If you prefer to run services natively on your host machine:

### 1. Start MongoDB Locally
Ensure a local MongoDB server is listening on port `27017`.

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds default users & projects
npm run dev      # Starts API on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## 🛡️ License

This project is licensed under the **ISC License**.
