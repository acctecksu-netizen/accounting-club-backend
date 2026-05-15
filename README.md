# نادي المحاسبة — KSU Accounting Club Backend

A production-ready, highly secure Node.js + Express backend for the KSU Accounting Club educational platform.

---

## 📁 Folder Structure

```
accounting-club-backend/
│
├── server.js                  ← App entry point — starts the server
├── package.json               ← Dependencies
├── .env                       ← Your private config (never commit this!)
├── .env.example               ← Template showing what .env needs
├── .gitignore
│
├── config/
│   ├── database.js            ← MongoDB connection setup
│   └── session.js             ← Session cookie configuration
│
├── controllers/               ← Business logic — what happens when a route is hit
│   ├── authController.js      ← signup, login, logout, me
│   ├── courseController.js    ← course/chapter/video CRUD
│   ├── quizController.js      ← quiz CRUD + answer grading
│   └── progressController.js ← track watched videos
│
├── middleware/                ← Code that runs BETWEEN request and controller
│   ├── auth.js                ← requireAuth, requireAdmin checks
│   ├── validate.js            ← Input validation rules
│   ├── rateLimiter.js         ← Brute-force protection
│   └── errorHandler.js        ← Central error catching
│
├── models/                    ← MongoDB schemas (database structure)
│   ├── User.js
│   ├── Course.js
│   ├── Quiz.js
│   └── Progress.js
│
├── routes/                    ← URL routing — maps URLs to controllers
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── quizRoutes.js
│   ├── progressRoutes.js
│   └── adminRoutes.js
│
├── utils/                     ← Helper utilities
│   ├── logger.js              ← Winston logging system
│   ├── apiResponse.js         ← Standardized JSON response helpers
│   ├── fileUpload.js          ← Multer file upload config
│   └── seed.js                ← Database seeder (run once)
│
├── uploads/
│   ├── thumbnails/            ← Course thumbnail images stored here
│   └── pdfs/                  ← Course PDF resources stored here
│
└── logs/                      ← Log files (production only)
    ├── combined.log
    └── errors.log
```

---

## 🚀 Setup Steps (Beginner Friendly)

### Step 1: Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org) (choose LTS version).

Verify installation:
```bash
node --version    # Should show v18 or higher
npm --version     # Should show 9 or higher
```

### Step 2: Install MongoDB

**Option A — Local MongoDB (for development):**
Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

After installing, start it with:
```bash
mongod --dbpath /data/db
```

**Option B — MongoDB Atlas (free cloud, easier):**
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free account
3. Create a free M0 cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string — it looks like:
   `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/accounting_club`

### Step 3: Clone/Copy and Set Up the Project
```bash
# Navigate to the project folder
cd accounting-club-backend

# Install all dependencies
npm install
```

### Step 4: Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Open .env in a text editor and fill in your values:
# - MONGODB_URI: your MongoDB connection string
# - SESSION_SECRET: any long random string (32+ characters)
# - NODE_ENV: development (for now)
```

Generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Seed the Database (creates admin account + sample data)
```bash
npm run seed
```

This creates:
- An admin account (email/password from your .env)
- A sample course with chapters and videos
- A sample quiz

### Step 6: Start the Server
```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

The server starts at: `http://localhost:5000`
Test it: `http://localhost:5000/api/health`

---

## 🔌 How to Connect the Frontend

The frontend (your HTML file) needs to make `fetch()` calls to this backend.

### 1. Get a CSRF Token First
Before any POST/PUT/DELETE request, you must get a CSRF token:

```javascript
// Call this once when the page loads
async function getCsrfToken() {
  const res = await fetch('http://localhost:5000/api/auth/csrf', {
    credentials: 'include'  // IMPORTANT: always include this!
  });
  const data = await res.json();
  return data.data.csrfToken;
}

// Store it globally
let csrfToken = await getCsrfToken();
```

### 2. Always use `credentials: 'include'`
This sends the session cookie with every request — without it, you'll always appear logged out:

```javascript
// ✅ CORRECT
fetch('/api/courses', { credentials: 'include' })

// ❌ WRONG — session cookie won't be sent
fetch('/api/courses')
```

### 3. Set `Content-Type` and `CSRF-Token` headers for POST requests:
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken   // Required for all state-changing requests
  },
  body: JSON.stringify({ email, password })
})
```

---

## 📡 Example API Usage

### Authentication

```javascript
// ── SIGNUP ─────────────────────────────────────────────────────
const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    password: 'SecurePass123'
  })
});
const signupData = await signupResponse.json();
// { success: true, message: 'تم إنشاء الحساب بنجاح', data: { id, name, email, role } }


// ── LOGIN ──────────────────────────────────────────────────────
const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    email: 'ahmed@example.com',
    password: 'SecurePass123'
  })
});
const loginData = await loginResponse.json();
// { success: true, message: 'تم تسجيل الدخول بنجاح', data: { id, name, email, role } }


// ── GET CURRENT USER ────────────────────────────────────────────
const meResponse = await fetch('http://localhost:5000/api/auth/me', {
  credentials: 'include'
});
const me = await meResponse.json();
// { success: true, data: { id, name, email, role } }


// ── LOGOUT ─────────────────────────────────────────────────────
await fetch('http://localhost:5000/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
  headers: { 'CSRF-Token': csrfToken }
});
```

### Courses

```javascript
// ── GET ALL COURSES (with search & pagination) ──────────────────
const coursesRes = await fetch(
  'http://localhost:5000/api/courses?page=1&limit=12&search=محاسبة&category=محاسبة',
  { credentials: 'include' }
);
const courses = await coursesRes.json();
// {
//   success: true,
//   data: [...courses],
//   meta: { total, page, limit, totalPages, hasNext, hasPrev }
// }


// ── GET SINGLE COURSE WITH CHAPTERS ────────────────────────────
const courseRes = await fetch(
  'http://localhost:5000/api/courses/COURSE_ID_HERE',
  { credentials: 'include' }
);
const { data } = await courseRes.json();
// data.course = { title, description, chapters: [{ title, videos: [...] }] }
// data.progress = { watchedVideos: [...], completionPercent }


// ── CREATE COURSE (Admin — with thumbnail upload) ───────────────
const formData = new FormData();
formData.append('title', 'دورة جديدة');
formData.append('description', 'وصف الدورة');
formData.append('category', 'محاسبة');
formData.append('level', 'مبتدئ');
formData.append('isPublished', 'true');
formData.append('thumbnail', fileInput.files[0]);  // optional

const createRes = await fetch('http://localhost:5000/api/courses', {
  method: 'POST',
  credentials: 'include',
  headers: { 'CSRF-Token': csrfToken },
  body: formData  // Don't set Content-Type header — browser sets it with boundary
});


// ── ADD CHAPTER TO COURSE ───────────────────────────────────────
await fetch(`http://localhost:5000/api/courses/COURSE_ID/chapters`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({ title: 'الفصل الأول', order: 0 })
});


// ── ADD VIDEO TO CHAPTER ────────────────────────────────────────
await fetch(`http://localhost:5000/api/courses/COURSE_ID/chapters/CHAPTER_ID/videos`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    title: 'مقدمة في المحاسبة',
    url: 'https://www.youtube.com/embed/VIDEO_ID',
    duration: '12:34'
  })
});
```

### Progress Tracking

```javascript
// ── GET PROGRESS FOR A COURSE ───────────────────────────────────
const progressRes = await fetch(
  'http://localhost:5000/api/progress/COURSE_ID',
  { credentials: 'include' }
);
const progress = await progressRes.json();
// { watchedVideos: ['VIDEO_ID_1', ...], completionPercent: 45 }


// ── MARK VIDEO AS WATCHED ───────────────────────────────────────
await fetch('http://localhost:5000/api/progress/COURSE_ID', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({ videoId: 'VIDEO_ID', action: 'watch' })
});


// ── MARK VIDEO AS UNWATCHED ─────────────────────────────────────
await fetch('http://localhost:5000/api/progress/COURSE_ID', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({ videoId: 'VIDEO_ID', action: 'unwatch' })
});
```

### Quizzes

```javascript
// ── GET ALL QUIZZES ─────────────────────────────────────────────
const quizzesRes = await fetch('http://localhost:5000/api/quizzes', {
  credentials: 'include'
});

// ── SUBMIT QUIZ ANSWERS ─────────────────────────────────────────
// answers is an array where answers[i] is the index of the chosen option for question i
const submitRes = await fetch(`http://localhost:5000/api/quizzes/QUIZ_ID/submit`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    answers: [1, 2, 0]  // [choice for Q1, Q2, Q3...]
  })
});
const result = await submitRes.json();
// { score: 66, correct: 2, total: 3, results: [...] }


// ── CREATE QUIZ (Admin) ─────────────────────────────────────────
await fetch('http://localhost:5000/api/quizzes', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    title: 'اختبار المحاسبة',
    difficulty: 'متوسط',
    timeLimit: 20,
    isPublished: true,
    questions: [
      {
        question: 'ما هو...',
        options: ['أ', 'ب', 'ج', 'د'],
        correctAnswer: 2,
        explanation: 'لأن...'
      }
    ]
  })
});
```

### Admin Dashboard

```javascript
// ── GET DASHBOARD STATS ─────────────────────────────────────────
const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
  credentials: 'include'
});
const stats = await statsRes.json();
// { totalUsers, totalCourses, publishedCourses, totalQuizzes, totalEnrollments, newUsersThisWeek }

// ── GET ALL USERS ───────────────────────────────────────────────
const usersRes = await fetch('http://localhost:5000/api/admin/users?page=1&limit=20', {
  credentials: 'include'
});
```

---

## 🔒 Security Features Explained

| Feature | What it does | Where it's implemented |
|---|---|---|
| **bcrypt (12 rounds)** | Hashes passwords so they can't be read even if DB is stolen | `models/User.js` |
| **HttpOnly cookies** | Prevents JavaScript from reading the session cookie (blocks XSS cookie theft) | `config/session.js` |
| **Secure cookies** | Cookies only sent over HTTPS in production | `config/session.js` |
| **SameSite cookies** | Blocks cross-site request forgery via cookies | `config/session.js` |
| **CSRF tokens** | Double-checks that POST requests come from your own frontend | `routes/*.js` + `csurf` |
| **Session regeneration** | Creates a new session ID after login (prevents session fixation) | `controllers/authController.js` |
| **Account lockout** | Locks account for 30 min after 5 failed logins | `models/User.js` |
| **Rate limiting** | Limits login to 5/15min, signup to 10/hour | `middleware/rateLimiter.js` |
| **Helmet** | Sets 15+ security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) | `server.js` |
| **mongo-sanitize** | Strips `$` and `.` from inputs (blocks NoSQL injection) | `server.js` |
| **xss-clean** | Removes HTML/JS from inputs (blocks stored XSS) | `server.js` |
| **Input validation** | Validates all user inputs with specific rules | `middleware/validate.js` |
| **User enumeration prevention** | Same error message whether email exists or not | `controllers/authController.js` |
| **Body size limit** | Rejects requests over 10KB (blocks payload attacks) | `server.js` |
| **Role-based access** | Admin-only routes protected on the server (not just frontend) | `middleware/auth.js` |
| **Error sanitization** | Never exposes stack traces in production | `middleware/errorHandler.js` |
| **Centralized logging** | All errors and warnings logged with Winston | `utils/logger.js` |

---

## 🚢 Production Checklist

Before going live:

- [ ] Change `SESSION_SECRET` to a long random string
- [ ] Change admin password from the seed defaults
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas (not local MongoDB)
- [ ] Set up HTTPS (use nginx + Let's Encrypt, or deploy to Railway/Render/Heroku)
- [ ] Update `CORS_ORIGIN` to your actual frontend domain
- [ ] Configure MongoDB IP whitelist
- [ ] Set up log monitoring (check `logs/errors.log` regularly)
- [ ] Set `secure: true` in session config (already done when NODE_ENV=production)
