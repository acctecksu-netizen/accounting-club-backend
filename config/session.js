// config/session.js
// Configures express-session with MongoDB store for persistent, secure sessions

const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  
  // Don't save session if nothing changed — reduces DB writes
  resave: false,
  
  // Don't create a session until something is stored
  saveUninitialized: false,

  // Store sessions in MongoDB so they survive server restarts
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    // Automatically remove expired sessions from DB
    autoRemove: 'native',
    // Sessions expire after 7 days
    ttl: 7 * 24 * 60 * 60,
  }),

  cookie: {
    // HttpOnly prevents JavaScript from accessing the cookie
    // This blocks XSS attacks from stealing the session
    httpOnly: true,

    // Secure means cookie only sent over HTTPS
    // Set to true in production
    secure: process.env.NODE_ENV === 'production',

    // SameSite=lax protects against most CSRF attacks
    // Use 'strict' for maximum protection (breaks some OAuth flows)
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',

    // Session expires in 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },

  // Change the session cookie name from the default 'connect.sid'
  // to avoid fingerprinting the framework
  name: 'ksu.sid',
};

module.exports = sessionConfig;
