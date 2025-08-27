/**
 * Test script to check MIME types
 */

const http = require("http");

// Function to check MIME type
function checkMimeType(url) {
  return new Promise((resolve, reject) => {
    const options = {
      host: "localhost",
      port: 3000,
      path: url,
      method: "HEAD",
    };

    const req = http.request(options, (res) => {
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers["content-type"]}`);
      console.log("---");
      resolve(res.headers["content-type"]);
    });

    req.on("error", (e) => {
      console.error(`Error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

// Check a few key JavaScript files
async function run() {
  try {
    await checkMimeType("/js/login.js");
    await checkMimeType("/js/apiActions.js");
    await checkMimeType("/js/index.js");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
