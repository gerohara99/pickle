/* eslint-disable */
import "@babel/polyfill";
import axios from "axios";
import { showAlert } from "./alerts";

export const createEventPubJs = async (
  eventName,
  eventDate,
  eventStartTime,
  eventOrganiser
) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/events",
      data: {
        eventName,
        eventDate,
        eventStartTime,
        eventOrganiser,
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
  eventOrganiser
) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/events/${eventId}`,
      data: {
        eventName,
        eventDate,
        eventStartTime,
        eventOrganiser,
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

export const eventCreateBookingPubJs = async (eventId) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/events/booking/create`,
      data: { eventId },
    });
    if (res.status === 200) {
      showAlert("success", "Booking successfully created");

      window.setTimeout(() => {
        location.assign("/events/myBrowse");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const eventCancelBookingPubJs = async (eventId) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/events/booking/cancel`,
      data: { eventId },
    });
    if (res.status === 200) {
      showAlert("success", "Booking successfully cancelled");

      window.setTimeout(() => {
        location.assign("/events/myBrowse");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
