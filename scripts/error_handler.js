// scripts/error_handler.js
class ErrorHandler {
  /**
   * Creates a standardized error object.
   * @param {string} message - A descriptive error message.
   * @returns {{success: false, error: string}}
   */
  static createError(message) {
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Creates a standardized success object.
   * @param {*} [data=null] - The payload to return on success.
   * @param {object} [options={}] - Additional options for the success object.
   * @returns {{success: true, data: *, ...options}}
   */
  static createSuccess(data = null, options = {}) {
    return {
      success: true,
      data: data,
      ...options,
    };
  }
}