/**
 * Script Injector
 *
 * This helper adds required scripts and importmaps to HTML files
 * for proper ES module support.
 */

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

  // No scripts to inject since axios is removed
  // If you need to inject other scripts, add them here
  // For now, just return the original content
  return htmlContent;
};

module.exports = {
  injectImportMap,
};
