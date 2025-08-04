/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "axios";
import { showAlert } from "./alerts";

// type is either 'password' or 'data'
export const updateAc = async (data, type) => {
  try {
    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateAcDetails";

    const res = await axios({
      method: "PATCH",
      url,
      data,
    });

    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
