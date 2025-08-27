#!/usr/bin/env node

/**
 * HTML Testing Helper
 *
 * This script helps test all HTML pages to ensure they're working correctly.
 * It provides a simple way to check if all HTML pages can be loaded without errors.
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const axios = require("axios");
const readdir = promisify(fs.readdir);

// Simple color functions if chalk is not available
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

// Directories
const PROJECT_ROOT = path.resolve(__dirname, "..");
const VIEWS_DIR = path.join(PROJECT_ROOT, "views");

// Base URL for testing
const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

// Routes to test
const ROUTES_TO_TEST = {
  // Authentication
  login: "/me/login",
  signup: "/me/signup",
  myPasswordForgot: "/me/forgotPassword",
  myPasswordReset: "/me/myPasswordReset/dummytoken",
  myPasswordUpdate: "/me/myPasswordUpdate",
  myAccountDetails: "/me/myAccountDetails",

  // Events
  browseNewEvents: "/events/browseNew",
  browseMyEvents: "/events/myBrowse",
  createEvent: "/events/create",
  showAllEvents: "/events/showAll",
  editEvent: "/events/get/dummyid",
  viewMasterSchedule: "/events/viewMasterSchedule/dummyid",
  viewMySchedule: "/events/viewMySchedule/dummyid",
  showAllSchedules: "/events/showAllSchedules",
  noShowEvent: "/events/noShowForm",

  // Users
  showAllUsers: "/users/showAll",
  createUser: "/users/create",
  editUser: "/users/get/dummyid",

  // Settings
  editSystemSettings: "/settings/get",

  // Other
  homepage: "/",
  error: "/non-existent-page",
};

// Find all HTML files in the views directory
async function findHtmlFiles() {
  try {
    const files = await readdir(VIEWS_DIR);
    return files.filter(
      (file) => file.endsWith(".html") && !file.includes("copy")
    );
  } catch (err) {
    console.error("Error reading views directory:", err);
    return [];
  }
}

// Test a single route
async function testRoute(route, url) {
  try {
    console.log(colors.blue(`Testing ${route} at ${url}...`));
    const response = await axios.get(url, {
      validateStatus: () => true, // Accept all status codes
      maxRedirects: 0, // Don't follow redirects
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(colors.green(`✅ ${route}: OK (${response.status})`));
      return { route, url, status: response.status, success: true };
    } else if (response.status >= 300 && response.status < 400) {
      console.log(
        colors.yellow(
          `⚠️ ${route}: Redirect (${response.status}) to ${response.headers.location}`
        )
      );
      return {
        route,
        url,
        status: response.status,
        redirect: response.headers.location,
        success: true,
      };
    } else {
      console.log(colors.red(`❌ ${route}: Error (${response.status})`));
      return { route, url, status: response.status, success: false };
    }
  } catch (err) {
    console.log(colors.red(`❌ ${route}: Exception - ${err.message}`));
    return { route, url, error: err.message, success: false };
  }
}

// Main function
async function main() {
  try {
    console.log("HTML Testing Helper");
    console.log("------------------");

    // Check if server is running
    try {
      await axios.get(BASE_URL, { timeout: 3000 });
    } catch (err) {
      console.error(
        colors.red(`Error: Cannot connect to server at ${BASE_URL}`)
      );
      console.error(
        colors.yellow(
          "Make sure your server is running before testing HTML pages."
        )
      );
      process.exit(1);
    }

    // Get HTML files
    const htmlFiles = await findHtmlFiles();
    console.log(`Found ${htmlFiles.length} HTML files in views directory`);

    // Results tracking
    const results = [];
    const missingRoutes = [];

    // Test each route defined in ROUTES_TO_TEST
    for (const [template, route] of Object.entries(ROUTES_TO_TEST)) {
      const result = await testRoute(template, `${BASE_URL}${route}`);
      results.push(result);
    }

    // Check for HTML files without defined routes
    for (const file of htmlFiles) {
      const template = file.replace(".html", "");
      if (!Object.keys(ROUTES_TO_TEST).includes(template)) {
        missingRoutes.push(template);
      }
    }

    // Print summary
    console.log("\nTesting Summary:");
    console.log("---------------");

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Total routes tested: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (missingRoutes.length > 0) {
      console.log("\nHTML files without defined test routes:");
      missingRoutes.forEach((route) => {
        console.log(`- ${route}.html`);
      });
    }

    if (failed > 0) {
      console.log("\nFailed routes:");
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          console.log(
            `- ${result.route} (${result.url}): ${result.error || `Status ${result.status}`}`
          );
        });
    }

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

// Run the script
main();
