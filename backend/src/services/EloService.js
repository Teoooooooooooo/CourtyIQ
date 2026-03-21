/**
 * EloService — handles Elo rating calculations for padel matches
 */

class EloService {
  /**
   * Update Elo ratings for both teams after a match
   * @param {Array} team1Ids - player IDs on team 1
   * @param {Array} team2Ids - player IDs on team 2
   * @param {number} winnerTeam - 1 or 2
   * @returns {Object} eloDelta - map of playerId -> rating change
   */
  async updateRatings(team1Ids, team2Ids, winnerTeam) {
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Calculate win probability for team1 vs team2
   * @param {number} rating1 - average Elo of team 1
   * @param {number} rating2 - average Elo of team 2
   * @returns {number} probability between 0 and 1
   */
  winProbability(rating1, rating2) {
    // TODO: implement
    throw new Error('Not implemented');
  }
}

module.exports = new EloService();
