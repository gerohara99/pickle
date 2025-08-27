#!/usr/bin/env node

/**
 * HTML Fallback Tester
 *
 * This script tests the HTML fallback mechanism by:
 * 1. Making a request to a route
 * 2. Checking if it's served by HTML or Pug
 * 3. Temporarily renaming the HTML file to test fallback
 * 4. Making another request to confirm fallback works
 * 5. Restoring the HTML file
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { execSync } = require("child_process");

const rename = promisify(fs.rename);
const access = promisify(fs.access);

// Configuration
const HOST = "localhost";
const PORT = process.env.PORT || 3000;
const PUBLIC_HTML_DIR = path.join(__dirname, "..", "public", "html");
const VIEWS_DIR = path.join(__dirname, "..", "views");

// Route to test
const TEST_ROUTE = process.argv[2] || "/";
const TEST_TEMPLATE = process.argv[3] || "homepage";

// Make an HTTP request to the route
function makeRequest(route) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: route,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

// Check if a file exists
async function fileExists(filePath) {
  try {
    await access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// Rename a file
async function renameFile(oldPath, newPath) {
  if (await fileExists(oldPath)) {
    await rename(oldPath, newPath);
    return true;
  }
  return false;
}

// Check if server is running
function isServerRunning() {
  try {
    execSync(`curl -s http://${HOST}:${PORT}/health`);
    return true;
  } catch (err) {
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log("HTML Fallback Tester");
    console.log("-------------------");

    // Check if server is running
    if (!isServerRunning()) {
      console.log(
        "⚠️ Server is not running. Please start the server before running this test."
      );
      return;
    }

    console.log(`Testing route: ${TEST_ROUTE}`);
    console.log(`Template: ${TEST_TEMPLATE}`);

    // Check if HTML file exists
    const publicHtmlPath = path.join(PUBLIC_HTML_DIR, `${TEST_TEMPLATE}.html`);
    const viewsHtmlPath = path.join(VIEWS_DIR, `${TEST_TEMPLATE}.html`);

    const publicHtmlExists = await fileExists(publicHtmlPath);
    const viewsHtmlExists = await fileExists(viewsHtmlPath);

    if (!publicHtmlExists && !viewsHtmlExists) {
      console.log(`⚠️ No HTML file found for template: ${TEST_TEMPLATE}`);
      console.log("Cannot test fallback mechanism without an HTML file");
      return;
    }

    // Determine which HTML file to test
    const htmlPath = publicHtmlExists ? publicHtmlPath : viewsHtmlPath;
    const backupPath = `${htmlPath}.backup`;

    console.log(`Found HTML file: ${htmlPath}`);

    // Make initial request
    console.log("\nMaking initial request (HTML should be served)...");
    const initialResponse = await makeRequest(TEST_ROUTE);
    console.log(`Status: ${initialResponse.statusCode}`);
    console.log(`Content-Type: ${initialResponse.headers["content-type"]}`);

    // Determine if HTML was served
    const isHtml =
      initialResponse.headers["content-type"]?.includes("text/html");
    console.log(`Served as HTML: ${isHtml ? "Yes" : "No"}`);

    // Rename HTML file to test fallback
    console.log("\nTemporarily renaming HTML file to test fallback...");
    await renameFile(htmlPath, backupPath);

    // Make second request (should fall back to Pug)
    console.log("\nMaking second request (Pug should be served)...");
    const fallbackResponse = await makeRequest(TEST_ROUTE);
    console.log(`Status: ${fallbackResponse.statusCode}`);
    console.log(`Content-Type: ${fallbackResponse.headers["content-type"]}`);

    // Restore HTML file
    console.log("\nRestoring HTML file...");
    await renameFile(backupPath, htmlPath);

    console.log("\nTest completed.");
    console.log("-------------------");

    // Check if fallback worked
    if (
      initialResponse.headers["content-type"] !==
        fallbackResponse.headers["content-type"] ||
      initialResponse.body !== fallbackResponse.body
    ) {
      console.log("✅ Fallback mechanism is working correctly!");
    } else {
      console.log(
        "⚠️ Could not verify fallback mechanism - responses were identical"
      );
    }
  } catch (err) {
    console.error("Error:", err);

    // Ensure HTML file is restored in case of error
    const htmlPath = path.join(PUBLIC_HTML_DIR, `${TEST_TEMPLATE}.html`);
    const backupPath = `${htmlPath}.backup`;

    if (await fileExists(backupPath)) {
      console.log("Restoring HTML file after error...");
      await renameFile(backupPath, htmlPath);
    }
  }
}

// Run the script
main();
