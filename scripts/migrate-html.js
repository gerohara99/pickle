#!/usr/bin/env node

/**
 * HTML Migration Helper
 *
 * This script helps organize HTML files for the Pug to HTML migration.
 * It copies HTML files from various locations to the public/html directory.
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

// Template mapping (Pug to HTML)
const templateMap = {
  "homepage.pug": "homepage.html",
  "login.pug": "login.html",
  "signUp.pug": "signUp.html",
  "myAccountDetails.pug": "myAccountDetails.html",
  "myPasswordUpdate.pug": "myPasswordUpdate.html",
  "myPasswordForgot.pug": "myPasswordForgot.html",
  "myPasswordReset.pug": "myPasswordReset.html",
  "showAllUsers.pug": "showAllUsers.html",
  "createUser.pug": "createUser.html",
  "editUser.pug": "editUser.html",
  "showAllEvents.pug": "showAllEvents.html",
  "createEvent.pug": "createEvent.html",
  "editEvent.pug": "editEvent.html",
  "showAllSchedules.pug": "showAllSchedules.html",
  "viewMasterSchedule.pug": "viewMasterSchedule.html",
  "viewMySchedule.pug": "viewMySchedule.html",
  "browseNewEvents.pug": "browseNewEvents.html",
  "browseMyEvents.pug": "browseMyEvents.html",
  "error.pug": "error.html",
  "noShowEvent.pug": "noShowEvent.html",
};

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
      if (["node_modules", ".git", "public/html"].includes(file)) {
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

// Find Pug templates
async function findPugTemplates() {
  const templates = [];

  if (!fs.existsSync(VIEWS_DIR)) {
    console.log("Views directory not found");
    return templates;
  }

  const files = await readdir(VIEWS_DIR);

  for (const file of files) {
    if (file.endsWith(".pug") && templateMap[file]) {
      templates.push({
        pugFile: path.join(VIEWS_DIR, file),
        htmlName: templateMap[file],
      });
    }
  }

  return templates;
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

// Generate HTML stub files for Pug templates that don't have HTML equivalents
async function generateHtmlStubs(templates) {
  await ensureDirectoryExists(PUBLIC_HTML_DIR);

  for (const template of templates) {
    const destPath = path.join(PUBLIC_HTML_DIR, template.htmlName);

    // Check if HTML file already exists
    try {
      await access(destPath);
      console.log(`HTML file already exists for ${template.htmlName}`);
      continue;
    } catch (err) {
      // File doesn't exist, create stub
    }

    console.log(
      `Creating HTML stub for ${path.basename(template.pugFile)} → ${template.htmlName}`
    );

    const stubContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pickle Admin - ${template.htmlName.replace(".html", "")}</title>
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/mediaQueries.css">
</head>
<body>
    <header>
        <h1>Pickle Admin</h1>
    </header>
    <main>
        <h2>${template.htmlName.replace(".html", "")}</h2>
        <p>This is a stub HTML file for ${template.pugFile}.</p>
        <p>Replace this content with the actual HTML implementation.</p>
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Pickle Administration</p>
    </footer>
    <script type="module" src="/js/index.js"></script>
</body>
</html>`;

    try {
      fs.writeFileSync(destPath, stubContent);
    } catch (err) {
      console.error(
        `Error creating stub for ${template.htmlName}: ${err.message}`
      );
    }
  }
}

// Main function
async function main() {
  try {
    console.log("HTML Migration Helper");
    console.log("-------------------");

    // Find all HTML files
    const htmlFiles = await findHtmlFiles(PROJECT_ROOT);
    await copyHtmlFiles(htmlFiles);

    // Find Pug templates that need HTML stubs
    const pugTemplates = await findPugTemplates();
    await generateHtmlStubs(pugTemplates);

    console.log("-------------------");
    console.log("Migration helper completed");
    console.log(`HTML files are now available in: ${PUBLIC_HTML_DIR}`);
    console.log(
      "Remember to complete the actual HTML implementations for the stub files."
    );
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the script
main();
