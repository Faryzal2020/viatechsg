# Lightweight Backend Service

A lightweight, production-ready backend built with **Node.js**, **TypeScript**, **Express**, **SQLite** (using Node.js's native `DatabaseSync`), and **Nodemailer**.

It receives submissions through a single POST endpoint, stores records in a local SQLite database, and automatically sends an HTML/plaintext notification email using environment-defined SMTP credentials.

---

## 🚀 Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js v26 + TypeScript | Type safety, modern ES modules, zero extra runtime installs |
| **Framework** | Express 5 | Minimal, battle-tested HTTP handling |
| **Database** | SQLite (`node:sqlite`) | Zero-config, single-file storage with WAL mode enabled; no Docker or native build dependencies needed |
| **Email Service** | Nodemailer | Reliable SMTP dispatch supporting Gmail, Resend, Sendgrid, AWS SES, Mailtrap, etc. |
| **Development** | `tsx` | Ultra-fast TypeScript execution with instant hot-reloading (`watch`) |

---

## 📁 Project Structure

```
viatechsg/
├── .env.example            # Template for environment variables
├── .env                    # Local environment config (git-ignored)
├── .gitignore              # Ignores node_modules, build outputs, and database files
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript configuration
└── src/
    ├── server.ts           # Server bootstrap and graceful shutdown
    ├── app.ts              # Express configuration & middleware
    ├── config/
    │   └── env.ts          # Strongly typed environment configuration
    ├── db/
    │   ├── index.ts        # SQLite initialization (WAL mode, table creation)
    │   └── submissions.ts  # Database repository for saving & querying submissions
    ├── services/
    │   └── mailer.ts       # Nodemailer transporter & HTML email formatting
    └── routes/
        └── submissions.ts  # POST /api/submissions endpoint and helper routes
```

---

## ⚙️ Configuration (`.env`)

Copy `.env.example` to `.env` (already done for you) and configure your SMTP credentials:

```ini
PORT=3000
NODE_ENV=development
DB_PATH=./data.db

# Email / SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Notification Service <your_email@gmail.com>"
EMAIL_TO=recipient@example.com
EMAIL_SUBJECT="New Form Submission Received"
```

> **Note:** If SMTP credentials are not yet filled in, the server will still save incoming submissions to SQLite and return `201 Created` with a friendly notice (`skipped: true`) without failing the request.

---

## 🏃 Running the Project

### 1. Development Mode (with hot-reload)
```bash
npm run dev
```

### 2. Build and Start for Production
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### 1. Submit Data (Primary Endpoint)
- **Method:** `POST`
- **Path:** `/api/submissions` (or `/submit`)
- **Headers:** `Content-Type: application/json`
- **Body:** Any JSON object (fields can be arbitrary and will be dynamically stored and emailed)

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0199",
    "service": "Consulting",
    "message": "Looking for custom backend development."
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Submission received and saved successfully.",
  "submission": {
    "id": 1,
    "createdAt": "2026-10-27 14:20:36",
    "payload": {
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1-555-0199",
      "service": "Consulting",
      "message": "Looking for custom backend development."
    }
  },
  "email": {
    "sent": true,
    "messageId": "<...>"
  }
}
```

### 2. Inspect a Submission by ID
- **Method:** `GET`
- **Path:** `/api/submissions/:id`

### 3. List Recent Submissions
- **Method:** `GET`
- **Path:** `/api/submissions?limit=20`

### 4. Health Check
- **Method:** `GET`
- **Path:** `/health`

---

## 🛠️ How to Customize When You Finalize Fields

1. **Table Schema (`src/db/index.ts`):**
   Currently, all fields are preserved in the `payload` JSON column. If you prefer explicit SQL columns (e.g. `first_name`, `email`), simply update the `CREATE TABLE` query in [src/db/index.ts](file:///Users/visiadidayateknologi/Documents/viatechsg/src/db/index.ts).
2. **Data Layer (`src/db/submissions.ts`):**
   Update the `SubmissionRecord` interface and `saveSubmission` function in [src/db/submissions.ts](file:///Users/visiadidayateknologi/Documents/viatechsg/src/db/submissions.ts) to map your specific fields.
3. **Email Template (`src/services/mailer.ts`):**
   The email currently auto-generates a responsive HTML table from all incoming key-value pairs. You can customize the styling, branding, or layout in [src/services/mailer.ts](file:///Users/visiadidayateknologi/Documents/viatechsg/src/services/mailer.ts).
