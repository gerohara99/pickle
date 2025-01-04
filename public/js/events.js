/* eslint-disable */
import "@babel/polyfill";
import axios from "axios";
import { showAlert } from "./alerts";

export const createEvent = async (
  eventName,
  eventDate,
  eventStartTime,
  eventLocation
) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/events",
      data: {
        eventName,
        eventDate,
        eventStartTime,
        eventLocation,
      },
    });
    if (res.data.status === "success") {
      showAlert("success", "Event successfully created");

      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const updateEvent = async (
  eventId,
  eventName,
  eventDate,
  eventStartTime,
  eventLocation
) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/events/${eventId}`,
      data: {
        eventName,
        eventDate,
        eventStartTime,
        eventLocation,
      },
    });
    if (res.status === 204) {
      showAlert("success", "Event successfully updated");

      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const deleteEvent = async (eventId) => {
  try {
    console.log(eventId);
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/events/${eventId}`,
    });
    console.log(res.status);
    if (res.status === 204) {
      showAlert("success", "Event successfully deleted");

      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
