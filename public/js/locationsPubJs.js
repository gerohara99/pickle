/* eslint-disable */
import "@babel/polyfill";
import axios from "axios";
import { showAlert } from "./alerts";

export const createLocationPubJs = async (
  locationName,
  locationNumCourts,
  locationCourtCapacty
) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/locations",
      data: {
        locationName,
        locationNumCourts,
        locationCourtCapacty,
      },
    });
    if (res.data.status === "success") {
      showAlert("success", "Location successfully created");

      window.setTimeout(() => {
        location.assign("/locations/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const updateLocationPubJs = async (
  locationId,
  locationName,
  locationNumCourts,
  locationCourtCapacty
) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/locations/${locationId}`,
      data: {
        locationName,
        locationNumCourts,
        locationCourtCapacty,
      },
    });
    if (res.status === 204) {
      showAlert("success", "Location successfully updated");

      window.setTimeout(() => {
        location.assign("/locations/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const deleteLocationPubJs = async (locationId) => {
  try {
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/locations/${locationId}`,
    });
    console.log(res.status);
    if (res.status === 204) {
      showAlert("success", "Location successfully deleted");

      window.setTimeout(() => {
        location.assign("/locations/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
