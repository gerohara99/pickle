const path = require("path");
const fs = require("fs");

// Check if login.html exists
const loginPath = path.join(__dirname, "views", "login.html");
console.log(`Checking for login.html at: ${loginPath}`);
console.log(`File exists: ${fs.existsSync(loginPath)}`);

// Try to read it
if (fs.existsSync(loginPath)) {
  const content = fs.readFileSync(loginPath, "utf8");
  console.log(`File size: ${content.length} bytes`);
  console.log(`First 100 chars: ${content.substring(0, 100)}`);
}

// Check if Pug file exists
const pugPath = path.join(__dirname, "views", "login.pug");
console.log(`\nChecking for login.pug at: ${pugPath}`);
console.log(`File exists: ${fs.existsSync(pugPath)}`);

// Check if directHtmlController.js is properly configured
const controllerPath = path.join(
  __dirname,
  "controllers",
  "directHtmlController.js"
);
console.log(`\nChecking directHtmlController.js at: ${controllerPath}`);
console.log(`File exists: ${fs.existsSync(controllerPath)}`);

if (fs.existsSync(controllerPath)) {
  const content = fs.readFileSync(controllerPath, "utf8");
  console.log(
    `Controller contains serveHtmlMiddleware: ${content.includes("serveHtmlMiddleware")}`
  );
  console.log(
    `Controller contains serveHtmlWithData: ${content.includes("serveHtmlWithData")}`
  );
}
