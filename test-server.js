const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/includes", express.static(path.join(__dirname, "public/includes")));

// Simple route to test HTML serving
app.get("/test", (req, res) => {
  const htmlPath = path.join(__dirname, "views", "login.html");

  if (fs.existsSync(htmlPath)) {
    console.log(`HTML file exists: ${htmlPath}`);
    res.sendFile(htmlPath);
  } else {
    console.log(`HTML file does not exist: ${htmlPath}`);
    res.status(404).send("File not found");
  }
});

// Serve HTML includes
app.get("/test-includes", (req, res) => {
  const htmlPath = path.join(__dirname, "public/includes", "header.html");

  if (fs.existsSync(htmlPath)) {
    console.log(`Include file exists: ${htmlPath}`);
    res.sendFile(htmlPath);
  } else {
    console.log(`Include file does not exist: ${htmlPath}`);
    res.status(404).send("Include file not found");
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Views directory: ${path.join(__dirname, "views")}`);
  console.log(`Includes directory: ${path.join(__dirname, "public/includes")}`);

  // List HTML files
  try {
    const viewsDir = path.join(__dirname, "views");
    const includesDir = path.join(__dirname, "public/includes");

    console.log("\nHTML files in views directory:");
    fs.readdirSync(viewsDir)
      .filter((file) => file.endsWith(".html"))
      .forEach((file) => console.log(`- ${file}`));

    console.log("\nHTML files in includes directory:");
    fs.readdirSync(includesDir)
      .filter((file) => file.endsWith(".html"))
      .forEach((file) => console.log(`- ${file}`));
  } catch (err) {
    console.error("Error listing files:", err);
  }
});
