# CMK CareSuite Backend Server

A production-ready, highly modular, and secure Node.js backend server designed for **CMK CareSuite — Professional Healthcare Management System**. 

This application handles authentication, patient registrations (supporting a rich metadata set mapped directly from the CareSuite frontend), and role-based route protection.

---

## 🌟 Technology Stack

- **Framework**: Node.js & [Express.js](https://expressjs.com/) (using ES Modules `"type": "module"`)
- **Database Layer**: PostgreSQL & [Prisma ORM](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Winston](https://github.com/winstonjs/winston) (custom console/file logs)
- **Security**: [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors), [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- **Testing**: [Jest](https://jestjs.io/) & [Supertest](https://github.com/ladjs/supertest)
- **Containerization**: Docker & Docker Compose

---

## 📁 Folder Structure

```text
cmk-caresuite-server/
│
├── prisma/
│   └── schema.prisma                # Prisma DB datasource, models, and indexes
│
├── src/
│   ├── config/                      # Application configurations
│   │   ├── database.js              # Connection pooling & lifecycle via Prisma
│   │   ├── env.js                   # Zod environment variable parsing
│   │   ├── logger.js                # Winston logger configurations
│   │   └── index.js                 # Unified exports
│   │
│   ├── middlewares/                 # Global Express middlewares
│   │   ├── auth.middleware.js       # JWT & role authorization guards
│   │   ├── error.middleware.js      # Centered error handler
│   │   ├── rateLimit.middleware.js  # DDoS/Brute-force limit rules
│   │   └── validation.middleware.js # Zod validation binder
│   │
│   ├── modules/                     # Modular business domain folders
│   │   ├── auth/                    # System users & authentication module
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.repository.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validator.js
│   │   │
│   │   └── patients/                # Patient registration & demographic module
│   │       ├── patient.controller.js
│   │       ├── patient.repository.js
│   │       ├── patient.routes.js
│   │       ├── patient.service.js
│   │       └── patient.validator.js
│   │
│   ├── routes/
│   │   └── index.js                 # API routing mountpoint (/api/v1)
│   │
│   ├── app.js                       # Express configurations & middleware bindings
│   └── server.js                    # Process startup & HTTP boot entry point
│
├── tests/                           # Testing suite
│   ├── integration/
│   │   └── patients.api.test.js
│   └── unit/
│       └── auth.service.test.js
│
├── logs/                            # Winston structured JSON logs (Gitkeep)
├── uploads/                         # Temporary file uploads (Gitkeep)
│
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── eslint.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database instance (running locally on port `5432` or in Docker)
- *Optional*: Docker and Docker Compose

### 1. Installation

Clone the codebase and run package installations:
```bash
npm install
```

### 2. Environment Variables

Create a `.env` file by copying the template file:
```bash
cp .env.example .env
```
Fill out the variables, replacing credentials with your local PostgreSQL credentials:
```text
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cmk_caresuite?schema=public
JWT_SECRET=some_extremely_long_unpredictable_key_string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
LOG_LEVEL=debug
```

### 3. Database Migration & client generation

Create PostgreSQL database tables and compile the Prisma client:
```bash
# Generate the client code
npx prisma generate

# Create and apply tables in your database
npx prisma migrate dev --name init
```

### 4. Local Development

Run the server in development mode (with Hot Reloading via nodemon):
```bash
npm run dev
```

The health check endpoint is available at:
`http://localhost:5000/health`

---

## 🐋 Running in Docker

You can run the full environment (Node application + PostgreSQL database) in one step:

```bash
docker-compose up --build
```
This boots:
1. `caresuite_api` listening on port `5000`
2. `caresuite_db` listening on port `5432` (persisting data in the `postgres-data` volume)

---

## 🔒 Security Features

1. **Helmet**: Configures HTTP headers securely to prevent script injections and clickjacking.
2. **CORS**: Restricts domain requests in production using origin whitelists.
3. **Rate Limiting**:
   - `100` requests per 15 minutes for standard routes.
   - `10` attempts per minute for auth requests (login/registration) to prevent brute-force attacks.
4. **Data Sanitization**: Zod validation strips undeclared schema properties, preventing SQL injection payloads.
5. **No Password Exposure**: Password fields are deleted from response objects before serialization.

---

## 🧪 Testing and Linting

Run ESLint rules:
```bash
npm run lint
```

Automatically correct code formatting issues:
```bash
npm run lint:fix
```

Execute automated unit and integration tests (uses Jest with ESM wrappers):
```bash
npm run test
```

---

## 📡 API Endpoints List

### 🔑 Authentication Module

| Method | Endpoint | Description | Payload (Body) | Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | Register system account | `{ name, email, password, role }` | None |
| **POST** | `/api/v1/auth/login` | Login and retrieve token | `{ email, password }` | None |
| **GET** | `/api/v1/auth/me` | Fetch active user profile | None | JWT Token |

*Roles list:* `Admin`, `Doctor`, `Nurse`, `Receptionist`

### 🏥 Patients Module

All patient endpoints require a JWT token: `Authorization: Bearer <token>`

| Method | Endpoint | Description | Required Roles | Payload |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/patients` | Search & list patients (paginated) | `Admin`, `Doctor`, `Nurse`, `Receptionist` | Query params: `search`, `page`, `limit` |
| **POST** | `/api/v1/patients` | Register a new patient | `Admin`, `Receptionist` | Demographic object (Zod validated) |
| **GET** | `/api/v1/patients/:id` | Fetch specific patient record | `Admin`, `Doctor`, `Nurse`, `Receptionist` | None |
| **PUT** | `/api/v1/patients/:id` | Update patient record | `Admin`, `Receptionist` | Partial demographic fields |
| **DELETE** | `/api/v1/patients/:id` | Remove patient record | `Admin` | None |
# cmk-caresuit-server
