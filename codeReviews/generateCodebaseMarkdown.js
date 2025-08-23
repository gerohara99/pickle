const fs = require("fs");
const path = require("path");
const ignore = require("ignore");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "codeReviews");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "codebase.md");
const FILES_INCLUDED = path.join(OUTPUT_DIR, "filesIncluded.md");
const MAX_FILE_SIZE = 1048576; // 1 MB

// Additional ignore patterns
const EXTRA_IGNORES = [
  "dev-data/",
  "dump/",
  "data/",
  "prototype",
  "public/img/",
  "vite.config.js",
  "vscode-setup.md",
  ".DS_Store",
  ".parcelgnore",
  "brochure.html",
  "codeReviews/generateCodebaseMarkdown.js",
  "package.json",
  "package-lock.json",
  "public/.DS_Store",
  "public/css/.DS_Store",
  "views/.DS_Store",
];

// Load .gitignore
const gitignorePath = path.join(PROJECT_ROOT, ".gitignore");
const ig = ignore();
if (fs.existsSync(gitignorePath)) {
  ig.add(fs.readFileSync(gitignorePath).toString());
}
ig.add(EXTRA_IGNORES);

// Recursively walk the directory, excluding .git, .gitignore, and extra ignores
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const relPath = path.relative(PROJECT_ROOT, path.join(dir, file));
    // Exclude .gitignore, .git, and any subdirectory or file under .git/
    if (
      relPath === ".gitignore" ||
      relPath === ".git" ||
      relPath.startsWith(".git/")
    )
      return;
    if (ig.ignores(relPath)) return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push({ path: relPath, size: stat.size });
    }
  });
  return results;
}

// Main
function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  const files = walk(PROJECT_ROOT);

  // Write filesIncluded.md
  let filesMd = `# Files Included for Codebase Review\n\n`;
  filesMd += `| File Path | Size (bytes) |\n|-----------|--------------|\n`;
  files.forEach(({ path: relPath, size }) => {
    if (size > MAX_FILE_SIZE) return;
    filesMd += `| ${relPath} | ${size} |\n`;
  });
  fs.writeFileSync(FILES_INCLUDED, filesMd, "utf8");

  // Write codebase.md
  let md = `# Codebase Review\n\n`;
  files.forEach(({ path: relPath, size }) => {
    if (size > MAX_FILE_SIZE) {
      md += `## ${relPath}\n\n*File too large to include (size: ${size} bytes)*\n\n`;
      return;
    }
    md += `## ${relPath}\n\n`;
    md += `*Size: ${size} bytes*\n\n`;
    const ext = path.extname(relPath).slice(1) || "";
    try {
      const content = fs.readFileSync(path.join(PROJECT_ROOT, relPath), "utf8");
      md += `\`\`\`${ext}\n${content}\n\`\`\`\n\n`;
    } catch (e) {
      md += `*Could not read file: ${e.message}*\n\n`;
    }
  });

  fs.writeFileSync(OUTPUT_FILE, md, "utf8");
  console.log(`Codebase markdown generated at ${OUTPUT_FILE}`);
  console.log(`Files included list generated at ${FILES_INCLUDED}`);
}

main();
