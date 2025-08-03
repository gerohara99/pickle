/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alerts";

export const getSystemSettingsPubJs = async () => {
  try {
    const res = await axios({
      method: "PATCH",
      url: "/api/v1/settings/get",
    });
    if (res.data.status === "success") {
      console.log("success system ettings successfully retrieved");
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const manageSystemSettingsPubJs = async (data) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: "/api/v1/settings/update",
      data: data,
    });
    if (res.data.status === "success") {
      showAlert("success", "Settings successfully saved");

      window.setTimeout(() => {
        location.assign("/events/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
