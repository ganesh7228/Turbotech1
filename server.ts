import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import { getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from 'fs';

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY as string);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin initialization
const configPath = path.resolve(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("[FIREBASE] Config loaded for project:", firebaseConfig.projectId);
  }
} catch (e) {
  console.error("[FIREBASE] Read config error:", e);
}

const projectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
const databaseId = firebaseConfig.firestoreDatabaseId;

// CRITICAL: Set environment variables for Google Cloud libraries
if (projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
}

console.log("[FIREBASE] Expected Project:", projectId, "Expected Database:", databaseId);

let adminApp: any;
try {
  if (getApps().length === 0) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      projectId: projectId || "gen-lang-client-0122634248"
    });

    console.log("[FIREBASE] Admin App initialized with Service Account");
  } else {
    adminApp = getApps()[0];
  }
} catch (e) {
  console.error("[FIREBASE] Admin App initialization error:", e);
  adminApp = getApps()[0];
}

let db: any;
let signBlobAvailable = true;

const initFirestore = async () => {
  const dbName = databaseId && databaseId !== "(default)" ? databaseId : undefined;
  
  try {
    // Try with the provided databaseId first
    console.log("[FIREBASE] Trying Firestore with database:", dbName || "(default)");
    const tempDb = getFirestore(adminApp, dbName);
    
    // Quick test write
    await tempDb.collection("test").doc("connection").set({ 
      lastSeen: new Date().toISOString(),
      status: "active",
      database: dbName || "(default)"
    });
    
    db = tempDb;
    console.log("[FIREBASE] SUCCESS: Firestore connected to:", dbName || "(default)");
  } catch (err: any) {
    console.warn("[FIREBASE] FAILED to connect to named database:", err.message);
    
    try {
      // Fallback to default database
      console.log("[FIREBASE] Falling back to default database...");
      const defaultDb = getFirestore(adminApp);
      await defaultDb.collection("test").doc("connection").set({ 
        lastSeen: new Date().toISOString(),
        status: "fallback-active",
        database: "default"
      });
      db = defaultDb;
      console.log("[FIREBASE] SUCCESS: Firestore connected to default database");
    } catch (err2: any) {
      console.error("[FIREBASE] CRITICAL: All Firestore connection attempts failed:", err2.message);
      // Still set db to something so the app doesn't crash on boot, but operations will fail
      db = getFirestore(adminApp, dbName);
    }
  }
};

// Initialize Firestore asynchronously
initFirestore();


const authAdmin = getAuth(adminApp);
const JWT_SECRET = process.env.JWT_SECRET || "nanjangud-service-pro-secret-123";

const app = express();

// CORS configuration - Allow requests from frontend domains
const allowedOrigins = [
  'https://turbotech1.vercel.app', // Your actual Vercel domain
  'https://turbo-tech-six.vercel.app',
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',  // Alt dev
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

// Add any additional origins from environment variable
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...envOrigins);
  console.log('[CORS] Added origins from env:', envOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

app.use(express.json());
app.use(cookieParser());

const ADMIN_NUMBER = "9449989467";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "123456"; // Use placeholder as per instructions if not set
const CHAT_ID = process.env.CHAT_ID || "123456";

// API Routes
const otpStore = new Map<string, { code: string, expiresAt: Date }>();

// Helper to normalize phone numbers
const normalizePhone = (phone: string) => {
  if (!phone) return "";
  // Keep only digits
  return phone.replace(/\D/g, "").slice(-10);
};

app.post("/api/send-otp", async (req, res) => {
  const { phone: rawPhone } = req.body;
  const phone = normalizePhone(rawPhone);
  
  console.log(`[AUTH] Sending OTP to ${phone} (raw: ${rawPhone})`);
  if (!phone) return res.status(400).json({ error: "Phone number is required (10 digits)" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    // Attempting to write OTP to Firestore
    try {
      await db.collection("otps").doc(phone).set({
        phone,
        code: otp,
        expiresAt: expiresAt.toISOString(),
      });
      console.log(`[AUTH] OTP ${otp} saved to Firestore for ${phone}`);
    } catch (fsError) {
      console.error("[AUTH] Firestore OTP save failed, using local memory fallback:", fsError);
      // Fallback for current session
      otpStore.set(phone, { code: otp, expiresAt });
    }

    const message = encodeURIComponent(`OTP:${otp} PHONE:${phone}`);
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`;
    
    console.log(`[TELEGRAM] Calling: ${telegramUrl.replace(TELEGRAM_TOKEN, '***')}`);
    const tgRes = await axios.get(telegramUrl);
    console.log("[TELEGRAM] Response:", tgRes.status);

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("[AUTH] Error sending OTP:", error);
    res.status(500).json({ 
      error: "Failed to send OTP", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { phone: rawPhone, code } = req.body;
  const phone = normalizePhone(rawPhone);
  
  console.log(`[AUTH] Verifying OTP for ${phone} (raw: ${rawPhone}), code: ${code}`);
  if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

  try {
    let otpData: any = null;
    
    // Check Firestore first
    try {
      const otpDoc = await db.collection("otps").doc(phone).get();
      if (otpDoc.exists) {
        otpData = otpDoc.data();
      }
    } catch (e) {
      console.warn("[AUTH] Firestore OTP lookup failed, checking local store");
    }

    // Check local fallback
    if (!otpData) {
      const local = otpStore.get(phone);
      if (local) {
        otpData = { code: local.code, expiresAt: local.expiresAt.toISOString() };
      }
    }

    if (!otpData) {
      console.warn(`[AUTH] OTP not found for ${phone}`);
      return res.status(400).json({ error: "OTP not found. Please resend." });
    }

    if (otpData.code !== code) {
      console.warn(`[AUTH] Invalid OTP for ${phone}: expected ${otpData.code}, got ${code}`);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      console.warn(`[AUTH] Expired OTP for ${phone}`);
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Clean up
    try {
      await db.collection("otps").doc(phone).delete();
      otpStore.delete(phone);
    } catch (e) {
      otpStore.delete(phone);
    }

    // User lookup/creation
    let userData;
    let isNewUser = false;
    try {
      let userDoc = await db.collection("users").where("phone", "==", phone).get();
      if (userDoc.empty) {
        isNewUser = true;
        const newUser = {
          phone,
          role: phone === ADMIN_NUMBER ? "admin" : "customer",
          createdAt: new Date().toISOString(),
        };
        const resDoc = await db.collection("users").add(newUser);
        userData = { id: resDoc.id, ...newUser };
        
        if (phone === ADMIN_NUMBER) {
          try {
            await db.collection("admins").doc(resDoc.id).set({ phone });
          } catch (admErr) { console.error("Admin record creation failed:", admErr); }
        }
      } else {
        const doc = userDoc.docs[0];
        userData = { id: doc.id, ...doc.data() };
        if (!userData.name) isNewUser = true;
      }
    } catch (userError) {
      console.error("[AUTH] Firestore user lookup/creation failed:", userError);
      userData = { 
        id: "temp-" + phone, 
        phone, 
        role: phone === ADMIN_NUMBER ? "admin" : "customer",
        isTemporary: true 
      };
    }

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "7d" });
    
    // Generate Firebase Custom Token
    let firebaseToken = "";
    if (signBlobAvailable) {
      try {
        // Add custom claims for easier rule checks
        firebaseToken = await authAdmin.createCustomToken(userData.id, { 
          phone: phone,
          role: userData.role 
        });
        console.log(`[AUTH] Custom token created for ${phone}`);
      } catch (err: any) {
        if (err.message && err.message.includes('signBlob')) {
          console.warn("[AUTH] signBlob permission missing, disabling custom tokens for this session");
          signBlobAvailable = false;
        } else {
          console.warn("[AUTH] Custom token creation failed:", err.message);
        }
      }
    }

    res.cookie("session", token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });
    
    console.log(`[AUTH] Success for ${phone}, isNewUser: ${isNewUser}`);
    res.json({ success: true, user: userData, firebaseToken, isNewUser });
  } catch (error) {
    console.error("[AUTH] Fatal error in verify-otp:", error);
    res.status(500).json({ 
      error: "Verification failed due to a server error", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/api/update-profile", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    await db.collection("users").doc(decoded.id).update({ name });
    
    const updatedUser = { ...decoded, name };
    const newToken = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("session", newToken, { 
      httpOnly: true, 
      secure: true, 
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true, user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ success: true });
});

app.get("/api/me", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    // Also provide a fresh firebase token for frontend sync
    let firebaseToken = "";
    if (signBlobAvailable) {
      try {
        firebaseToken = await authAdmin.createCustomToken(decoded.id, {
          phone: decoded.phone,
          role: decoded.role
        });
      } catch (err: any) {
        if (err.message && err.message.includes('signBlob')) {
          signBlobAvailable = false;
        } else {
          console.error("Error creating custom token in /api/me:", err.message);
        }
      }
    }

    res.json({ user: decoded, firebaseToken });
  } catch (e) {
    res.status(401).json({ error: "Invalid session" });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const testDoc = await db.collection("test").doc("connection").get();
    res.json({ 
      status: "ok", 
      firestore: "connected", 
      exists: testDoc.exists,
      data: testDoc.exists ? testDoc.data() : null,
      projectId,
      databaseId
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error", 
      firestore: "disconnected", 
      error: error instanceof Error ? error.message : String(error),
      projectId,
      databaseId
    });
  }
});

// Server-side fallback for bookings (in case custom tokens/signBlob fail)
app.post("/api/bookings", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const bookingData = {
      ...req.body,
      customerId: decoded.id, // Force correct customer ID
      phone: decoded.phone || normalizePhone(req.body.phone), // Ensure phone is set from token if possible
      updatedAt: new Date().toISOString(),
      createdAt: req.body.createdAt || new Date().toISOString(),
    };

    console.log(`[BOOKING] Attempting creation for user ${decoded.phone} via Admin API (DB: ${db.databaseId || 'default'})...`);
    const docRef = await db.collection("bookings").add(bookingData);
    console.log(`[BOOKING] Success: ${docRef.id}`);
    res.json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error(`[BOOKING] Error creating booking via API for ${normalizePhone(req.body.phone)}:`, error);
    const isPermissionError = error.message && (error.message.includes("permission") || error.message.includes("7"));
    const details = isPermissionError 
      ? `Server lacks sufficient Firestore permissions. Tried DB: ${db.databaseId || 'default'}. Project: ${projectId}.` 
      : error.message;
    res.status(500).json({ error: "Failed to create booking", details });
  }
});

app.get("/api/bookings", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    let query = db.collection("bookings").where("phone", "==", decoded.phone);
    
    // Admin can see everything if they don't have a phone filter, but here we prioritize user's own
    if (decoded.role === 'admin' && req.query.all === 'true') {
      query = db.collection("bookings");
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const bookings = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings via API:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get("/api/bookings/:id", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const doc = await db.collection("bookings").doc(req.params.id).get();
    
    if (!doc.exists) return res.status(404).json({ error: "Booking not found" });
    
    const data = doc.data();
    // Simple security check: owner (by ID or phone) or admin
    if (data.customerId !== decoded.id && data.phone !== decoded.phone && decoded.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({ id: doc.id, ...data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

app.patch("/api/bookings/:id", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const docRef = db.collection("bookings").doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: "Booking not found" });
    
    const data = doc.data();
    if (data.customerId !== decoded.id && data.phone !== decoded.phone && decoded.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await docRef.update({
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating booking via API:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
