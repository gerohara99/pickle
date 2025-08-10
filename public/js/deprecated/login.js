/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login",
      data: {
        email,
        password,
      },
    });
    if (res.data.status === "success") {
      let landingPage = "";

      showAlert("success", "Logged in successfully");
      if (res.data.user.role === "clubAdmin") {
        landingPage = "/events/showAll";
      } else {
        landingPage = "/events/myBrowse";
      }

      window.setTimeout(() => {
        location.assign(landingPage);
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
