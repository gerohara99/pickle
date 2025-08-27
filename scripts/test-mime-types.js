/**
 * Test script to verify MIME types for JavaScript files
 */
const http = require("http");

// Function to check content type of a URL
function checkContentType(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${url}`, (res) => {
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers["content-type"]}`);
      console.log("---");

      // Collect response data to drain the stream
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          url,
          statusCode: res.statusCode,
          contentType: res.headers["content-type"],
        });
      });
    });

    req.on("error", (error) => {
      console.error(`Error checking ${url}:`, error.message);
      reject(error);
    });
  });
}

// Main function to check multiple files
async function checkFiles() {
  const files = [
    "/js/login.js",
    "/js/apiActions.js",
    "/js/index.js",
    "/test-module.html",
  ];

  console.log("Checking MIME types for files...");

  for (const file of files) {
    try {
      await checkContentType(file);
    } catch (error) {
      console.error(`Failed to check ${file}:`, error);
    }
  }

  console.log("Test completed.");
}

// Run the tests
checkFiles();
