// api.js
// The CDN version of axios doesn't use ES module exports
// So we need to use it as a global variable
// No need to import it as it will be loaded via script tag

// Create a wrapper module around axios
const api = {
  request: function (options) {
    // Make sure axios is available
    if (typeof axios === "undefined") {
      console.error("Axios is not loaded! Check script loading in HTML.");
      throw new Error("Axios is not available");
    }

    return axios(options);
  },
};

// Configure axios defaults if available
if (typeof axios !== "undefined") {
  axios.defaults.withCredentials = true;
}

// Export our API wrapper
export default api;
