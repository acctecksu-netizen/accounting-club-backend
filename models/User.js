// models/User.js
// User schema with built-in security: password hashing, account lockout, role management

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Enforced at DB level
      lowercase: true, // Always store as lowercase
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // ─── Security ──────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // select: false means password won't be returned in queries by default
      select: false,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // ─── Account Lockout ────────────────────────────────────────
    // Track failed login attempts to lock accounts after too many failures
    loginAttempts: {
      type: Number,
      default: 0,
    },

    // Timestamp until which the account is locked
    lockUntil: {
      type: Date,
      default: null,
    },

    // ─── Timestamps ─────────────────────────────────────────────
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────
// email is already indexed via unique: true
userSchema.index({ lockUntil: 1 }); // Helps with lockout queries

// ─── VIRTUAL PROPERTY ─────────────────────────────────────────────────────────
// Check if the account is currently locked (not stored in DB)
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// ─── PRE-SAVE MIDDLEWARE ───────────────────────────────────────────────────────
// Hash password before saving — NEVER store plain text passwords
userSchema.pre('save', async function (next) {
  // Only hash if password was modified (not on every save)
  if (!this.isModified('password')) return next();

  try {
    // 12 salt rounds = strong protection vs brute force
    // Higher = slower (and more CPU) — 12 is the recommended sweet spot
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── INSTANCE METHODS ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password with the stored hash
 * Returns true if they match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Record a failed login attempt
 * Locks the account after 5 failed attempts for 30 minutes
 */
userSchema.methods.recordFailedLogin = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  this.loginAttempts += 1;

  if (this.loginAttempts >= MAX_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_DURATION);
  }

  await this.save();
};

/**
 * Reset login attempts after a successful login
 */
userSchema.methods.resetLoginAttempts = async function () {
  if (this.loginAttempts > 0 || this.lockUntil) {
    this.loginAttempts = 0;
    this.lockUntil = null;
    this.lastLogin = new Date();
    await this.save();
  } else {
    // Just update lastLogin
    this.lastLogin = new Date();
    await this.save();
  }
};

/**
 * Return safe user data (no password, no sensitive fields)
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
