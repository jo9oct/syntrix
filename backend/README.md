# Professional Web Security Assessment Platform

A production-oriented backend for authorized web security assessments.

The backend is implemented with:

- Node.js runtime
- Express.js
- MongoDB
- Mongoose
- Redis
- BullMQ
- Cloudinary
- Joi
- Axios
- Docker
- Docker Compose

## Architecture

```text
Node.js runtime
       ↓
Express.js backend
       ↓
REST API
       ↓
Services
       ↓
Scanning Engine
       ↓
Workers / Redis
       ↓
MongoDB / Cloudinary