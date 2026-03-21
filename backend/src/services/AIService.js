/**
 * AIService — AI-powered features via OpenAI gpt-4o-mini
 */

const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIService {
  /**
   * Score candidates 0-100 for compatibility with currentUser.
   * @param {object} currentUser  - { userId, skillLevel, eloRating, playStyle, location }
   * @param {object[]} candidates - same shape
   * @returns {{ matches: { userId, score, reason }[] }}
   */
  async getPartnerMatches(currentUser, candidates) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a padel partner matching algorithm. Always return valid JSON.',
          },
          {
            role: 'user',
            content: `Score each candidate player 0-100 for compatibility with the current player.
Scoring rules:
- Skill level gap < 0.5 → +30 points. Gap 0.5–1.0 → +15. Gap > 1.0 → -10
- Play style complement: aggressive + net-specialist → +25. Same style → +5
- Elo proximity (within 200) → +20
- Location match → +10

Current player: ${JSON.stringify({
              skillLevel: currentUser.skillLevel,
              eloRating: currentUser.eloRating,
              playStyle: currentUser.playStyle,
              location: currentUser.location,
            })}

Candidates: ${JSON.stringify(
              candidates.map((c) => ({
                userId: c.userId,
                skillLevel: c.skillLevel,
                eloRating: c.eloRating,
                playStyle: c.playStyle,
                location: c.location,
                name: c.name,
              }))
            )}

Return: {"matches":[{"userId":"...","score":94,"reason":"One sentence why they are compatible"}]}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error('AIService.getPartnerMatches failed:', err.message);
      // Fallback: rank by Elo proximity
      return {
        matches: candidates
          .map((c) => ({
            userId: c.userId,
            score: Math.max(40, 100 - Math.abs(c.eloRating - currentUser.eloRating) / 4),
            reason: 'Similar Elo rating',
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      };
    }
  }

  /**
   * Return top 5 best-value slots for a club.
   * @param {string}   clubName
   * @param {object[]} slots - { time, price, isPeak, status }
   * @returns {{ recommendations: { time, price, reason }[] }}
   */
  async getPriceOracle(clubName, slots) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a court booking price advisor. Always return valid JSON.',
          },
          {
            role: 'user',
            content: `Rank the top 5 best-value upcoming court slots for ${clubName}.
Prefer: lower price, weekday mornings, non-peak hours.

Available slots: ${JSON.stringify(
              slots.slice(0, 40).map((s) => ({
                time: s.time,
                price: s.price,
                isPeak: s.isPeak,
                status: s.status,
              }))
            )}

Return: {"recommendations":[{"time":"ISO string","price":8,"reason":"One sentence why this is good value"}]}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.2,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error('AIService.getPriceOracle failed:', err.message);
      const sorted = slots.filter((s) => s.status === 'available').sort((a, b) => a.price - b.price);
      return {
        recommendations: sorted.slice(0, 5).map((s) => ({
          time: s.time,
          price: s.price,
          reason: 'Lowest available price',
        })),
      };
    }
  }

  /**
   * Suggest the single best slot for this user this week.
   * @param {object}   userStats
   * @param {string[]} partnerNames
   * @param {object[]} availableSlots
   * @returns {{ slot: { time, courtName, clubName, price, headline, reason } }}
   */
  async getSmartSuggestion(userStats, partnerNames, availableSlots) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a padel scheduling assistant. Always return valid JSON.',
          },
          {
            role: 'user',
            content: `Suggest the single best court slot for this player this week.
Player history: ${JSON.stringify(userStats)}
Regular partners available: ${JSON.stringify(partnerNames)}
Available slots (next 7 days): ${JSON.stringify(
              availableSlots.slice(0, 20).map((s) => ({
                time: s.time,
                courtName: s.courtName,
                clubName: s.clubName,
                price: s.price,
                isPeak: s.isPeak,
              }))
            )}

Return: {"slot":{"time":"ISO string","courtName":"...","clubName":"...","price":8,"headline":"Short punchy headline like 'Book Thursday 7 AM — save 40%'","reason":"One sentence explanation"}}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.4,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error('AIService.getSmartSuggestion failed:', err.message);
      const cheap = availableSlots
        .filter((s) => s.status === 'available')
        .sort((a, b) => a.price - b.price)[0];
      return {
        slot: {
          ...(cheap || {}),
          headline: 'Best available slot this week',
          reason: 'Lowest price in the next 7 days',
        },
      };
    }
  }
}

module.exports = new AIService();
