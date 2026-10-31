require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Core services
const { connectDB } = require("./config/db.config.js");
// const { startReferenceWatcher } = require("./services/core/referenceWatcher");

// Utilities
const { serverAdapter } = require("./queue/notification.queue");
const { errorHandler } = require("./utils/AppError.js");
const { redisClient } = require("./config/redis.config.js");
const { CORS_ORIGINS } = require("./constants/env.js");
const helmet = require("helmet");
const compression = require("compression");

// Server config
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

async function startServer() {
  try {
    // 1️⃣ Connect to DB
    await connectDB();
    // 3️⃣ Start reference file watcher (clears Redis cache on changes)
    // startReferenceWatcher();

    // 4️⃣ Middleware
    ///////////////////////////////////////////////////////////////////////////
    // Trust railway proxy
    ///////////////////////////////////////////////////////////////////////////
    app.set("trust proxy", 1);
    ///////////////////////////////////////////////////////////////////////////
    // Security
    ///////////////////////////////////////////////////////////////////////////

    app.use(
      helmet({
        crossOriginResourcePolicy: false,
      }),
    );

    ///////////////////////////////////////////////////////////////////////////
    // Compression
    ///////////////////////////////////////////////////////////////////////////

    app.use(compression());

    ///////////////////////////////////////////////////////////////////////////
    // CORS
    ///////////////////////////////////////////////////////////////////////////

    app.use(
      cors({
        origin(origin, callback) {
          if (!origin) return callback(null, true);

          if (
            process.env.NODE_ENV !== "production" &&
            origin.startsWith("http://localhost")
          ) {
            return callback(null, true);
          }

          if (CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
          }

          return callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-refresh-attempt"],
      }),
    );
    app.use(cookieParser());
    app.use("/webhooks", require("./routes/payment/"));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // 5️⃣ Static files
    app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

    // 6️⃣ Webhooks (before json parser if needed)
    // // 3️⃣ ⚠️ Mount webhook route BEFORE express.json()
    // 7️⃣ Routes
    app.use(
      "/api/cloudinary",
      require("./routes/seller/documents.signature.routes"),
    );

    // reference data routes
    app.use("/api/v1/reference", require("./routes/reference.routes"));
    // require("./cron/registrationCleanup.cron");

    app.use("/api/seller", require("./routes/seller/dashboard.routes"));
    app.use(
      "/api/v1/seller/products",
      require("./routes/seller/product.routes"),
    );
    app.use(
      "/api/v1/seller/leads",
      require("./routes/seller/lead.seller.routes.js"),
    );
    app.use("/api/seller/orders", require("./routes/seller/order.routes"));
    app.use("/api/seller/profile", require("./routes/seller/profile.routes"));
    app.use(
      "/api/seller/notifications",
      require("./routes/seller/notification.routes"),
    );

    // Payment routes (The API-based ones, not webhook)
    // app.use(
    //   "/api/payment",
    //   require("./routes/payment/paymentWebhook.routes.js"),
    // );

    // Admin
    app.use("/api/admin", require("./routes/admin/auth.routes"));
    app.use("/api/admin/categories", require("./routes/admin/category.routes"));
    app.use(
      "/api/admin/sellers",
      require("./routes/admin/seller.admin.routes"),
    );
    app.use("/api/admin/users", require("./routes/admin/user.admin.routes"));
    app.use(
      "/api/admin/products",
      require("./routes/admin/product.admin.routes"),
    );
    app.use("/api/admin/orders", require("./routes/admin/order.admin.routes"));
    app.use(
      "/api/admin/dashboard",
      require("./routes/admin/dashboard.admin.routes"),
    );

    // Home page, Auth & Users
    app.use("/api/v1/homepage", require("./routes/homepage.routes.js"));
    app.use("/api/v1/register", require("./routes/registration.routes.js"));
    app.use("/api/v1/auth", require("./routes/auth.route.js"));

    app.use(
      "/api/v1/user/change-password",
      require("./routes/user/changePassword.routes"),
    );

    app.use("/api/v1/onboarding", require("./routes/onboarding.routes"));
    app.use("/api/user/orders", require("./routes/user/order.user.routes"));
    app.use("/api/v1/leads", require("./routes/user/lead.user.routes.js"));
    app.use("/api/products", require("./routes/product.routes"));
    app.use("/api/reviews", require("./routes/productReview.routes.js"));
    app.use("/api/categories", require("./routes/category.routes"));

    // 8️⃣ Queue UI
    app.use("/admin/queues", serverAdapter.getRouter());

    // 9️⃣ Health check

    app.get("/health", async (req, res) => {
      const mongo = require("mongoose").connection.readyState === 1;

      res.status(mongo ? 200 : 503).json({
        status: mongo ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        mongodb: mongo,
        redis: redisClient.status,
        memory: process.memoryUsage(),
      });
    });
    ///////////////////////////////////////////////////////////////////////////
    // 404
    ///////////////////////////////////////////////////////////////////////////

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });
    // 🔟 Global error handler
    app.use(errorHandler);

    // 1️⃣1️⃣ Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    });

    // 1️⃣2️⃣ Graceful shutdown
    const gracefulShutdown = async () => {
      console.log("👋 Graceful shutdown initiated...");

      await redisClient.quit();

      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
}

startServer();
