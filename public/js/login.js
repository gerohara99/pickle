/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "axios";
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
    showAlert("error", err.response.data.message);
  }
};

export const logout = async () => {
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
    showAlert("error", err.response.data.message);
  }
};
