/* eslint-disable */
import "@babel/polyfill";
import axios from "axios";
import { showAlert } from "./alerts";

export const createEventPubJs = async (
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
        location.assign("/events/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const updateEventPubJs = async (
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
        location.assign("/events/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const deleteEventPubJs = async (eventId) => {
  try {
    const res = await axios({
      method: "DELETE",
      url: `/api/v1/events/${eventId}`,
    });
    console.log(res.status);
    if (res.status === 204) {
      showAlert("success", "Event successfully deleted");

      window.setTimeout(() => {
        location.assign("/events/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const eventCreateBookingPubJs = async (
  eventId,
  eventBookings,
  numPlayers
) => {
  try {
    console.log("hithere");
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/events/bookingd/create`,
      data: {
        eventId,
        eventBookings,
        numPlayers,
      },
    });
    if (res.status === 204) {
      showAlert("success", "Booking successfully created");

      window.setTimeout(() => {
        location.assign("/events/showAll");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
