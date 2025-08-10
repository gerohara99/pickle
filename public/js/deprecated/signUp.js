/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

export const signUp = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm
) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signup",
      data: {
        name,
        email,
        mobile,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Account successfully created");
      window.setTimeout(() => {
        location.assign("/events/showall");
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
