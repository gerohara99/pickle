// Script to check if role-based filtering is being applied

const adminSessionCheck = async () => {
  try {
    // First, check the debug endpoint to see if events exist
    const debugResponse = await fetch("/api/debug/events");
    const debugData = await debugResponse.json();
    console.log("Debug events data:", debugData);

    // Now check the admin events endpoint
    const adminResponse = await fetch("/api/v1/events");
    const adminData = await adminResponse.json();
    console.log("Admin events data:", adminData);

    // Let's also check if there's anything in the session that might be filtering
    const roleResponse = await fetch("/api/debug/session");
    const roleData = await roleResponse.json();
    console.log("Session data:", roleData);

    // Check if the user is actually authenticated
    const authCheck = await fetch("/api/debug/auth-check");
    const authData = await authCheck.json();
    console.log("Auth check:", authData);
  } catch (err) {
    console.error("Error in admin session check:", err);
  }
};

// Execute the check
adminSessionCheck();
