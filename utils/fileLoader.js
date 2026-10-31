const fs = require("fs");
const path = require("path");

function loadJSON(filePath) {
  // Load initially
  let data = require(filePath);

  // Resolve full path for watcher
  const fullPath = path.resolve(__dirname, filePath);

  // Watch for changes
  fs.watch(fullPath, (eventType) => {
    if (eventType === "change") {
      try {
        delete require.cache[require.resolve(filePath)]; // clear cache
        data = require(filePath); // reload JSON
        console.log(`${filePath} reloaded`);
      } catch (err) {
        console.error(`Error reloading ${filePath}:`, err);
      }
    }
  });

  return () => data; // return a getter function
}
module.exports = { loadJSON };
