/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

export const createUserPubJs = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm
) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users",
      data: {
        name,
        email,
        mobile,
        password,
        passwordConfirm,
      },
    });
    if (res.data.status === "success") {
      showAlert("success", "User successfully created");

      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const updateUserPubJs = async (userId, name, email, mobile) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/users/${userId}`,
      data: {
        name,
        email,
        mobile,
      },
    });
    if (res.status === 204) {
      showAlert("success", "User successfully updated");

      window.setTimeout(() => {
        location.assign("/users/showall");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const deleteUserPubJs = async (userId) => {
  try {
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/users/${userId}`,
    });
    if (res.status === 204) {
      showAlert("success", "User successfully deleted");

      window.setTimeout(() => {
        location.assign("/users/showall");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
