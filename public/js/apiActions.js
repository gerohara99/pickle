/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

// --- Helper Functions ---
async function apiRequest({
  method,
  url,
  data,
  onSuccess,
  successMessage,
  redirect,
  reload,
}) {
  try {
    const res = await axios({ method, url, data });
    if (res.data?.status === "success" || res.status === 204) {
      if (successMessage) showAlert("success", successMessage);
      if (onSuccess) onSuccess(res);

      // Only one of redirect or reload will happen
      if (redirect === "userLoggingIn") {
        let landingPage;
        if (res.data.user.role === "clubAdmin") {
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
    return res;
  } catch (err) {
    handleError(err);
    throw err;
  }
}

function handleError(err) {
  if (err.response && err.response.data && err.response.data.message) {
    showAlert("error", err.response.data.message);
  } else {
    showAlert("error", err.message || "An unexpected error occurred");
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

export const eventCreateBookingApiAction = async (eventId) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/booking/create`,
    successMessage: "Booking successful",
    data: { eventId },
    reload: true,
  });

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
    await axios({ method: "GET", url: "/api/v1/users/logout" });
    window.location.assign("/");
  } catch (err) {
    showAlert("error", "Error logging out! Try again.");
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
