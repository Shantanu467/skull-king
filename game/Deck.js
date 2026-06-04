// Official Skull King deck and trick-resolution rules.
//
// Suits: three colored "number" suits (parrot/green, chest/yellow, map/purple)
// numbered 1-14, plus a black "Jolly Roger" trump suit numbered 1-14 that beats
// every colored suit. Special cards: 5 Escapes (always lose), 5 Pirates,
// 2 Mermaids, 1 Skull King.

export const COLORED_SUITS = ['green', 'yellow', 'purple'];
export const TRUMP_SUIT = 'black';
export const SUITS = [...COLORED_SUITS, TRUMP_SUIT];

export function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 14; rank++) {
      cards.push({
        suit,
        rank,
        type: 'numbered',
        isTrump: suit === TRUMP_SUIT,
        id: `${suit}-${rank}`,
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    cards.push({ suit: 'special', type: 'escape', id: `escape-${i}` });
  }
  for (let i = 0; i < 5; i++) {
    cards.push({ suit: 'special', type: 'pirate', id: `pirate-${i}` });
  }
  for (let i = 0; i < 2; i++) {
    cards.push({ suit: 'special', type: 'mermaid', id: `mermaid-${i}` });
  }
  cards.push({ suit: 'special', type: 'skull_king', id: 'skull-king' });
  // White Whale: when played, all special cards lose their powers and the
  // highest NUMBERED card wins regardless of suit; if no number cards were
  // played, the trick has no winner.
  cards.push({ suit: 'special', type: 'white_whale', id: 'white-whale' });
  return cards;
}

export function shuffleDeck(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// The led suit is set by the first NUMBERED card played in the trick. Special
// cards (escape/pirate/mermaid/skull king) never set the led suit.
export function getLedSuit(trick) {
  for (const play of trick) {
    if (play.card.type === 'numbered') return play.card.suit;
  }
  return null;
}

// A play is legal if: it's a special card (always allowed), OR the player holds
// no card of the led suit, OR the card matches the led suit. With no led suit
// yet (player is leading, or only specials/escapes played so far) anything goes.
export function isLegalPlay(card, hand, ledSuit) {
  if (card.type !== 'numbered') return true;
  if (!ledSuit) return true;
  if (card.suit === ledSuit) return true;
  const hasLedSuit = hand.some(c => c.type === 'numbered' && c.suit === ledSuit);
  return !hasLedSuit;
}

// Highest numbered card in a list of plays (first played wins ties), or null.
function highestNumbered(plays) {
  let best = null;
  for (const t of plays) {
    if (t.card.type !== 'numbered') continue;
    if (!best || t.card.rank > best.card.rank) best = t;
  }
  return best;
}

// Decide the winning play of a completed trick. `trick` is an ordered array of
// { playerId, card }. Returns the winning entry, or `null` if no one wins the
// trick (only possible with the White Whale and no numbered cards).
//
// Hierarchy (official):
//   - White Whale present -> specials are powerless; highest NUMBERED card wins
//     regardless of suit; no numbered cards -> no winner.
//   - Mermaid present together with the Skull King  -> first Mermaid wins
//   - Skull King present                            -> Skull King wins
//   - Any Pirate present                            -> first Pirate wins
//   - Any Mermaid present                           -> first Mermaid wins
//   - Otherwise number cards: highest trump (black) wins; else highest card of
//     the led suit wins. (Off-suit non-trump cards cannot win.)
//   - All escapes / nothing else -> the first card played (the leader) wins.
export function resolveTrick(trick) {
  const find = pred => trick.find(t => pred(t.card));

  if (trick.some(t => t.card.type === 'white_whale')) {
    return highestNumbered(trick); // null when no numbered cards were played
  }

  const skullKing = find(c => c.type === 'skull_king');
  const firstMermaid = find(c => c.type === 'mermaid');
  const firstPirate = find(c => c.type === 'pirate');

  if (skullKing && firstMermaid) return firstMermaid;
  if (skullKing) return skullKing;
  if (firstPirate) return firstPirate;
  if (firstMermaid) return firstMermaid;

  // Only numbered cards and/or escapes remain.
  const ledSuit = getLedSuit(trick);
  const numbered = trick.filter(t => t.card.type === 'numbered');
  if (numbered.length === 0) return trick[0]; // all escapes -> leader wins

  const trumps = numbered.filter(t => t.card.isTrump);
  const pool = trumps.length > 0
    ? trumps
    : numbered.filter(t => t.card.suit === ledSuit);
  if (pool.length === 0) return trick[0];

  let winner = pool[0];
  for (const t of pool) {
    if (t.card.rank > winner.card.rank) winner = t;
  }
  return winner;
}

// Total cards available; used to cap cards-per-round for large player counts.
export const DECK_SIZE = createDeck().length;

export function calculateMaxRounds(playerCount) {
  // Standard game is 10 rounds (round N deals N cards). With many players a late
  // round could exceed the deck, so cap so every player can be dealt a full hand.
  const maxByDeck = Math.floor(DECK_SIZE / playerCount);
  return Math.min(10, maxByDeck);
}
