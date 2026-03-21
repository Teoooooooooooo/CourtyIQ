/**
 * EloService unit tests — pure math, no DB required
 */

const EloService = require('../src/services/EloService');

describe('EloService', () => {
    describe('expectedScore', () => {
        it('returns 0.5 for equal ratings', () => {
            expect(EloService.expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
        });

        it('returns > 0.5 when ratingA > ratingB', () => {
            expect(EloService.expectedScore(1200, 1000)).toBeGreaterThan(0.5);
        });

        it('returns < 0.5 when ratingA < ratingB', () => {
            expect(EloService.expectedScore(800, 1000)).toBeLessThan(0.5);
        });

        it('is symmetric: E(A,B) + E(B,A) === 1', () => {
            const a = EloService.expectedScore(1100, 900);
            const b = EloService.expectedScore(900, 1100);
            expect(a + b).toBeCloseTo(1, 5);
        });
    });

    describe('winProbability', () => {
        it('returns 50 for equal ratings', () => {
            expect(EloService.winProbability(1000, 1000)).toBe(50);
        });

        it('returns a value between 0 and 100', () => {
            const p = EloService.winProbability(1400, 600);
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(100);
        });

        it('is symmetric: P(A,B) + P(B,A) === 100', () => {
            const a = EloService.winProbability(1150, 1000);
            const b = EloService.winProbability(1000, 1150);
            expect(a + b).toBe(100);
        });

        it('higher rating gives higher probability', () => {
            expect(EloService.winProbability(1200, 1000)).toBeGreaterThan(50);
        });
    });

    describe('updateRatings', () => {
        it('winner gains points, loser loses points', () => {
            const { winnerDelta, loserDelta } = EloService.updateRatings([1000, 1000], [1000, 1000]);
            expect(winnerDelta).toBeGreaterThan(0);
            expect(loserDelta).toBeLessThan(0);
        });

        it('deltas are equal magnitude and opposite sign', () => {
            const { winnerDelta, loserDelta } = EloService.updateRatings([1000, 1000], [1000, 1000]);
            expect(winnerDelta + loserDelta).toBe(0);
        });

        it('weaker winner gains more points', () => {
            // Weak team beats strong team → bigger surprise → bigger delta
            const { winnerDelta: deltaWeakWins } = EloService.updateRatings([800, 800], [1200, 1200]);
            const { winnerDelta: deltaStrongWins } = EloService.updateRatings([1200, 1200], [800, 800]);
            expect(deltaWeakWins).toBeGreaterThan(deltaStrongWins);
        });

        it('returns integer deltas', () => {
            const { winnerDelta, loserDelta } = EloService.updateRatings([1050, 950], [1000, 1000]);
            expect(Number.isInteger(winnerDelta)).toBe(true);
            expect(Number.isInteger(loserDelta)).toBe(true);
        });
    });
});
