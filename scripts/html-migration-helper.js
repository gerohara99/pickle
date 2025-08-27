#!/usr/bin/env node

/**
 * HTML Migration Helper
 *
 * This script helps organize HTML files for the Pug to HTML migration.
 * It copies HTML files from the project root to the appropriate directories
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
const ROUTES_FILE = path.join(PROJECT_ROOT, "routes", "viewRoutes.js");

// Create the public/html directory if it doesn't exist
async function ensureDirectoryExists(dir) {
  try {
    await access(dir);
  } catch (err) {
    console.log(`Creating directory: ${dir}`);
    await mkdir(dir, { recursive: true });
  }
}

// Find all HTML files in the project root
async function findHtmlFiles(dir) {
  const files = await readdir(dir);
  const htmlFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (["node_modules", ".git", "public", "views"].includes(file)) {
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

    // Skip files already in public/html or views
    if (filePath.includes(PUBLIC_HTML_DIR) || filePath.includes(VIEWS_DIR)) {
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

// Check migration status
async function checkMigrationStatus() {
  console.log("Checking migration status...");

  // Read the routes file
  const routesContent = fs.readFileSync(ROUTES_FILE, "utf8");

  // Check for any remaining viewsController usage (excluding imports)
  const viewsControllerUsage =
    routesContent.match(/\.\.\.viewsController\.[a-zA-Z]+/g) || [];

  if (viewsControllerUsage.length > 0) {
    console.log("\nRoutes still using viewsController:");
    viewsControllerUsage.forEach((match) => {
      console.log(`- ${match}`);
    });
  } else {
    console.log("\n✅ All routes migrated to directHtmlController!");
  }

  // Get all Pug files
  const pugFiles = await readdir(VIEWS_DIR);
  const pugTemplates = pugFiles
    .filter((file) => file.endsWith(".pug") && !file.includes("copy"))
    .map((file) => file.replace(".pug", ""));

  // Get all HTML files
  const htmlFiles = await readdir(VIEWS_DIR);
  const htmlTemplates = htmlFiles
    .filter((file) => file.endsWith(".html") && !file.includes("copy"))
    .map((file) => file.replace(".html", ""));

  // Special case: Consider baseTemplate.html as the equivalent of base.pug
  if (htmlTemplates.includes("baseTemplate") && pugTemplates.includes("base")) {
    const baseIndex = pugTemplates.indexOf("base");
    if (baseIndex !== -1) {
      pugTemplates.splice(baseIndex, 1);
    }
  }

  // Find Pug templates without HTML counterparts
  // Ignore files with 'copy' in the name as they're likely duplicates or backups
  const missingHtmlTemplates = pugTemplates.filter(
    (template) =>
      !htmlTemplates.includes(template) && !template.includes("copy")
  );

  if (missingHtmlTemplates.length > 0) {
    console.log("\nPug templates without HTML counterparts:");
    missingHtmlTemplates.forEach((template) => {
      console.log(`- ${template}.pug`);
    });
  } else {
    console.log("\n✅ All Pug templates have HTML counterparts!");
  }

  // Check HTML includes
  const publicIncludesDir = path.join(PROJECT_ROOT, "public", "includes");
  try {
    const includesFiles = await readdir(publicIncludesDir);
    const htmlIncludes = includesFiles.filter((file) => file.endsWith(".html"));

    console.log("\nHTML includes available:");
    htmlIncludes.forEach((file) => {
      console.log(`- ${file}`);
    });

    // Compare with Pug includes
    const viewsIncludesDir = path.join(VIEWS_DIR, "includes");
    try {
      const pugIncludesFiles = await readdir(viewsIncludesDir);
      const pugIncludes = pugIncludesFiles
        .filter((file) => file.endsWith(".pug") && !file.includes("copy"))
        .map((file) => file.replace(".pug", ""));

      const htmlIncludeNames = htmlIncludes.map((file) =>
        file.replace(".html", "")
      );

      // Find missing includes
      const missingIncludes = pugIncludes.filter(
        (include) =>
          !htmlIncludeNames.some((html) => html === include.replace(/^_/, ""))
      );

      if (missingIncludes.length > 0) {
        console.log("\nPug includes without HTML counterparts:");
        missingIncludes.forEach((include) => {
          console.log(`- ${include}.pug`);
        });
      } else {
        console.log("\n✅ All Pug includes have HTML counterparts!");
      }
    } catch (err) {
      console.log("\nNo Pug includes directory found");
    }
  } catch (err) {
    console.log("\nNo HTML includes directory found");
  }

  // Log files with 'copy' in the name
  const copyFiles = pugFiles.filter((file) => file.includes("copy"));
  if (copyFiles.length > 0) {
    console.log('\nPug files with "copy" in the name (ignored):');
    copyFiles.forEach((file) => {
      console.log(`- ${file}`);
    });
  }

  // Check for includes folder
  const includesDir = path.join(VIEWS_DIR, "includes");
  try {
    const includesFiles = await readdir(includesDir);
    const pugIncludes = includesFiles.filter((file) => file.endsWith(".pug"));

    if (pugIncludes.length > 0) {
      console.log("\nNote: Pug include files in views/includes/:");
      pugIncludes.forEach((file) => {
        console.log(`- ${file}`);
      });
      console.log(
        "These are used by Pug templates and may be migrated to HTML partials or components as needed."
      );
    }
  } catch (err) {
    // Includes directory might not exist, which is fine
  }

  // Overall migration status
  if (viewsControllerUsage.length === 0 && missingHtmlTemplates.length === 0) {
    console.log(
      "\n🎉 Migration complete! All routes and templates have been migrated."
    );
  } else {
    console.log(
      "\n⚠️ Migration in progress. See details above for remaining tasks."
    );
  }

  return {
    routesToMigrate: viewsControllerUsage,
    missingHtmlTemplates,
  };
}

// Main function
async function main() {
  try {
    console.log("HTML Migration Helper");
    console.log("-------------------");
    console.log("Current date: " + new Date().toString());

    const command = process.argv[2];

    if (command === "check") {
      await checkMigrationStatus();
    } else {
      const htmlFiles = await findHtmlFiles(PROJECT_ROOT);
      await copyHtmlFiles(htmlFiles);

      console.log("-------------------");
      console.log("Migration helper completed");
      console.log(`HTML files are now available in: ${PUBLIC_HTML_DIR}`);

      // Check migration status after copying files
      await checkMigrationStatus();
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the script
console.log("Starting HTML migration helper...");
main().then(() => {
  console.log("HTML migration helper completed.");
});
