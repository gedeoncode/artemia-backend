const chokidar = require("chokidar");
const path = require("path");
const { redisClient } = require("../config/redis.config");
const fileCacheMap = require("../constants/referenceFileMap");

function startReferenceWatcher() {
  const filesToWatch = Object.keys(fileCacheMap);

  const absolutePaths = filesToWatch.map((file) =>
    path.join(process.cwd(), file),
  );

  const watcher = chokidar.watch(absolutePaths, {
    persistent: true,
    ignoreInitial: true, // don't trigger on startup
  });

  watcher.on("change", async (filePath) => {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      const normalized = relativePath.replace(/\\/g, "/");

      const cacheKey = fileCacheMap[normalized];

      if (!cacheKey) return;

      console.log(`📁 Reference file changed: ${normalized}`);
      console.log(`🧹 Clearing Redis cache: ${cacheKey}`);

      await redisClient.del(cacheKey);

      console.log("✅ Cache cleared successfully");
    } catch (err) {
      console.error("Reference watcher error:", err);
    }
  });

  console.log("👀 Reference file watcher started");
}

module.exports = { startReferenceWatcher };
