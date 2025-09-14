// Simple server to serve static HTML files for testing
const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the views directory
app.use(express.static(path.join(__dirname, "views")));

// Also serve CSS, JS, and images from the public directory
app.use(express.static(path.join(__dirname, "public")));

// For any other routes, serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "homepage.html"));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`HTML test server running at http://localhost:${PORT}`);
  console.log(`Available pages to test:`);
  console.log(`- Homepage: http://localhost:${PORT}/homepage.html`);
  console.log(`- Login: http://localhost:${PORT}/login.html`);
  console.log(`- Sign Up: http://localhost:${PORT}/signup.html`);
  console.log(`- Browse Events: http://localhost:${PORT}/browseNewEvents.html`);
  console.log(`- My Schedule: http://localhost:${PORT}/viewMySchedule.html`);
  console.log(
    `- Master Schedule: http://localhost:${PORT}/viewMasterSchedule.html`
  );
  console.log(`- All Events: http://localhost:${PORT}/showAllEvents.html`);
  console.log(`- Create Event: http://localhost:${PORT}/createEvent.html`);
  console.log(`- My Account: http://localhost:${PORT}/myAccountDetails.html`);
});
