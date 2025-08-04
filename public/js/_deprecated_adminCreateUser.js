/* eslint-disable */
import axios from "./api";
import { showAlert } from "./alerts";

export const adminCreateUser = async (
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
        location.assign("/users/showall");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
