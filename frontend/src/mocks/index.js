export const mockUser = {
  id: 'user-1', name: 'Alex Popescu', email: 'alex@courtiq.com',
  stats: { wins: 14, losses: 6, loyaltyTotal: 1240 },
};

export const mockClubs = [
  {
    id: 'club-1', name: 'Padel Arena Bucharest', address: 'Str. Victoriei 12', city: 'Bucharest', lat: 44.4268, lng: 26.1025,
    imageUrl: '/src/assets/padel1.jpg',
    courts: [
      { id: 'court-1', name: 'Court 1', surface: 'artificial_grass', indoor: false },
      { id: 'court-2', name: 'Court 2', surface: 'artificial_grass', indoor: true },
    ]
  },
  {
    id: 'club-2', name: 'Smash Club', address: 'Bd. Unirii 40', city: 'Bucharest', lat: 44.4189, lng: 26.1052,
    imageUrl: '/src/assets/padel2.webp',
    courts: [{ id: 'court-3', name: 'Court 1', surface: 'artificial_grass', indoor: false }]
  },
];

export const mockSlots = [
  { id: 's1', courtId: 'court-1', startTime: '2026-03-21T10:00:00', endTime: '2026-03-21T11:00:00', isPeak: false, basePrice: 20, creditCost: 1, status: 'available' },
  { id: 's2', courtId: 'court-1', startTime: '2026-03-21T11:00:00', endTime: '2026-03-21T12:00:00', isPeak: false, basePrice: 20, creditCost: 1, status: 'available' },
  { id: 's3', courtId: 'court-1', startTime: '2026-03-21T18:00:00', endTime: '2026-03-21T19:00:00', isPeak: true, basePrice: 30, creditCost: 1.5, status: 'available' },
  { id: 's4', courtId: 'court-1', startTime: '2026-03-21T19:00:00', endTime: '2026-03-21T20:00:00', isPeak: true, basePrice: 30, creditCost: 1.5, status: 'booked' },
];

export const mockBookings = [
  {
    id: 'b1', startTime: '2026-03-21T18:30:00', status: 'confirmed', creditsUsed: 3, result: 'win',
    court: { name: 'Court 3', club: { name: 'Padel City Arena' } }
  },
  {
    id: 'b2', startTime: '2026-03-18T09:00:00', status: 'confirmed', creditsUsed: 2, result: 'loss',
    court: { name: 'Court 1', club: { name: 'Smash Club' } }
  },
];

export const mockPass = {
  tier: 'pro', creditsRemaining: 18, creditsTotal: 20,
  perks: ['Unlimited clubs', 'Peak access', 'Guest passes ×2', 'AI features'],
};

export const mockLoyalty = {
  points: 1240, tier: 'silver', nextTier: 'gold', pointsToNext: 760,
};

export const mockPartnerMatches = [
  {
    userId: 'u2', score: 94, reason: 'Similar aggressive baseline style, same availability windows',
    profile: { name: 'Mihai Ionescu', skillLevel: 4.2, playStyle: 'Aggressive', location: 'Sector 2' }
  },
  {
    userId: 'u3', score: 87, reason: 'Complementary net game, matched Elo rating',
    profile: { name: 'Radu Constantin', skillLevel: 3.8, playStyle: 'Defensive', location: 'Sector 1' }
  },
];

export const mockAiSuggestion = {
  headline: 'Court 2 · Tomorrow 18:00 — Your peak performance window',
  reason: 'Based on your last 8 matches, you win 78% of evening games on indoor courts.',
};