// scripts/error_handler.js
const ErrorHandler = (() => {
  "use strict";

  /**
   * Creates a standardized error object.
   * @param {string} message - A descriptive error message.
   * @returns {{success: false, error: string}}
   */
  const createError = (message) => ({
    success: false,
    error: message,
  });

  /**
   * Creates a standardized success object.
   * @param {*} [data=null] - The payload to return on success.
   * @param {object} [options={}] - Additional options for the success object.
   * @returns {{success: true, data: *, ...options}}
   */
  const createSuccess = (data = null, options = {}) => ({
    success: true,
    data: data,
    ...options,
  });

  return {
    createError,
    createSuccess,
  };
})();
