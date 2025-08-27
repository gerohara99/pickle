/**
 * Script Injector
 *
 * This helper adds required scripts and importmaps to HTML files
 * for proper ES module support.
 */

const fs = require("fs").promises;

/**
 * Adds external scripts and import map to HTML file content
 * @param {string} htmlContent - Original HTML content
 * @returns {string} - HTML content with scripts added
 */
const injectImportMap = (htmlContent) => {
  // Check if our scripts are already injected
  if (htmlContent.includes("<!-- RallyPoint External Scripts -->")) {
    return htmlContent;
  }

  // Scripts to inject - load axios as a global before any modules
  const scriptsToInject = `
    <!-- RallyPoint External Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js"></script>`;

  // Insert scripts before the first script tag or before </head>
  if (htmlContent.includes("<script")) {
    return htmlContent.replace(/(<script)/i, `${scriptsToInject}\n    $1`);
  } else if (htmlContent.includes("</head>")) {
    return htmlContent.replace("</head>", `    ${scriptsToInject}\n  </head>`);
  }

  // If we can't find a good insertion point, just return the original
  return htmlContent;
};

module.exports = {
  injectImportMap,
};
