/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "axios";
import { showAlert } from "./alerts";

export const resetPasswordPubJs = async (data) => {
  try {
    const url = "/api/v1/users/passwordReset";

    const res = await axios({
      method: "PATCH",
      url,
      data,
    });

    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} password successfully reset`);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
