// Official Skull King scoring.
//
// Base (bid) score:
//   - Exact non-zero bid:  +20 per trick bid (20 × bid)
//   - Exact zero bid:      +10 × round number
//   - Missed non-zero bid: -10 per trick over/under (-10 × |bid − taken|)
//   - Missed zero bid:     -10 × round number
//
// Bonus points are only awarded if the player hits their bid EXACTLY. Bonuses
// come from cards captured in tricks the player won (see calculateTrickBonus).

export function calculateBidScore(bid, tricksTaken, round) {
  if (bid === tricksTaken) {
    return bid === 0 ? 10 * round : 20 * bid;
  }
  return bid === 0 ? -10 * round : -10 * Math.abs(bid - tricksTaken);
}

// Bonus earned by the winner of a single completed trick, ignoring the bid gate
// (the gate is applied later in calculateRoundScore). `trick` is the ordered
// array of { playerId, card }; `winningCard` is the card that won it.
export function calculateTrickBonus(winningCard, trick) {
  let bonus = 0;
  for (const { card } of trick) {
    if (card.type === 'numbered' && card.rank === 14) {
      bonus += card.isTrump ? 20 : 10; // black 14 = +20, colored 14 = +10
    }
  }
  if (winningCard.type === 'skull_king') {
    const pirates = trick.filter(t => t.card.type === 'pirate').length;
    bonus += pirates * 30; // Skull King captures each Pirate
  }
  if (winningCard.type === 'mermaid') {
    const caughtSkullKing = trick.some(t => t.card.type === 'skull_king');
    if (caughtSkullKing) bonus += 40; // Mermaid captures the Skull King
  }
  return bonus;
}

// Final round score for a player: base bid score, plus accumulated trick bonus
// ONLY if the bid was hit exactly.
export function calculateRoundScore(bid, tricksTaken, roundBonus, round) {
  const base = calculateBidScore(bid, tricksTaken, round);
  const bonus = bid === tricksTaken ? roundBonus : 0;
  return base + bonus;
}
