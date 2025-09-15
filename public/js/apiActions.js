/* eslint-disable */
// Use modern browser APIs directly instead of polyfills
import { showAlert } from "./alerts.js";
import { handleApiError } from "./utils/errorHandler.js";

// Export this function so it can be used by other modules
export async function apiRequest({
  method,
  url,
  data,
  onSuccess,
  successMessage,
  redirect,
  reload,
}) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);

    const responseData = await res.json();

    if (responseData?.status === "success" || res.status === 204) {
      if (successMessage) showAlert("success", successMessage);
      if (onSuccess) onSuccess(responseData);

      // Store user data in localStorage if we're logging in and have user data
      if (redirect === "userLoggingIn" && responseData.user) {
        localStorage.setItem("userData", JSON.stringify(responseData.user));

        let landingPage;
        if (responseData.user.role === "clubAdmin") {
          landingPage = "/events/showAll";
        } else {
          landingPage = "/events/myBrowse";
        }
        window.setTimeout(() => location.assign(landingPage), 1500);
      } else if (redirect) {
        window.setTimeout(() => location.assign(redirect), 1500);
      } else if (reload) {
        window.setTimeout(() => location.reload(), 1500);
      }
    }
    return responseData;
  } catch (err) {
    handleApiError(err, `${method} ${url}`);
    throw err;
  }
}

// --- User Actions ---
export const createUserApiAction = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm,
  active
) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users",
    data: { name, email, mobile, password, passwordConfirm, active },
    successMessage: "User successfully created",
    redirect: "/users/showall",
  });

export const editUserApiAction = async (userId, name, email, mobile, active) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/users/${userId}`,
    data: { name, email, mobile, active },
    successMessage: "User successfully updated",
    redirect: "/users/showall",
  });

export const deleteUserApiAction = async (userId) =>
  apiRequest({
    method: "DELETE",
    url: `/api/v1/users/${userId}`,
    successMessage: "User successfully deleted",
    redirect: "/users/showall",
  });

// --- Event Actions ---
export const createEventApiAction = async (data) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/events",
    data,
    successMessage: "Event successfully created",
    redirect: "/events/showAll",
  });

export const updateEventApiAction = async (data) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/${data.eventId}`,
    data,
    successMessage: "Event successfully updated",
    redirect: "/events/showAll",
  });

export const deleteEventApiAction = async (eventId) =>
  apiRequest({
    method: "DELETE",
    url: `/api/v1/events/${eventId}`,
    successMessage: "Event successfully deleted",
    redirect: "/events/showAll",
  });

export const eventCreateBookingApiAction = async (eventId) => {
  try {
    const response = await fetch(`/api/v1/events/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });

    if (!response.ok)
      throw new Error(`POST /api/v1/events/book failed: ${response.status}`);

    const responseData = await response.json();

    if (responseData?.status === "success") {
      showAlert("success", "Booking successful");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return responseData;
    }
    return null;
  } catch (err) {
    // Use centralized error handler instead of inline handling
    handleApiError(err, "booking");
    throw err;
  }
};

export const eventCancelBookingApiAction = async (eventId) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/booking/cancel`,
    successMessage: "Booking cancelled",
    data: { eventId },
    reload: true,
  });

export const eventUpdateMatchScoreApiAction = async (
  roundIndex,
  matchIndex,
  teamAScore,
  teamBScore,
  eventId
) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/updateMatchscore`,
    data: { roundIndex, matchIndex, teamAScore, teamBScore, eventId },
    successMessage: "Score updated",
    reload: true,
  });

export const markNoShowApiAction = async (eventId, userId) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/events/noShow",
    data: { eventId, userId },
    successMessage: "No show processed and schedule recalculated",
    reload: true,
  });

// --- Auth Actions ---
export const loginApiAction = async (email, password) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/login",
    data: { email, password },
    successMessage: "Logged in successfully!",
    redirect: "userLoggingIn",
  });

export const logOutApiAction = async () => {
  try {
    localStorage.removeItem("userSettings");
    localStorage.removeItem("userData");
    sessionStorage.clear();

    const response = await fetch("/api/v1/users/logout", {
      method: "GET",
      credentials: "include",
    });

    document.body.setAttribute("data-role", "");
    document.body.classList.remove("role-admin", "role-user", "role-clubadmin");

    window.location.href = "/?logout=success";
  } catch (err) {
    console.error("Logout error:", err);
    window.location.href = "/me/login";
  }
};

export const signUpApiAction = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm
) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/signup",
    data: { name, email, mobile, password, passwordConfirm },
    successMessage: "Signed up successfully!",
    redirect: "/events/browseNew",
  });

export const updateAcApiAction = async (data, type) =>
  apiRequest({
    method: "PATCH",
    url:
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateAcDetails",
    data,
    successMessage: "Update successful!",
    redirect: "/events/browseNew",
  });

// --- Password Actions ---
export const forgotPasswordApiAction = async ({ email }) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/forgotPassword",
    data: { email },
    successMessage: "Reset link sent to email!",
  });

export const resetPasswordApiAction = async ({
  password,
  passwordConfirm,
  resetToken,
}) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/users/resetPassword/${resetToken}`,
    data: { password, passwordConfirm },
    successMessage: "Password reset successful!",
    redirect: "/me/login",
  });

// --- Settings Actions ---
export const getSystemSettingsApiAction = async () =>
  apiRequest({
    method: "GET",
    url: "/api/v1/settings/get",
    onSuccess: () => {
      console.log("success system settings successfully retrieved");
    },
  });

export const manageSystemSettingsApiAction = async (data) =>
  apiRequest({
    method: "PATCH",
    url: "/api/v1/settings/update",
    data,
    successMessage: "Settings successfully saved",
    redirect: "/events/showAll",
  });
