/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

export const forgotPasswordPubJs = async (data) => {
  try {
    const url = "/api/v1/users/forgotPassword";

    const res = await axios({
      method: "POST",
      url,
      data,
    });

    if (res.data.status === "success") {
      showAlert(
        "success",
        `${type.toUpperCase()} reset link sent to your email`
      );
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      showAlert("error", err.response.data.message);
    } else {
      showAlert("error", err.message || "An unexpected error occurred");
    }
  }
};
