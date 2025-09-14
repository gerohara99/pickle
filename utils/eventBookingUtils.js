import { showAlert } from "../../public/js/alerts.js";

export async function handleEventBooking({
  endpoint,
  eventId,
  successMsg,
  errorMsg,
  reloadDelay = 1500,
}) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const data = await response.json();
    if (response.ok) {
      showAlert("success", successMsg);
      setTimeout(() => window.location.reload(), reloadDelay);
    } else {
      showAlert("error", data.message || errorMsg);
    }
  } catch (err) {
    showAlert("error", "Something went wrong. Please try again.");
  }
}
