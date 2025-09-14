/**
 * Code Base Scanner
 * Scans JavaScript files for common code issues
 */

const fs = require("fs");
const path = require("path");

// Configuration
const ROOT_DIR = path.resolve(__dirname, "..");
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", "coverage"];
const FILE_EXTENSIONS = [".js", ".mjs"];
const SIZE_WARNING_KB = 50; // Flag files larger than 50KB

// Results storage
const issues = {
  duplicateFunctions: [],
  largeFiles: [],
  potentialMergeConflicts: [],
  syntaxIssues: [],
};

/**
 * Recursively scan directory for JavaScript files
 */
function scanDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (IGNORE_DIRS.includes(item)) continue;

      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scanDirectory(fullPath);
      } else if (
        stats.isFile() &&
        FILE_EXTENSIONS.includes(path.extname(fullPath))
      ) {
        scanFile(fullPath, stats);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
}

/**
 * Scan a single JavaScript file for issues
 */
function scanFile(filePath, stats) {
  console.log(`Scanning ${filePath}...`);

  // Check file size
  const fileSizeKB = stats.size / 1024;
  if (fileSizeKB > SIZE_WARNING_KB) {
    issues.largeFiles.push({
      file: filePath,
      size: `${fileSizeKB.toFixed(2)}KB`,
    });
  }

  try {
    // Read file content
    const content = fs.readFileSync(filePath, "utf8");

    // Check for duplicate function definitions
    checkForDuplicateFunctions(filePath, content);

    // Check for potential merge conflicts or duplicated sections
    checkForDuplicatedSections(filePath, content);

    // Check for basic syntax issues
    checkForSyntaxIssues(filePath, content);
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
  }
}

/**
 * Check for duplicate function definitions in a file
 */
function checkForDuplicateFunctions(filePath, content) {
  // Extract function definitions using regex
  const functionMatches = content.match(/function\s+(\w+)/g) || [];
  const functionNames = functionMatches.map((match) => match.split(/\s+/)[1]);

  // Find duplicates
  const seen = new Map();
  const duplicates = [];

  functionNames.forEach((name) => {
    if (!name) return; // Skip if name is undefined

    if (seen.has(name)) {
      seen.set(name, seen.get(name) + 1);
      if (!duplicates.includes(name)) {
        duplicates.push(name);
      }
    } else {
      seen.set(name, 1);
    }
  });

  if (duplicates.length > 0) {
    issues.duplicateFunctions.push({
      file: filePath,
      duplicates: duplicates.map((name) => ({
        name,
        count: seen.get(name),
      })),
    });
  }
}

/**
 * Check for duplicated large sections of code that might indicate merge issues
 */
function checkForDuplicatedSections(filePath, content) {
  // Split the file into chunks
  const lines = content.split("\n");

  // Look for export default or module.exports appearing multiple times
  const exportLines = lines.filter(
    (line) => line.includes("export default") || line.includes("module.exports")
  );

  if (exportLines.length > 1) {
    issues.potentialMergeConflicts.push({
      file: filePath,
      issue: `Found ${exportLines.length} export statements, potential merge conflict`,
      lines: exportLines,
    });
    return;
  }

  // Look for duplicated chunks of code (very basic approach)
  // We'll use a simple sliding window of 10 lines
  const WINDOW_SIZE = 10;
  const chunks = new Map();

  for (let i = 0; i <= lines.length - WINDOW_SIZE; i++) {
    const chunk = lines.slice(i, i + WINDOW_SIZE).join("\n");
    if (chunks.has(chunk)) {
      chunks.set(chunk, chunks.get(chunk) + 1);
    } else {
      chunks.set(chunk, 1);
    }
  }

  // Find chunks that appear multiple times
  const duplicatedChunks = Array.from(chunks.entries())
    .filter(([_, count]) => count > 1)
    .map(([chunk, count]) => ({ chunk, count }));

  if (duplicatedChunks.length > 0) {
    issues.potentialMergeConflicts.push({
      file: filePath,
      issue: `Found ${duplicatedChunks.length} duplicated code chunks`,
      duplicateCount: duplicatedChunks.length,
    });
  }
}

/**
 * Check for basic syntax issues
 */
function checkForSyntaxIssues(filePath, content) {
  // Check for unbalanced braces
  const braces = content.match(/[{}]/g) || [];
  let braceCount = 0;

  for (const brace of braces) {
    if (brace === "{") braceCount++;
    else if (brace === "}") braceCount--;

    if (braceCount < 0) {
      issues.syntaxIssues.push({
        file: filePath,
        issue:
          "Unbalanced braces - closing brace without matching opening brace",
      });
      break;
    }
  }

  if (braceCount !== 0) {
    issues.syntaxIssues.push({
      file: filePath,
      issue: `Unbalanced braces - found ${braceCount} unclosed opening braces`,
    });
  }

  // Check for missing semicolons in non-comment lines
  const lines = content.split("\n");
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Track multi-line comments
    if (line.includes("/*")) inComment = true;
    if (line.includes("*/")) inComment = false;

    // Skip comments
    if (inComment || line.startsWith("//")) continue;

    // Check for lines that should end with semicolon but don't
    if (
      !line.endsWith(";") &&
      !line.endsWith("{") &&
      !line.endsWith("}") &&
      !line.endsWith(":") &&
      !line.startsWith("import") &&
      !line.startsWith("export") &&
      !line.includes("=>") &&
      line.length > 10
    ) {
      // Only flag if it looks like a statement (not a function declaration, object, etc.)
      if (line.includes("=") || line.includes("(") || line.includes(".")) {
        issues.syntaxIssues.push({
          file: filePath,
          issue: "Missing semicolon",
          line: i + 1,
          content: line,
        });
      }
    }
  }
}

/**
 * Display scan results
 */
function displayResults() {
  console.log("\n==== CODE BASE SCAN RESULTS ====\n");

  // Display duplicate functions
  console.log("DUPLICATE FUNCTIONS:");
  if (issues.duplicateFunctions.length === 0) {
    console.log("None found");
  } else {
    issues.duplicateFunctions.forEach((issue) => {
      console.log(`- ${issue.file}:`);
      issue.duplicates.forEach((dup) => {
        console.log(`  Function "${dup.name}" appears ${dup.count} times`);
      });
    });
  }

  console.log("\nLARGE FILES:");
  if (issues.largeFiles.length === 0) {
    console.log("None found");
  } else {
    issues.largeFiles.forEach((issue) => {
      console.log(`- ${issue.file}: ${issue.size}`);
    });
  }

  console.log("\nPOTENTIAL MERGE CONFLICTS:");
  if (issues.potentialMergeConflicts.length === 0) {
    console.log("None found");
  } else {
    issues.potentialMergeConflicts.forEach((issue) => {
      console.log(`- ${issue.file}: ${issue.issue}`);
    });
  }

  console.log("\nSYNTAX ISSUES:");
  if (issues.syntaxIssues.length === 0) {
    console.log("None found");
  } else {
    issues.syntaxIssues.forEach((issue) => {
      if (issue.line) {
        console.log(`- ${issue.file} (line ${issue.line}): ${issue.issue}`);
        if (issue.content) {
          console.log(`  "${issue.content}"`);
        }
      } else {
        console.log(`- ${issue.file}: ${issue.issue}`);
      }
    });
  }

  console.log("\n==== SCAN SUMMARY ====");
  console.log(
    `- Files with duplicate functions: ${issues.duplicateFunctions.length}`
  );
  console.log(
    `- Large files (>${SIZE_WARNING_KB}KB): ${issues.largeFiles.length}`
  );
  console.log(
    `- Files with potential merge conflicts: ${issues.potentialMergeConflicts.length}`
  );
  console.log(`- Files with syntax issues: ${issues.syntaxIssues.length}`);
}

// Main execution
console.log("Scanning code base for issues...");
scanDirectory(ROOT_DIR);
displayResults();
