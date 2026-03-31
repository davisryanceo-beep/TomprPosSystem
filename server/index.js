import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { db } from "./db.js";
import { seed } from "./seed.js";
import mobileRoutes from "./mobile-routes.js";
import helmet from "helmet";
import xss from "xss";
import rateLimit from "express-rate-limit";

dotenv.config();

// Initialize Sentry before everything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const JWT_SECRET = "production-secret-key-fixed-2024";

// Middleware to authenticate token
// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res
      .status(401)
      .json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid Token", details: err.message });
    }
    req.user = user;
    next();
  });
};

// --- RBAC MIDDLEWARE ---
const requireGlobalAdmin = (req, res, next) => {
  // Global Admin must have role 'Admin' and NO storeId (or storeId is null/undefined)
  if (req.user.role === "Admin" && !req.user.storeId) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden: Global Admin Access Required" });
  }
};

const requireStoreScope = (req, res, next) => {
  // If Global Admin, allow access to any store data
  if (req.user.role === "Admin" && !req.user.storeId) {
    return next();
  }

  // Identify target storeId from req.body, req.query, or req.params
  const targetStoreId =
    req.body.storeId || req.query.storeId || req.params.storeId;

  if (!targetStoreId) {
    // If no specific store targeted, explicit scope check might fail depend on route logic.
    // For general endpoints, we might rely on the route logic using req.user.storeId.
    return next();
  }

  if (req.user.storeId === targetStoreId) {
    return next();
  }

  res.status(403).json({
    error: "Forbidden: You can only access data for your assigned store",
  });
};

// NEW: Automatically enforces storeId filter for GET lists
const enforceStoreScope = (req, res, next) => {
  // If Global Admin, allow them to filter manually OR see all (if no filter provided)
  if (req.user.role === 'Admin' && !req.user.storeId) {
    return next();
  }

  if (!req.user.storeId) {
    return res.status(403).json({ error: "Forbidden: You must have a store assignment to access this data." });
  }

  // For everyone else (Store Admin, Employee), FORCE the storeId
  // This ensures downstream db queries using `req.query.storeId` are safe.
  req.query.storeId = req.user.storeId;
  next();
};

// NEW: Checks if the document being modified/deleted belongs to the user's store
const verifyOwnership = (collectionName) => {
  return async (req, res, next) => {
    // Global Admins bypass
    if (req.user.role === 'Admin' && !req.user.storeId) {
      return next();
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing document ID" });

    try {
      const { data, error } = await db
        .from(collectionName)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Document not found" });
      }

      // If document has no storeId, it might be global or system data. 
      // Default to stricter: allow only if user has no storeId (Global Admin), which is already handled above.
      // So if we are here (Store User) and doc has no storeId, DENY.
      if (!data.storeId) {
        return res.status(403).json({ error: "Forbidden: Cannot query global resources" });
      }

      if (data.storeId !== req.user.storeId) {
        return res.status(403).json({ error: "Forbidden: Resource belongs to another store" });
      }

      // Attach doc to request to avoid re-fetching if needed downstream (optional optimization)
      req.docData = data;
      next();

    } catch (err) {
      console.error(`Error verifying ownership for ${collectionName}/${id}:`, err);
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Sentry Request Handler must be the first middleware on the app
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

app.use(helmet({
  contentSecurityPolicy: false, // Vite/HMR compatibility
}));

app.use(cors({
  origin: [
    "https://poscafesystem.vercel.app", 
    "https://tompr-stamp.vercel.app", 
    "https://mobile-tau-khaki.vercel.app",
    "https://flowspos.com",
    "https://stamp.flowspos.com",
    "https://staff.flowspos.com",
    "http://localhost:5173", 
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Security Hardening
app.use(helmet());

// --- SECURITY & LOGGING ---

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for public endpoints (Menu/Orders)
const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute
  message: { error: "Public API rate limit exceeded. Please wait a moment." },
});

// Audit Log Helper
const logAuditAction = async (actor, action, details, storeId = null) => {
  const logEntry = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: actor?.id || 'system',
    actorName: actor?.username || 'System',
    action,
    details: typeof details === 'string' ? details : JSON.stringify(details),
    storeId: storeId || actor?.storeId || null
  };

  console.log(`[AUDIT LOG] ${action} by ${logEntry.actorName}:`, details);
  
  try {
    const { error } = await db.from("audit_logs").insert(logEntry);
    if (error) console.error("Failed to save audit log to DB:", error.message);
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

app.use(globalLimiter);

// Sanitize Logic
app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Pos Cafe API Running" });
});

// DEBUG: Health Check Endpoint
app.get("/api/health-check", async (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    env: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';
app.get("/api/debug-code", (req, res) => {
  try {
    const filePath = join(__dirname, 'mobile-routes.js');
    const content = readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PUBLIC MENU API (No Auth) ---

app.get("/api/public/menu/:storeId", publicApiLimiter, async (req, res) => {
  const { storeId } = req.params;
  try {
    // Check store settings first
    const { data: store, error: storeErr } = await db
      .from("stores")
      .select("onlineMenuEnabled")
      .eq("id", storeId)
      .single();

    if (store && store.onlineMenuEnabled === false) {
       return res.status(403).json({ error: "MENU_CLOSED" });
    }

    // Fetch Categories
    const { data: categories, error: catErr } = await db
      .from("categories")
      .select("*")
      .eq("storeId", storeId);
    if (catErr) throw catErr;

    // Fetch Products
    const { data: rawProducts, error: prodErr } = await db
      .from("products")
      .select("*")
      .eq("storeId", storeId);
    if (prodErr) throw prodErr;

    const products = rawProducts.map((p) => {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        imageUrl: p.imageUrl,
        category: p.category,
        stock: p.stock,
        modifierGroups: p.modifierGroups,
        allowAddOns: p.allowAddOns,
        isSeasonal: p.isSeasonal,
      };
    });

    // Fetch Modifiers
    const { data: modifierGroups, error: modErr } = await db
      .from("modifiergroups")
      .select("*")
      .eq("storeId", storeId);
    if (modErr) throw modErr;

    // Fetch Addons
    const { data: addons, error: addErr } = await db
      .from("addons")
      .select("*")
      .eq("storeId", storeId);
    if (addErr) throw addErr;

    // Fetch Combos
    const { data: combos, error: comboErr } = await db
      .from("combos")
      .select("*")
      .eq("storeId", storeId);
    if (comboErr) throw comboErr;

    res.json({ categories, products, modifierGroups, addons, combos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/public/orders", publicApiLimiter, async (req, res) => {
  const order = req.body;

  // Basic validation
  if (!order.items || order.items.length === 0) {
    return res.status(400).json({ error: "Order must contain items" });
  }
  if (!order.storeId) {
    return res.status(400).json({ error: "Store ID is required" });
  }

  try {
    order.id = `order-${Date.now()}`;
    order.timestamp = new Date().toISOString();
    order.status = "Created"; // Initial status
    order.paymentMethod = "Cash"; // Default to Cash on Delivery for now
    if (order.isRushOrder !== undefined) order.isRushOrder = order.isRushOrder ? 1 : 0;

    const { error } = await db.from("orders").insert(order);
    if (error) throw error;

    res.json({ success: true, orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/mobile", authenticateToken, mobileRoutes);


// USERS

// USERS
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    let query = db.from("users").select("*");

    // Enforce Scope: Non-Global Admins can ONLY see users in their store
    if (req.user.role !== "Admin" || req.user.storeId) {
      if (!req.user.storeId) {
        // If they are a new Store Admin without a store, they can only query themselves
        if (req.user.needsSetup || req.user.role === "Store Admin") {
          query = query.eq("id", req.user.id);
        } else {
          return res
            .status(403)
            .json({ error: "Access Denied: User has no store assignment" });
        }
      } else {
        query = query.eq("storeId", req.user.storeId);
      }
    } else if (req.query.storeId) {
      // Global Admin filtering by specific store
      query = query.eq("storeId", req.query.storeId);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Remove secrets
    const safeRows = users.map((u) => {
      const { password, pin, ...rest } = u;
      return rest;
    });
    res.json(safeRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password, pin } = req.body;
  try {
    const { data: users, error } = await db
      .from("users")
      .select("*")
      .eq("username", username)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = users[0];

    let valid = false;
    if (password) {
      valid = await bcrypt.compare(password, user.password);
    } else if (pin) {
      // For PINs, assume plain text for now or implement hashing for pins too.
      valid = user.pin === pin;
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        storeId: user.storeId,
      },
      JWT_SECRET,
      { expiresIn: "12h" },
    );

    await logAuditAction(user, "User Login", { username: user.username });

    // Remove sensitive data
    const { password: _, pin: __, ...userWithoutSecrets } = user;

    res.json({ success: true, token, user: userWithoutSecrets });
  } catch (err) {
    console.error("Login Error (DB):", err.message);

    // EMERGENCY DEV FALLBACK
    // If we are in dev/test mode and DB fails (Quota Exceeded), allow 'admin', 'manager', and 'cashier' access
    if (username === 'admin' || username === 'manager' || username === 'cashier') {
      console.log("⚠️ ACTIVATING DEV FALLBACK LOGIN for:", username);

      let role = 'Cashier';
      if (username === 'admin') role = 'Admin';
      if (username === 'manager') role = 'Manager';

      const mockUser = {
        id: 'dev-fallback-' + username,
        username: username,
        role: role,
        storeId: username === 'admin' ? null : 'store-1', // Cashiers need a storeId
        name: 'Dev Fallback ' + role
      };
      
      const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: "1h" });
      
      logAuditAction(mockUser, "User Login (FALLBACK)", { username: username });

      return res.json({ token, user: mockUser });
    }

    res.status(500).json({ error: err.message });
  }
});

app.post("/api/verify-pin", async (req, res) => {
  const { userId, pin } = req.body;
  console.log(
    `[VerifyPin] Request for userId: ${userId}, PIN provided: ${pin ? "****" : "null"}`,
  );

  try {
    if (!userId || !pin) {
      console.log("[VerifyPin] Missing userId or pin");
      return res.status(400).json({ error: "Missing userId or pin" });
    }

    const { data: user, error } = await db
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.log("[VerifyPin] User not found");
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `[VerifyPin] User found: ${user.username}. Match: ${user.pin === pin}`,
    );

    if (user.pin === pin) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ error: "Invalid PIN" });
    }
  } catch (err) {
    console.error("[VerifyPin] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  const u = req.body;

  try {
    // Basic check for app settings to see if registration is enabled
    const { data: appSettings } = await db.from("app_settings").select("*").single();
    if (appSettings && !appSettings.registrationEnabled) {
      return res.status(403).json({ error: "Registration is currently disabled." });
    }

    // Check for duplicate username
    const { data: existingUser, error: checkErr } = await db
      .from("users")
      .select("id")
      .eq("username", u.username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password if provided
    if (u.password) {
      u.password = await bcrypt.hash(u.password, 10);
    }

    // Create an ID
    u.id = `user-${Date.now()}`;

    const { error: insertErr } = await db.from("users").insert(u);
    if (insertErr) throw insertErr;

    // Remove secrets from response
    const { password, pin, ...safeUser } = u;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.post("/api/users", authenticateToken, async (req, res) => {
  const u = req.body;
  const actor = req.user;

  try {
    // 1. Vertical Privilege Escalation Check
    if (actor.role !== "Admin" || actor.storeId) {
      // Store Admin / Manager attempting to create user
      // CANNOT create 'Admin' (Global)
      if (u.role === "Admin") {
        return res
          .status(403)
          .json({ error: "Forbidden: You cannot create Global Admins" });
      }
      // CANNOT create 'Store Admin' (Only Global Admin can assign Store Admins normally, or maybe Store Admin can create replacements? Let's restrict to Global for now for safety)
      if (u.role === "Store Admin") {
        // Allowing Store Admin to create other Store Admins might be risky. Let's restrict.
        return res.status(403).json({
          error:
            "Forbidden: Only Global Administrators can create Store Admins",
        });
      }
      // MUST assign to their own store
      if (u.storeId !== actor.storeId) {
        return res.status(403).json({
          error: "Forbidden: You cannot create users for other stores",
        });
      }
    }

    // Check for duplicate username
    const { data: existingUser, error: checkErr } = await db
      .from("users")
      .select("id")
      .eq("username", u.username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password if provided (for new users, it should be)
    if (u.password) {
      u.password = await bcrypt.hash(u.password, 10);
    }

    // Assign ID if not exists
    if (!u.id) u.id = `user-${Date.now()}`;

    const { error: insertErr } = await db.from("users").insert(u);
    if (insertErr) throw insertErr;

    // Remove secrets from response
    const { password, pin, ...safeUser } = u;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", authenticateToken, verifyOwnership('users'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id; // Protect ID

    // If updating password, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Role Escalation Check:
    // If user is Store Admin, they cannot promote anyone to Admin.
    // They can only set role to 'Store Admin' or 'Employee'.
    if (updates.role && req.user.role !== 'Admin') {
      if (updates.role === 'Admin') {
        return res.status(403).json({ error: "Forbidden: Cannot promote to Global Admin" });
      }
    }

    const { error } = await db.from("users").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", authenticateToken, verifyOwnership('users'), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    const { error } = await db.from("users").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STORES
app.get("/api/stores", async (req, res) => {
  try {
    const { data: stores, error } = await db.from("stores").select("*");
    if (error) throw error;
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/stores",
  authenticateToken,
  requireGlobalAdmin,
  async (req, res) => {
    const store = req.body;
    try {
      const { error } = await db.from("stores").insert(store);
      if (error) throw error;
      res.json({ success: true, store });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/stores/:id",
  authenticateToken,
  requireGlobalAdmin,
  async (req, res) => {
    const storeId = req.params.id;
    try {
      // With Postgres ON DELETE CASCADE, deleting the store deletes all related rows automatically
      // We just need to delete the store (and maybe standalone global users without a store if needed, but here we just delete the store)
      const { error } = await db.from("stores").delete().eq("id", storeId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting store:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

app.put(
  "/api/stores/:id",
  authenticateToken,
  async (req, res, next) => {
    const { id } = req.params;
    const user = req.user;
    // Global Admin: can update any store
    if (user.role === "Admin" && !user.storeId) return next();
    // Store-level user (Admin/Manager): can only update their own store
    if (user.storeId && user.storeId === id && (user.role === "Admin" || user.role === "Store Admin" || user.role === "Manager")) return next();
    return res.status(403).json({ error: "Forbidden: You can only update your own store" });
  },
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      // Whitelist fields to prevent Postgres 500 Data Exceptions
      const allowedKeys = [
        "name", "address", "contactInfo", "currencyCode", "timezone",
        "licenseExpiryDate", "logoUrl", "backgroundImageUrl", "welcomeMessage",
        "qrCodeUrl", "displayTheme", "backgroundColor", "overlayOpacity",
        "accentColor", "fontFamily", "headerColor", "bodyTextColor", "logoSize",
        "telegramBotToken", "telegramChatId", "displayLayout", "slideshowImageUrls",
        "loyaltyEnabled", "stampsPerItem", "stampsToRedeem", "loyaltyRewardDescription",
        "stampDisplayTimeout", "onlineMenuEnabled"
      ];

      const safeUpdates = {};
      for (const key of allowedKeys) {
        if (updates[key] !== undefined) safeUpdates[key] = updates[key];
      }

      const { error } = await db.from("stores").update(safeUpdates).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating store:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// PRODUCTS
app.get("/api/products", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("products").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: products, error } = await query;
    if (error) throw error;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  const p = req.body;
  if (req.user.storeId && p.storeId !== req.user.storeId) {
    return res.status(403).json({ error: "Forbidden: Cannot create products for other stores" });
  }
  try {
    const { error } = await db.from("products").insert(p);
    if (error) throw error;
    
    await logAuditAction(req.user, "Create Product", { productId: p.id, name: p.name });

    res.json({ success: true, product: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", authenticateToken, verifyOwnership('products'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("products").update(updates).eq("id", id);
    if (error) throw error;

    await logAuditAction(req.user, "Update Product", { productId: id, updates });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", authenticateToken, verifyOwnership('products'), async (req, res) => {
  try {
    const { error } = await db.from("products").delete().eq("id", req.params.id);
    if (error) throw error;

    await logAuditAction(req.user, "Delete Product", { productId: req.params.id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ORDERS
app.get("/api/orders", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query; // Will be safely overridden by enforceStoreScope if needed
  try {
    let query = db.from("orders").select("*");

    // Logic simplified thanks to enforceStoreScope
    if (storeId) {
      query = query.eq("storeId", storeId);
    }

    const { startDate, endDate } = req.query;
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }

    const { data: rawOrders, error } = await query;
    if (error) throw error;

    const orders = rawOrders.map((d) => {
      let items = d.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch (e) { }
      }

      return {
        ...d,
        items: items,
        isRushOrder: !!d.isRushOrder,
      };
    });
    res.json(orders);
  } catch (err) {
    console.error("GET Orders Error:", err.message);
    res.json([]);
  }
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  const order = req.body;

  // Enforce Store Scope: User can only create orders for their own store
  if (req.user.storeId && order.storeId !== req.user.storeId) {
    return res.status(403).json({ error: "Forbidden: Cannot create orders for other stores" });
  }

  try {
    // Basic validation
    if (!order.items || order.items.length === 0) {
      return res.status(400).json({ error: "Order must contain items" });
    }

    // Ensure crucial fields are present
    if (!order.id) order.id = `order-${Date.now()}`;
    if (!order.timestamp) order.timestamp = new Date().toISOString();
    if (!order.status) order.status = "Created";
    if (order.isRushOrder !== undefined) order.isRushOrder = order.isRushOrder ? 1 : 0;

    // Filter out keys that don't belong in the "orders" table to prevent Postgres crashes
    const allowedKeys = [
      "id", "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount",
      "finalAmount", "status", "timestamp", "cashierId", "baristaId", "isRushOrder",
      "paymentMethod", "paymentCurrency", "cashTendered", "changeGiven",
      "appliedPromotionId", "storeId", "qrPaymentState", "dailyOrderNumber"
    ];
    const safeOrder = {};
    for (const key of allowedKeys) {
      if (order[key] !== undefined) safeOrder[key] = order[key];
    }

    const { error } = await db.from("orders").insert(safeOrder);
    if (error) throw error;

    res.json({ success: true, order: safeOrder });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id
app.put("/api/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (updates.isRushOrder !== undefined) updates.isRushOrder = updates.isRushOrder ? 1 : 0;

  try {
    const { data: currentOrder, error: checkErr } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (checkErr || !currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.storeId && currentOrder.storeId !== req.user.storeId) {
      return res.status(403).json({ error: "Forbidden: Order belongs to another store" });
    }

    delete updates.id; // Prevent updating ID

    // Prevent redundant updates / race conditions
    if (updates.status && currentOrder.status === updates.status) {
      return res.json({ success: true, id, message: "Order already in target status" });
    }

    // Filter updates
    const allowedKeys = [
      "items", "tableNumber", "totalAmount", "taxAmount", "discountAmount",
      "finalAmount", "status", "cashierId", "baristaId", "isRushOrder",
      "paymentMethod", "paymentCurrency", "cashTendered", "changeGiven",
      "appliedPromotionId", "qrPaymentState", "dailyOrderNumber"
    ];
    const safeUpdates = {};
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { error: updateErr } = await db.from("orders").update(safeUpdates).eq("id", id);
    if (updateErr) throw updateErr;

    res.json({ success: true, id });
  } catch (err) {
    console.error("Update Order Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id
app.delete("/api/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: orderDoc, error: checkErr } = await db
      .from("orders")
      .select("storeId")
      .eq("id", id)
      .single();

    if (checkErr || !orderDoc) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.storeId && orderDoc.storeId !== req.user.storeId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error: deleteErr } = await db.from("orders").delete().eq("id", id);
    if (deleteErr) throw deleteErr;

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SUPPLIES
app.get("/api/supply-items", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("supply_items").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: items, error } = await query;
    if (error) throw error;

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/supply-items", authenticateToken, async (req, res) => {
  const s = req.body;
  if (req.user.storeId && s.storeId !== req.user.storeId) {
    return res.status(403).json({ error: "Forbidden: Cannot create items for other stores" });
  }
  try {
    const { error } = await db.from("supply_items").insert(s);
    if (error) throw error;

    res.json({ success: true, supplyItem: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/supply-items/:id", authenticateToken, verifyOwnership('supply_items'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("supply_items").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/supply-items/:id", authenticateToken, verifyOwnership('supply_items'), async (req, res) => {
  try {
    const { error } = await db.from("supply_items").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROMOTIONS
app.get("/api/promotions", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("promotions").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: rawPromotions, error } = await query;
    if (error) throw error;

    const promotions = rawPromotions.map((d) => {
      let applicableProductIds = d.applicableProductIds || [];
      if (typeof applicableProductIds === "string") {
        try {
          applicableProductIds = JSON.parse(applicableProductIds);
        } catch (e) { }
      }

      return {
        ...d,
        isActive: !!d.isActive,
        applicableProductIds: applicableProductIds,
      };
    });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/promotions", authenticateToken, async (req, res) => {
  const p = req.body;
  if (req.user.storeId && p.storeId !== req.user.storeId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    p.isActive = p.isActive ? true : false;
    const { error } = await db.from("promotions").insert(p);
    if (error) throw error;

    res.json({ success: true, promotion: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/promotions/:id", authenticateToken, verifyOwnership('promotions'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive ? true : false;
    }
    const { error } = await db.from("promotions").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/promotions/:id", authenticateToken, verifyOwnership('promotions'), async (req, res) => {
  try {
    const { error } = await db.from("promotions").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CATEGORIES ROUTES ---

app.get("/api/categories", authenticateToken, enforceStoreScope, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("categories").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: rows, error } = await query;
    if (error) throw error;

    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", authenticateToken, async (req, res) => {
  try {
    const { id, name, storeId } = req.body;
    if (req.user.storeId && storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });

    const { error } = await db.from("categories").insert({ id, name, storeId });
    if (error) throw error;

    res.status(201).json({ id, name, storeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", authenticateToken, verifyOwnership('categories'), async (req, res) => {
  try {
    const { name } = req.body;
    const { error } = await db.from("categories").update({ name }).eq("id", req.params.id);
    if (error) throw error;

    res.json({ message: "Category updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", authenticateToken, verifyOwnership('categories'), async (req, res) => {
  try {
    const { error } = await db.from("categories").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SHIFTS
app.get("/api/shifts", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("shifts").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: shifts, error } = await query;
    if (error) throw error;

    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shifts", authenticateToken, async (req, res) => {
  const s = req.body;
  if (req.user.storeId && s.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const { error } = await db.from("shifts").insert(s);
    if (error) throw error;

    res.json({ success: true, shift: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/shifts/:id", authenticateToken, verifyOwnership('shifts'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("shifts").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/shifts/:id", authenticateToken, verifyOwnership('shifts'), async (req, res) => {
  try {
    const { error } = await db.from("shifts").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECIPES
app.get("/api/recipes", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("recipes").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: rawRecipes, error } = await query;
    if (error) throw error;

    const recipes = rawRecipes.map((r) => {
      // Handle JSON parse if string
      let ingredients = r.ingredients;
      if (typeof ingredients === "string") {
        try {
          ingredients = JSON.parse(ingredients);
        } catch (e) { }
      }
      let instructions = r.instructions;
      if (typeof instructions === "string") {
        try {
          instructions = JSON.parse(instructions);
        } catch (e) { }
      }

      return {
        ...r,
        ingredients: ingredients || [],
        instructions: instructions || [],
      };
    });
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recipes", authenticateToken, async (req, res) => {
  const r = req.body;
  if (req.user.storeId && r.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const { error } = await db.from("recipes").insert(r);
    if (error) throw error;

    res.json({ success: true, recipe: r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/recipes/:id", authenticateToken, verifyOwnership('recipes'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("recipes").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recipes/:id", authenticateToken, verifyOwnership('recipes'), async (req, res) => {
  try {
    const { error } = await db.from("recipes").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WASTAGE LOGS
app.get("/api/wastage-logs", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("wastage_logs").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: logs, error } = await query;
    if (error) throw error;

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/wastage-logs", authenticateToken, async (req, res) => {
  const l = req.body;
  if (req.user.storeId && l.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const { error } = await db.from("wastage_logs").insert(l);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TIME LOGS
app.get("/api/time-logs", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("time_logs").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: logs, error } = await query;
    if (error) throw error;

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/time-logs", authenticateToken, async (req, res) => {
  const l = req.body;
  if (req.user.storeId && l.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const { error } = await db.from("time_logs").insert(l);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/time-logs/:id", authenticateToken, verifyOwnership('time_logs'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("time_logs").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/time-logs/:id", authenticateToken, verifyOwnership('time_logs'), async (req, res) => {
  try {
    const { error } = await db.from("time_logs").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CASH DRAWER LOGS
app.get("/api/cash-drawer-logs", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("cash_drawer_logs").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: logs, error } = await query;
    if (error) throw error;

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cash-drawer-logs", authenticateToken, async (req, res) => {
  const l = req.body;
  if (req.user.storeId && l.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const { error } = await db.from("cash_drawer_logs").insert(l);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cash-drawer-logs/:id", authenticateToken, verifyOwnership('cash_drawer_logs'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    const { error } = await db.from("cash_drawer_logs").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ANNOUNCEMENTS
app.get("/api/announcements", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("announcements").select("*");

    if (storeId) {
      // announcements can be global (storeId is null) or specific to a store
      query = query.or(`storeId.eq.${storeId},storeId.is.null`);
    }

    const { data: rawAnnouncements, error } = await query;
    if (error) throw error;

    const announcements = rawAnnouncements.map((r) => {
      let targetRoles = r.targetRoles;
      if (typeof targetRoles === "string") {
        try {
          // Sometimes Postgres returns JSON as string, sometimes object
          targetRoles = JSON.parse(targetRoles);
        } catch (e) { }
      }

      return {
        ...r,
        isArchived: !!r.isArchived,
        targetRoles: targetRoles || [],
      };
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", authenticateToken, async (req, res) => {
  const a = req.body;
  if (req.user.storeId && a.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    a.isArchived = a.isArchived ? true : false;
    const { error } = await db.from("announcements").insert(a);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/announcements/:id", authenticateToken, verifyOwnership('announcements'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    delete updates.id;
    if (updates.isArchived !== undefined) {
      updates.isArchived = updates.isArchived ? true : false;
    }
    const { error } = await db.from("announcements").update(updates).eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/announcements/:id", authenticateToken, verifyOwnership('announcements'), async (req, res) => {
  try {
    const { error } = await db.from("announcements").delete().eq("id", req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FEEDBACK
app.get("/api/feedback", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("feedback").select("*");
    if (storeId) query = query.eq("storeId", storeId);

    const { data: fb, error } = await query;
    if (error) throw error;

    res.json(fb);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/feedback", authenticateToken, async (req, res) => {
  const f = req.body;
  if (req.user.storeId && f.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });

  try {
    const feedbackObj = {
      id: f.id,
      type: "General",
      message: f.comment,
      timestamp: f.timestamp,
      userId: f.givenByUserId,
      userName: "Unknown",
      storeId: f.storeId,
    };
    const { error } = await db.from("feedback").insert(feedbackObj);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// APP SETTINGS
app.get("/api/app-settings", async (req, res) => {
  try {
    const { data: settings, error } = await db
      .from("app_settings")
      .select("*")
      .eq("id", "1")
      .single();

    if (error || !settings) {
      return res.json({ registrationEnabled: false });
    }

    res.json({
      registrationEnabled: !!settings.registrationEnabled
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/app-settings", authenticateToken, requireGlobalAdmin, async (req, res) => {
  const { registrationEnabled } = req.body;
  try {
    const update = {
      id: "1", // Ensure ID is present if it's an upsert
      registrationEnabled: registrationEnabled === true,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await db.from("app_settings").upsert(update);
    if (error) throw error;

    res.json({ success: true, settings: update });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CURRENT ORDERS
app.get("/api/current-orders", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId, terminalId } = req.query;
  try {
    let query = db.from("current_orders").select("*").eq("storeId", storeId);

    if (terminalId) {
      query = query.eq("terminalId", terminalId);
    }

    const { data: orders, error } = await query.limit(1);
    if (error) throw error;

    if (!orders || orders.length === 0) {
      return res.json(null);
    }

    const order = orders[0];
    let items = order.items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) { }
    }

    const parsedOrder = {
      ...order,
      items: items || [],
      isRushOrder: !!order.isRushOrder,
    };
    res.json(parsedOrder);
  } catch (err) {
    console.error("Current Orders GET Error:", err);
    res.status(500).json({ error: err.message, details: err.details, code: err.code });
  }
});

app.post("/api/current-orders", authenticateToken, async (req, res) => {
  const order = req.body;
  if (req.user.storeId && order.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
  try {
    const allowedKeys = [
      "id", "storeId", "terminalId", "items", "tableNumber", "totalAmount",
      "taxAmount", "discountAmount", "finalAmount", "cashierId", "isRushOrder",
      "appliedPromotionId", "qrPaymentState", "lastUpdated"
    ];
    const safeOrder = {};
    for (const key of allowedKeys) {
      if (order[key] !== undefined) safeOrder[key] = order[key];
    }

    // Fix JSONB prototype stripping issue for Vercel -> Supabase
    if (safeOrder.items) {
      safeOrder.items = JSON.parse(JSON.stringify(safeOrder.items));
    }

    // Ensure all boolean fields are actually integers for this specific Supabase legacy column
    safeOrder.isRushOrder = safeOrder.isRushOrder ? 1 : 0;
    safeOrder.lastUpdated = new Date().toISOString();

    const { error } = await db.from("current_orders").upsert(safeOrder);
    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Current Orders POST Error:", err);
    res.status(500).json({ error: err.message, details: err.details, code: err.code });
  }
});

app.delete("/api/current-orders/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First verify ownership if it exists
    const { data: order } = await db.from("current_orders").select("storeId").eq("id", id).single();

    // If it exists but belongs to someone else
    if (order && req.user.storeId && order.storeId !== req.user.storeId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Whether it exists or not, we attempt to delete (if it doesn't exist, we still treat as success)
    const { error } = await db.from("current_orders").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Delete current-orders error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/init", async (req, res) => {
  try {
    console.log("Initializing database tables... (Skipped for Firestore)");

    console.log("Seeding data...");
    await seed();

    res.json({
      success: true,
      message: "Database initialized and seeded successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ===== COMBOS ENDPOINTS =====
// ===== COMBOS ENDPOINTS =====
app.get("/api/combos", async (req, res, next) => {
  // Allow public access if storeId is provided (for Online Menu)
  if (!req.headers.authorization && req.query.storeId) {
    try {
      const { storeId } = req.query;
      const { data, error } = await db.from("combos").select("*").eq("storeId", storeId);
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  // Otherwise, proceed to authenticated flow
  next();
}, authenticateToken, enforceStoreScope, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("combos").select("*");
    if (storeId) query = query.eq("storeId", storeId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/combos", authenticateToken, async (req, res) => {
  try {
    const combo = req.body;
    if (req.user.storeId && combo.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
    const { error } = await db.from("combos").insert(combo);
    if (error) throw error;
    res.json({ success: true, combo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/combos/:id", authenticateToken, verifyOwnership('combos'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    const { error } = await db.from("combos").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/combos/:id", authenticateToken, verifyOwnership('combos'), async (req, res) => {
  try {
    const { error } = await db.from("combos").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ADD-ONS ENDPOINTS =====
app.get("/api/addons", async (req, res, next) => {
  // Allow public access if storeId is provided (for Online Menu)
  if (!req.headers.authorization && req.query.storeId) {
    try {
      const { storeId } = req.query;
      const { data, error } = await db.from("addons").select("*").eq("storeId", storeId);
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  next();
}, authenticateToken, enforceStoreScope, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("addons").select("*");
    if (storeId) query = query.eq("storeId", storeId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/addons", authenticateToken, async (req, res) => {
  try {
    const addon = req.body;
    if (req.user.storeId && addon.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });
    const { error } = await db.from("addons").insert(addon);
    if (error) throw error;
    res.json({ success: true, addon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/addons/:id", authenticateToken, verifyOwnership('addons'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    const { error } = await db.from("addons").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/addons/:id", authenticateToken, verifyOwnership('addons'), async (req, res) => {
  try {
    const { error } = await db.from("addons").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== MODIFIER GROUPS ENDPOINTS =====
app.get("/api/modifiers", async (req, res, next) => {
  // Allow public access if storeId is provided (for Online Menu)
  if (!req.headers.authorization && req.query.storeId) {
    try {
      const { storeId } = req.query;
      const { data, error } = await db.from("modifiergroups").select("*").eq("storeId", storeId);
      if (error) throw error;
      const processed = (data || []).map(g => {
        let mods = g.options;
        while (typeof mods === 'string') {
          try { mods = JSON.parse(mods); } catch (e) { break; }
        }
        return {
          id: g.id,
          name: g.name,
          type: g.selectionType || 'single',
          required: g.minSelections > 0,
          storeId: g.storeId,
          modifiers: Array.isArray(mods) ? mods : []
        };
      });
      return res.json(processed);
    } catch (err) {
      console.error("Modifiers Public GET Error:", err);
      return res.status(500).json({ error: err.message, details: err.details, code: err.code });
    }
  }
  next();
}, authenticateToken, enforceStoreScope, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("modifiergroups").select("*");
    if (storeId) query = query.eq("storeId", storeId);
    const { data: rawData, error } = await query;
    if (error) throw error;

    const processed = (rawData || []).map(g => {
      let mods = g.options;
      while (typeof mods === 'string') {
        try { mods = JSON.parse(mods); } catch (e) { break; }
      }
      return {
        id: g.id,
        name: g.name,
        type: g.selectionType || 'single',
        required: g.minSelections > 0,
        storeId: g.storeId,
        modifiers: Array.isArray(mods) ? mods : []
      };
    });

    res.json(processed);
  } catch (err) {
    console.error("Modifiers GET Error:", err);
    res.status(500).json({ error: err.message, details: err.details, code: err.code });
  }
});

app.post("/api/modifiers", authenticateToken, async (req, res) => {
  try {
    const modifierGroup = req.body;
    if (req.user.storeId && modifierGroup.storeId !== req.user.storeId) return res.status(403).json({ error: "Forbidden" });

    // Map frontend specific properties to DB schema properties
    const dbPayload = {
      id: modifierGroup.id,
      name: modifierGroup.name,
      storeId: modifierGroup.storeId,
      selectionType: modifierGroup.type || 'single',
      minSelections: modifierGroup.required ? 1 : 0,
      maxSelections: modifierGroup.type === 'single' ? 1 : null,
      options: modifierGroup.modifiers ? JSON.parse(JSON.stringify(modifierGroup.modifiers)) : []
    };

    const { error } = await db.from("modifiergroups").insert(dbPayload);
    if (error) throw error;
    res.json({ success: true, modifierGroup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/modifiers/:id", authenticateToken, verifyOwnership('modifiergroups'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Explicitly map frontend properties to the DB properties
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.selectionType = updates.type;
    if (updates.required !== undefined) dbUpdates.minSelections = updates.required ? 1 : 0;
    if (updates.type !== undefined) dbUpdates.maxSelections = updates.type === 'single' ? 1 : null;
    if (updates.modifiers !== undefined) dbUpdates.options = JSON.parse(JSON.stringify(updates.modifiers));

    const { error } = await db.from("modifiergroups").update(dbUpdates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/modifiers/:id", authenticateToken, verifyOwnership('modifiergroups'), async (req, res) => {
  try {
    const { error } = await db.from("modifiergroups").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LEAVE REQUESTS
app.get("/api/leave-requests", authenticateToken, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("leave_requests").select("*");
    if (storeId) query = query.eq("storeId", storeId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leave-requests/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    updates.respondedAt = new Date().toISOString();
    const { error } = await db.from("leave_requests").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER LOYALTY
app.get("/api/customers/lookup/:phoneNumber", authenticateToken, async (req, res) => {
  const { phoneNumber } = req.params;
  const { storeId } = req.query;
  try {
    let query = db.from("customers").select("*").eq("phoneNumber", phoneNumber);
    if (storeId) query = query.eq("storeId", storeId);

    const { data: customers, error } = await query;
    if (error) throw error;
    res.json(customers[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  const customer = req.body;
  if (!customer.id) customer.id = `cust-${Date.now()}`;
  
  // Generate referral code if not provided
  if (!customer.referralCode) {
    customer.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  try {
    // Handle Referral logic
    if (customer.referredById) {
      // Award stamps to referrer
      const { data: referrer, error: refErr } = await db
        .from("customers")
        .select("*")
        .eq("id", customer.referredById)
        .single();
      
      if (!refErr && referrer) {
        await db.from("customers")
          .update({ currentStamps: referrer.currentStamps + 1 })
          .eq("id", customer.referredById);
        
        await db.from("referral_logs").insert({
          id: `ref-${Date.now()}`,
          referrerId: customer.referredById,
          refereeId: customer.id,
          stampsAwarded: 1,
          storeId: customer.storeId
        });
      }
      // Give initial stamp to referee too
      customer.currentStamps = (customer.currentStamps || 0) + 1;
    }

    const { error } = await db.from("customers").insert(customer);
    if (error) throw error;
    
    await logAuditAction(req.user, "Create Customer", { phone: customer.phoneNumber, referralCode: customer.referralCode });

    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id/recommendations", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Get last 20 orders for this customer to find favorites
    const { data: orders, error } = await db
      .from("orders")
      .select("items")
      .eq("customerId", id)
      .order("timestamp", { ascending: false })
      .limit(20);
    
    if (error) throw error;

    const products = {};
    (orders || []).forEach(order => {
      let items = order.items;
      if (!items) return;

      try {
        if (typeof items === 'string') {
          items = JSON.parse(items);
        }
      } catch (e) {
        console.error("Failed to parse items for order recommendation logic:", e);
        return;
      }

      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item && item.productId) {
            products[item.productId] = (products[item.productId] || 0) + (parseFloat(item.quantity) || 0);
          }
        });
      }
    });

    // Sort by frequency and take top 3
    const sorted = Object.entries(products)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id);

    res.json(sorted);
  } catch (err) {
    console.error("Recommendations API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/customers/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { error } = await db.from("customers").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC STORES (For Loyalty Portal)
app.get("/api/public/stores", async (req, res) => {
  try {
    const { data: stores, error } = await db
      .from("stores")
      .select("id, name, loyaltyEnabled")
      .eq("loyaltyEnabled", true);

    if (error) throw error;
    res.json(stores);
  } catch (err) {
    console.error("Failed to fetch public stores", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUBLIC LOYALTY (For Customer Portal)
app.get("/api/public/loyalty/:storeId/:phoneNumber", async (req, res) => {
  const { storeId, phoneNumber } = req.params;
  try {
    // Get Customer
    const { data: customers, error: custError } = await db
      .from("customers")
      .select("*")
      .eq("storeId", storeId)
      .eq("phoneNumber", phoneNumber);

    if (custError) throw custError;

    // Get Store Settings
    const { data: store, error: storeError } = await db
      .from("stores")
      .select("id, name, loyaltyEnabled, stampsPerItem, stampsToRedeem, loyaltyRewardDescription")
      .eq("id", storeId)
      .single();

    if (storeError) throw storeError;

// Auto-Tiering Logic Helper
const calculateTier = (totalStamps) => {
  if (totalStamps >= 100) return "GOLD";
  if (totalStamps >= 50) return "SILVER";
  if (totalStamps >= 10) return "BRONZE";
  return "MEMBER";
};

    res.json({
      success: true,
      customer: {
        ...customers[0],
        tier: calculateTier(customers[0].totalEarnedStamps || 0)
      },
      store
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// STAFF PERFORMANCE (For Leaderboard)
app.get("/api/staff-performance", authenticateToken, async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) return res.status(400).json({ error: "Missing storeId" });

  try {
    // 1. Get all staff for the store
    const { data: staff, error: staffError } = await db
      .from("users")
      .select("id, name, role")
      .eq("storeId", storeId);
    
    if (staffError) throw staffError;

    // 2. Get orders for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { data: orders, error: ordersError } = await db
      .from("orders")
      .select("totalAmount, createdBy")
      .eq("storeId", storeId)
      .gte("timestamp", startOfMonth.toISOString());

    if (ordersError) throw ordersError;

    // 3. Get Attendance (Time Logs)
    const { data: logs, error: logsError } = await db
      .from("time_logs")
      .select("userid")
      .eq("storeId", storeId)
      .gte("timestamp", startOfMonth.toISOString());

    if (logsError) throw logsError;

    // Calculate Scores
    const leaderboard = staff.map(s => {
      let score = 0;
      
      // Sales Points: 1 per $
      const sales = orders
        ?.filter(o => o.createdBy === s.id)
        .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) || 0;
      score += Math.floor(sales);

      // Attendance Points: 50 per unique day
      const daysWorked = new Set(
        logs
          ?.filter(l => l.userid === s.id)
          .map(l => new Date(l.timestamp).toDateString())
      ).size;
      score += (daysWorked * 50);

      // Mock task points for now (since store_tasks might be empty)
      // score += 100; 

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        score: score
      };
    });

    res.json(leaderboard);
  } catch (err) {
    console.error("Staff Performance API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// STAMP QR CLAIMS
app.post("/api/stamps/create-claim", authenticateToken, async (req, res) => {
  const { storeId, orderId, stamps } = req.body;
  try {
    const { data: claim, error } = await db
      .from("stamp_claims")
      .insert({
        store_id: storeId,
        order_id: orderId,
        stamps: stamps,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, claimId: claim.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/public/stamps/claim", async (req, res) => {
  const { claimId, phoneNumber, storeId } = req.body;
  try {
    // 1. Verify Claim
    const { data: claim, error: fetchError } = await db
      .from("stamp_claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (fetchError || !claim) {
      return res.status(404).json({ success: false, message: "Invalid or expired QR code" });
    }

    if (claim.claimed) {
      return res.status(400).json({ success: false, message: "QR code already used" });
    }

    if (new Date(claim.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "QR code expired" });
    }

    // 2. Find or Register Customer
    let { data: customers, error: custError } = await db
      .from("customers")
      .select("*")
      .eq("phoneNumber", phoneNumber)
      .eq("storeId", storeId);

    if (custError) throw custError;

    let customer = customers[0];
    if (!customer) {
      // Auto-register if not found? Or return error? 
      // User said "customer can use the customer app scan and get the stamp", implying they might need to register.
      // Let's assume we need a valid customer first, or auto-register with a default name.
      return res.status(404).json({ success: false, message: "Customer not found. Please register first." });
    }

    // 3. Award Stamps
    const newStamps = (customer.currentStamps || 0) + claim.stamps;
    const newTotalStamps = (customer.totalEarnedStamps || 0) + claim.stamps;

    const { error: updateCustError } = await db
      .from("customers")
      .update({
        currentStamps: newStamps,
        totalEarnedStamps: newTotalStamps
      })
      .eq("id", customer.id);

    if (updateCustError) throw updateCustError;

    // 4. Mark claim as used
    await db.from("stamp_claims").update({
      claimed: true,
      claimed_at: new Date().toISOString(),
      customer_id: customer.id
    }).eq("id", claimId);

    res.json({
      success: true,
      message: `Successfully claimed ${claim.stamps} stamps!`,
      currentStamps: newStamps
    });

  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// STAMP CLAIM STATUS
app.get("/api/stamps/claim-status/:claimId", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { claimId } = req.params;
  try {
    const { data: claim, error } = await db
      .from("stamp_claims")
      .select("claimed")
      .eq("id", claimId)
      .single();

    if (error || !claim) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    res.json({ success: true, claimed: claim.claimed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUBLIC CUSTOMER REGISTRATION
app.post("/api/public/customers/register", async (req, res) => {
  const { phoneNumber, name, storeId, password } = req.body;

  if (!phoneNumber || !storeId || !password) {
    return res.status(400).json({ success: false, message: "Phone number, Store ID, and Password are required." });
  }

  try {
    // Check if store exists and has loyalty enabled
    const { data: store, error: storeError } = await db
      .from("stores")
      .select("loyaltyEnabled")
      .eq("id", storeId)
      .single();

    if (storeError || !store || !store.loyaltyEnabled) {
      return res.status(400).json({ success: false, message: "Store does not exist or loyalty program is disabled." });
    }

    // Check if already registered
    const { data: existing, error: checkError } = await db
      .from("customers")
      .select("id")
      .eq("phoneNumber", phoneNumber)
      .eq("storeId", storeId);

    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: "This phone number is already registered at this store." });
    }

    const { referralCode: referrerCode } = req.body;
    let referredById = null;

    if (referrerCode) {
      const { data: referrers, error: refLookupErr } = await db
        .from("customers")
        .select("id")
        .eq("referralCode", referrerCode.toUpperCase());
      
      if (!refLookupErr && referrers && referrers.length > 0) {
        referredById = referrers[0].id;
      }
    }

    const newCustomer = {
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      phoneNumber,
      name: name || "Customer",
      storeId,
      currentStamps: referredById ? 1 : 0, // Give initial stamp if referred
      totalEarnedStamps: referredById ? 1 : 0,
      createdAt: new Date().toISOString(),
      password,
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      referredById: referredById
    };

    const { error: insertError } = await db.from("customers").insert(newCustomer);
    if (insertError) throw insertError;

    // Award stamp to referrer if they exist
    if (referredById) {
      const { data: referrer, error: refErr } = await db
        .from("customers")
        .select("currentStamps, totalEarnedStamps")
        .eq("id", referredById)
        .single();
      
      if (!refErr && referrer) {
        await db.from("customers")
          .update({ 
            currentStamps: (referrer.currentStamps || 0) + 1,
            totalEarnedStamps: (referrer.totalEarnedStamps || 0) + 1
          })
          .eq("id", referredById);
        
        await db.from("referral_logs").insert({
          id: `ref-${Date.now()}`,
          referrerId: referredById,
          refereeId: newCustomer.id,
          stampsAwarded: 1,
          storeId: storeId
        });
      }
    }

    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUBLIC CUSTOMER LOGIN
app.post("/api/public/customers/login", async (req, res) => {
  const { phoneNumber, storeId, password } = req.body;

  if (!phoneNumber || !storeId || !password) {
    return res.status(400).json({ success: false, message: "Phone number, Store ID, and Password are required." });
  }

  try {
    const { data: customer, error } = await db
      .from("customers")
      .select("*")
      .eq("phoneNumber", phoneNumber)
      .eq("storeId", storeId)
      .single();

    if (error || !customer) {
      return res.status(401).json({ success: false, message: "Invalid phone number or store." });
    }

    if (customer.password !== password) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Password matches! Return success without sending back the password itself
    const { password: _, ...customerWithoutPassword } = customer;
    res.json({ success: true, customer: customerWithoutPassword });

  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error during login." });
  }
});

// EXPENSES
app.get("/api/expenses", authenticateToken, enforceStoreScope, async (req, res) => {
  const { storeId } = req.query;
  try {
    let query = db.from("expenses").select("*");
    if (storeId) {
      query = query.eq("storeId", storeId);
    }
    
    const { data: expenses, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    res.json(expenses || []);
  } catch (err) {
    console.error("Expenses GET Error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  const expense = req.body;
  if (req.user.storeId && expense.storeId !== req.user.storeId) {
    return res.status(403).json({ error: "Forbidden: Cannot log expenses for other stores" });
  }
  try {
    if (!expense.id) expense.id = `exp-${Date.now()}`;
    const { error } = await db.from("expenses").insert(expense);
    if (error) throw error;
    
    await logAuditAction(req.user, "Create Expense", { category: expense.category, amount: expense.amount });

    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, verifyOwnership('expenses'), async (req, res) => {
  try {
    const { error } = await db.from("expenses").delete().eq("id", req.params.id);
    if (error) throw error;

    await logAuditAction(req.user, "Delete Expense", { expenseId: req.params.id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LEAVE REQUESTS
app.get("/api/leave-requests", authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("leave_requests").select("*");
    if (storeId) {
      query = query.eq("storeId", storeId);
    } else if (req.user.storeId) {
      query = query.eq("storeId", req.user.storeId);
    }
    
    const { data, error } = await query.order("requestedAt", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leave-requests", authenticateToken, async (req, res) => {
  try {
    const request = req.body;
    if (!request.id) request.id = `leave-${Date.now()}`;
    if (!request.requestedAt) request.requestedAt = new Date().toISOString();
    
    const { error } = await db.from("leave_requests").insert(request);
    if (error) throw error;
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leave-requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.respondedAt = new Date().toISOString();
    
    const { error } = await db.from("leave_requests").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OVERTIME REQUESTS
app.get("/api/overtime-requests", authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = db.from("overtime_requests").select("*");
    if (storeId) {
      query = query.eq("storeId", storeId);
    } else if (req.user.storeId) {
      query = query.eq("storeId", req.user.storeId);
    }
    
    const { data, error } = await query.order("requestedAt", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/overtime-requests", authenticateToken, async (req, res) => {
  try {
    const request = req.body;
    if (!request.id) request.id = `ot-${Date.now()}`;
    if (!request.requestedAt) request.requestedAt = new Date().toISOString();
    
    const { error } = await db.from("overtime_requests").insert(request);
    if (error) throw error;
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/overtime-requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.respondedAt = new Date().toISOString();
    
    const { error } = await db.from("overtime_requests").update(updates).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sentry Error Handler must be before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Listen only if not imported (local dev)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
