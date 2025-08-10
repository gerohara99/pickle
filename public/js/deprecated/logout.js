/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

export const logOut = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/logout",
    });
    if (res.data.status === "success") {
      showAlert("success", "Logged out successfully");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      showAlert("error", err.response.data.message);
    } else {
      showAlert("error", err.message || "An unexpected error occurred");
    }
  }
};
