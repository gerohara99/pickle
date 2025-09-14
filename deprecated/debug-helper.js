/**
 * Debug helper for JavaScript module loading issues
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Debug script loaded");

  // Create a log display area
  const logDiv = document.createElement("div");
  logDiv.id = "debug-log";
  logDiv.style.backgroundColor = "#f0f0f0";
  logDiv.style.padding = "10px";
  logDiv.style.margin = "20px";
  logDiv.style.border = "1px solid #ccc";
  logDiv.style.borderRadius = "5px";
  logDiv.style.fontFamily = "monospace";
  logDiv.style.whiteSpace = "pre-wrap";

  document.body.appendChild(logDiv);

  // Function to log both to console and to our display
  function log(message) {
    console.log(message);
    const entry = document.createElement("div");
    entry.textContent = message;
    logDiv.appendChild(entry);
  }

  log("Debug info:");
  log(`User Agent: ${navigator.userAgent}`);

  // Test fetching and loading various JavaScript files
  const filesToTest = ["/js/login.js", "/js/apiActions.js", "/js/index.js"];

  filesToTest.forEach((file) => {
    fetch(file)
      .then((response) => {
        log(`Fetch ${file}: ${response.status} ${response.statusText}`);
        log(`Content-Type: ${response.headers.get("content-type")}`);
        return response.text();
      })
      .then((text) => {
        log(`Successfully loaded ${file} (${text.length} bytes)`);
      })
      .catch((error) => {
        log(`Error loading ${file}: ${error.message}`);
      });
  });

  // Test dynamic imports
  log("Testing dynamic imports...");
  try {
    import("/js/login.js")
      .then((module) => {
        log("Successfully imported login.js as a module");
      })
      .catch((error) => {
        log(`Failed to import login.js: ${error.message}`);
      });
  } catch (error) {
    log(`Error in import syntax: ${error.message}`);
  }
});
