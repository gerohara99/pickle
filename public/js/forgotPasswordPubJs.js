/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "axios";
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
    showAlert("error", err.response.data.message);
  }
};
