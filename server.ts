import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin initialization
import fs from 'fs';
const configPath = path.resolve(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("[FIREBASE] Config loaded. Proj:", firebaseConfig.projectId, "DB:", firebaseConfig.firestoreDatabaseId);
  }
} catch (e) {
  console.error("[FIREBASE] Read config error:", e);
}

const configProjectId = firebaseConfig.projectId;
const databaseId = firebaseConfig.firestoreDatabaseId;
const envProjId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;

logger.info(`Environment Check - Env Proj: ${envProjId}, Config Proj: ${configProjectId}`);

let adminApp: any;
try {
  if (getApps().length === 0) {
    // Pure ambient initialization - best for Cloud Run/AI Studio if identity is injected
    adminApp = initializeApp();
    logger.info(`Admin App initialized (Pure Ambient). Project: ${adminApp.options.projectId || 'inferred'}`);
  } else {
    adminApp = getApps()[0];
  }
} catch (e: any) {
  logger.warn(`Pure ambient init failed: ${e.message}. Trying with config.`);
  try {
     adminApp = initializeApp({
       credential: applicationDefault(),
       projectId: configProjectId || envProjId
     }, "fallback-admin");
  } catch (e2: any) {
     logger.error(`ALL admin app initializations failed: ${e2.message}`);
     adminApp = getApps()[0];
  }
}

const effectiveProjectId = adminApp?.options?.projectId || envProjId || "unknown";
const projectId = effectiveProjectId; 

let db: Firestore;
let signBlobAvailable = true;

const initFirestore = async () => {
  const dbName = databaseId && databaseId !== "(default)" ? databaseId : undefined;
  
  // Set default immediately
  db = getFirestore(adminApp, dbName);
  (global as any).effectiveProjectId = adminApp.options.projectId || envProjId;
  (global as any).effectiveDatabaseId = dbName || '(default)';
  (global as any).authAdmin = getAuth(adminApp);

  const strategies = [
    { name: "Config (Explicit)", proj: configProjectId, db: dbName },
    { name: "Ambient (Current)", app: adminApp, db: dbName },
    { name: "Default (Fallback)", app: undefined, proj: undefined, db: undefined },
  ];

  for (const strategy of strategies) {
    try {
      let appToUse = (strategy as any).app;
      if (!appToUse) {
        const appName = `strategy-${strategy.name.toLowerCase().replace(/[^a-z]/g, '-')}`;
        const existing = getApps().find(a => a.name === appName);
        if (existing) {
          appToUse = existing;
        } else {
          appToUse = initializeApp({
            credential: applicationDefault(),
            projectId: strategy.proj
          }, appName);
        }
      }
      
      const tempDb = getFirestore(appToUse, strategy.db);
      
      // Test write with 2s timeout
      const testPromise = tempDb.collection("test").doc("connection").set({ 
        lastSeen: new Date().toISOString(),
        strategy: strategy.name,
        projectId: appToUse.options.projectId || 'ambient',
        databaseId: strategy.db || '(default)'
      }, { merge: true });

      await Promise.race([testPromise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))]);
      
      db = tempDb;
      (global as any).effectiveProjectId = appToUse.options.projectId;
      (global as any).effectiveDatabaseId = strategy.db || '(default)';
      (global as any).authAdmin = getAuth(appToUse);
      
      logger.info(`Firestore connected via ${strategy.name}`);
      return;
    } catch (err: any) {
      logger.warn(`Strategy ${strategy.name} failed: ${err.message}`);
    }
  }
};


const getAuthAdmin = () => (global as any).authAdmin || getAuth(adminApp);
const JWT_SECRET = process.env.JWT_SECRET || "nanjangud-service-pro-secret-123";

const app = express();
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

const logs: string[] = [];
const logger = {
  info: (...args: any[]) => {
    const msg = `[INFO] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.log(msg);
    logs.push(`${new Date().toISOString()} ${msg}`);
    if (logs.length > 100) logs.shift();
  },
  warn: (...args: any[]) => {
    const msg = `[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.warn(msg);
    logs.push(`${new Date().toISOString()} ${msg}`);
    if (logs.length > 100) logs.shift();
  },
  error: (...args: any[]) => {
    const msg = `[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.error(msg);
    logs.push(`${new Date().toISOString()} ${msg}`);
    if (logs.length > 100) logs.shift();
  }
};

app.get("/api/logs", (req, res) => {
  res.json(logs);
});

app.get("/api/server-info", (req, res) => {
  res.json({
    status: "ok",
    firestore: {
      projectId: (global as any).effectiveProjectId || configProjectId || process.env.GOOGLE_CLOUD_PROJECT,
      databaseId: db?.databaseId || (global as any).effectiveDatabaseId || 'unknown',
      env: {
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        GCP_PROJECT: process.env.GCP_PROJECT
      }
    }
  });
});

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
        firebaseToken = await getAuthAdmin().createCustomToken(userData.id, { 
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
        firebaseToken = await getAuthAdmin().createCustomToken(decoded.id, {
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

  const currentProjectId = (global as any).effectiveProjectId || configProjectId || process.env.GOOGLE_CLOUD_PROJECT;
  const currentDbId = db?.databaseId || (global as any).effectiveDatabaseId || 'unknown';

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const bookingData = {
      ...req.body,
      customerId: decoded.id, 
      phone: decoded.phone || normalizePhone(req.body.phone), 
      updatedAt: new Date().toISOString(),
      createdAt: req.body.createdAt || new Date().toISOString(),
    };

    logger.info(`Creating booking for ${decoded.phone} (Proj: ${currentProjectId}, DB: ${currentDbId})`);
    const docRef = await db.collection("bookings").add(bookingData);
    logger.info(`Booking success: ${docRef.id}`);
    res.json({ success: true, id: docRef.id });
  } catch (error: any) {
    logger.error(`Booking error for ${req.body.phone}: ${error.message}`);
    res.status(500).json({ 
      error: "Failed to create booking", 
      details: error.message,
      projectId: currentProjectId,
      databaseId: currentDbId
    });
  }
});

app.get("/api/bookings", async (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      let query = db.collection("bookings");
      
      if (decoded.role === 'customer') {
        query = query.where("customerId", "==", decoded.id);
      } else if (decoded.role === 'technician') {
        query = query.where("technicianId", "==", decoded.id);
      } else if (decoded.role === 'admin' && req.query.all !== 'true') {
        // Admin default view could be everything or filtered
        if (decoded.phone) {
           query = query.where("phone", "==", decoded.phone);
        }
      }

      const snapshot = await query.orderBy("createdAt", "desc").get();
      const bookings = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      res.json(bookings);
    } catch (error: any) {
      console.error("Error fetching bookings via API:", error);
      res.status(500).json({ 
        error: "Failed to fetch bookings", 
        details: error.message,
        projectId: effectiveProjectId,
        databaseId: db?.databaseId || 'unknown'
      });
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
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch booking", 
      details: error.message 
    });
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
  } catch (error: any) {
    console.error("Error updating booking via API:", error);
    res.status(500).json({ 
      error: "Failed to update booking", 
      details: error.message 
    });
  }
});

const PORT = 3000;

// Chat Bot API
app.post("/api/chat", express.json(), async (req, res) => {
  const { message, phone, name, history } = req.body;
  const botToken = process.env.TELEGRAM_TOKEN;
  const adminChatId = process.env.CHAT_ID;

  if (!botToken || !adminChatId) {
    return res.status(500).json({ error: "Chatbot not configured" });
  }

  try {
    const text = `🤖 *New Chat Message*\n👤 *User:* ${name || 'Unknown'}\n📞 *Phone:* ${phone}\n💬 *Message:* ${message}`;
    
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'Markdown'
      })
    });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to send message" });
  }
});

async function startServer() {
  initFirestore().catch(e => logger.error("Background Firestore init error:", e));
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
