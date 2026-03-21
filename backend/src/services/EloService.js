/**
 * EloService — Elo rating calculations for padel matches
 */

const K = 32;

class EloService {
  /**
   * Expected score for ratingA against ratingB (0–1)
   */
  expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Update ratings after a match.
   * @param {number[]} winnersRatings - array of 2 ratings
   * @param {number[]} losersRatings  - array of 2 ratings
   * @returns {{ winnerDelta: number, loserDelta: number }}
   */
  updateRatings(winnersRatings, losersRatings) {
    const avgWinner = winnersRatings.reduce((a, b) => a + b, 0) / winnersRatings.length;
    const avgLoser = losersRatings.reduce((a, b) => a + b, 0) / losersRatings.length;
    const expected = this.expectedScore(avgWinner, avgLoser);
    const delta = Math.round(K * (1 - expected));
    return { winnerDelta: delta, loserDelta: -delta };
  }

  /**
   * Win probability as integer percentage (0–100).
   */
  winProbability(ratingA, ratingB) {
    return Math.round(this.expectedScore(ratingA, ratingB) * 100);
  }
}

module.exports = new EloService();
