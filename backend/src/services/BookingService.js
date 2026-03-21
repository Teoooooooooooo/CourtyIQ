/**
 * BookingService — handles court availability and pricing logic
 */

class BookingService {
  /**
   * Check if a court is available for the given time range
   * @param {string} courtId
   * @param {Date} startTime
   * @param {Date} endTime
   * @returns {boolean} availability
   */
  async checkAvailability(courtId, startTime, endTime) {
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Compute the total price for a booking, considering peak hours and credits
   * @param {string} courtId
   * @param {Date} startTime
   * @param {Date} endTime
   * @param {number} creditsUsed
   * @returns {number} totalPrice
   */
  async computePrice(courtId, startTime, endTime, creditsUsed = 0) {
    // TODO: implement
    throw new Error('Not implemented');
  }
}

module.exports = new BookingService();
