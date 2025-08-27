#!/usr/bin/env node

/**
 * HTML Migration Helper
 *
 * This script helps organize HTML files for the full migration to HTML.
 * It copies HTML files from various locations to the public/html directory
 * and ensures they follow the correct naming conventions.
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const stat = promisify(fs.stat);

// Directories
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_HTML_DIR = path.join(PROJECT_ROOT, "public", "html");
const VIEWS_DIR = path.join(PROJECT_ROOT, "views");

// Templates to convert from Pug to HTML
const PUG_TEMPLATES = [
  "homepage",
  "browseMyEvents",
  "browseNewEvents",
  "createEvent",
  "createUser",
  "editEvent",
  "editSystemSettings",
  "editUser",
  "error",
  "login",
  "myAccountDetails",
  "myPasswordForgot",
  "myPasswordReset",
  "myPasswordUpdate",
  "noShowEvent",
  "scheduleCalculator",
  "showAllEvents",
  "showAllSchedules",
  "showAllUsers",
  "signUp",
  "viewMasterSchedule",
  "viewMySchedule",
];

// Create the public/html directory if it doesn't exist
async function ensureDirectoryExists(dir) {
  try {
    await access(dir);
  } catch (err) {
    console.log(`Creating directory: ${dir}`);
    await mkdir(dir, { recursive: true });
  }
}

// Find all HTML files in the project
async function findHtmlFiles(dir) {
  const files = await readdir(dir);
  const htmlFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (["node_modules", ".git"].includes(file)) {
        continue;
      }

      // Recursively search subdirectories
      const subFiles = await findHtmlFiles(filePath);
      htmlFiles.push(...subFiles);
    } else if (file.endsWith(".html")) {
      htmlFiles.push(filePath);
    }
  }

  return htmlFiles;
}

// Copy HTML files to the public/html directory
async function copyHtmlFiles(htmlFiles) {
  await ensureDirectoryExists(PUBLIC_HTML_DIR);

  console.log(`Found ${htmlFiles.length} HTML files to process`);

  for (const filePath of htmlFiles) {
    const fileName = path.basename(filePath);
    const destPath = path.join(PUBLIC_HTML_DIR, fileName);

    // Skip files already in public/html
    if (filePath.includes(PUBLIC_HTML_DIR)) {
      continue;
    }

    console.log(`Copying ${fileName} to public/html directory`);

    try {
      await copyFile(filePath, destPath);
    } catch (err) {
      console.error(`Error copying ${fileName}: ${err.message}`);
    }
  }
}

// Check for missing HTML files (templates that need to be created)
async function checkMissingTemplates() {
  await ensureDirectoryExists(PUBLIC_HTML_DIR);

  const htmlFiles = await readdir(PUBLIC_HTML_DIR);
  const htmlTemplates = htmlFiles.map((file) => file.replace(".html", ""));

  const missingTemplates = PUG_TEMPLATES.filter(
    (template) => !htmlTemplates.includes(template)
  );

  if (missingTemplates.length > 0) {
    console.log("\nMissing HTML templates:");
    console.log("These Pug templates need to be converted to HTML:");
    missingTemplates.forEach((template) => {
      console.log(`- ${template}.pug → ${template}.html`);
    });
  } else {
    console.log("\nAll required templates have been created!");
  }
}

// Create a basic stub HTML file for a template
async function createStubHtmlFiles() {
  await ensureDirectoryExists(PUBLIC_HTML_DIR);

  const htmlFiles = await readdir(PUBLIC_HTML_DIR);
  const htmlTemplates = htmlFiles.map((file) => file.replace(".html", ""));

  const missingTemplates = PUG_TEMPLATES.filter(
    (template) => !htmlTemplates.includes(template)
  );

  if (missingTemplates.length > 0) {
    console.log("\nCreating stub HTML files for missing templates:");

    for (const template of missingTemplates) {
      const htmlPath = path.join(PUBLIC_HTML_DIR, `${template}.html`);

      // Basic HTML stub
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template}</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/mediaQueries.css">
  <link rel="stylesheet" href="/css/typoGraphySystem.css">
  <link rel="stylesheet" href="/css/rallypoint.css">
</head>
<body>
  <header>
    <h1>${template}</h1>
  </header>
  
  <main>
    <p>This is a stub HTML file for the ${template} page.</p>
    <p>This file needs to be properly implemented.</p>
  </main>
  
  <script type="module" src="/js/index.js"></script>
</body>
</html>`;

      try {
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`- Created stub for ${template}.html`);
      } catch (err) {
        console.error(
          `Error creating stub for ${template}.html: ${err.message}`
        );
      }
    }
  }
}

// Main function
async function main() {
  try {
    console.log("HTML Migration Helper");
    console.log("-------------------");

    await ensureDirectoryExists(PUBLIC_HTML_DIR);
    console.log(`HTML directory: ${PUBLIC_HTML_DIR}`);

    const htmlFiles = await findHtmlFiles(PROJECT_ROOT);
    await copyHtmlFiles(htmlFiles);

    await checkMissingTemplates();

    // Ask if stub HTML files should be created
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      "\nDo you want to create stub HTML files for missing templates? (y/n) ",
      async (answer) => {
        if (answer.toLowerCase() === "y") {
          await createStubHtmlFiles();
        }

        console.log("\nMigration helper completed");
        readline.close();
      }
    );
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the script
main();
