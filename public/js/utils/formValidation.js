export function validateEventId(eventId, context = "operation") {
  if (
    !eventId ||
    eventId === "undefined" ||
    eventId === "null" ||
    eventId === null
  ) {
    console.error(`Invalid event ID for ${context}:`, eventId);
    return false;
  }
  return true;
}

export function extractFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

export function clearFormErrors(form) {
  const errorElements = form.querySelectorAll(".error-message");
  errorElements.forEach((el) => el.remove());

  const invalidFields = form.querySelectorAll(".invalid");
  invalidFields.forEach((field) => field.classList.remove("invalid"));
}
