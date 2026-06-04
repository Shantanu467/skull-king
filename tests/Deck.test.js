import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  getLedSuit,
  isLegalPlay,
  resolveTrick,
  calculateMaxRounds,
  COLORED_SUITS,
} from '../game/Deck.js';

const num = (suit, rank) => ({
  type: 'numbered', suit, rank, isTrump: suit === 'black', id: `${suit}-${rank}`,
});
const special = (type, i = 0) => ({ type, suit: 'special', id: `${type}-${i}` });
const play = (card, playerId = 'p') => ({ playerId, card });

describe('createDeck', () => {
  const deck = createDeck();

  it('has 70 cards total', () => {
    expect(deck.length).toBe(70);
  });

  it('has 56 numbered cards (4 suits × 14)', () => {
    expect(deck.filter(c => c.type === 'numbered').length).toBe(56);
  });

  it('has a black trump suit of 14 cards flagged isTrump', () => {
    const black = deck.filter(c => c.suit === 'black');
    expect(black.length).toBe(14);
    expect(black.every(c => c.isTrump)).toBe(true);
  });

  it('colored suits are not trump', () => {
    const colored = deck.filter(c => COLORED_SUITS.includes(c.suit));
    expect(colored.length).toBe(42);
    expect(colored.every(c => !c.isTrump)).toBe(true);
  });

  it('has 5 escapes, 5 pirates, 2 mermaids, 1 skull king, 1 white whale', () => {
    const count = t => deck.filter(c => c.type === t).length;
    expect(count('escape')).toBe(5);
    expect(count('pirate')).toBe(5);
    expect(count('mermaid')).toBe(2);
    expect(count('skull_king')).toBe(1);
    expect(count('white_whale')).toBe(1);
  });

  it('every card has a unique id', () => {
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(deck.length);
  });
});

describe('shuffleDeck', () => {
  it('preserves all cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled.length).toBe(deck.length);
    expect(new Set(shuffled.map(c => c.id))).toEqual(new Set(deck.map(c => c.id)));
  });

  it('does not mutate the input', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(copy);
  });
});

describe('getLedSuit', () => {
  it('is the first numbered card suit', () => {
    expect(getLedSuit([play(num('green', 5)), play(num('yellow', 9))])).toBe('green');
  });

  it('skips special cards when finding the led suit', () => {
    expect(getLedSuit([play(special('escape')), play(num('purple', 3))])).toBe('purple');
  });

  it('is null when no numbered card has been played', () => {
    expect(getLedSuit([play(special('pirate')), play(special('escape'))])).toBe(null);
  });
});

describe('isLegalPlay', () => {
  const hand = [num('green', 4), num('green', 9), num('yellow', 2), special('pirate')];

  it('allows anything when leading (no led suit)', () => {
    expect(isLegalPlay(num('yellow', 2), hand, null)).toBe(true);
  });

  it('special cards are always legal', () => {
    expect(isLegalPlay(special('pirate'), hand, 'green')).toBe(true);
  });

  it('requires following the led suit when held', () => {
    expect(isLegalPlay(num('yellow', 2), hand, 'green')).toBe(false);
    expect(isLegalPlay(num('green', 4), hand, 'green')).toBe(true);
  });

  it('allows off-suit when the led suit is not held', () => {
    const noGreen = [num('yellow', 2), num('purple', 7)];
    expect(isLegalPlay(num('yellow', 2), noGreen, 'green')).toBe(true);
  });
});

describe('resolveTrick', () => {
  const winnerId = trick => resolveTrick(trick).playerId;

  it('highest card of the led suit wins (off-suit cannot win)', () => {
    const trick = [
      play(num('green', 5), 'a'),
      play(num('green', 9), 'b'),
      play(num('yellow', 14), 'c'),
    ];
    expect(winnerId(trick)).toBe('b');
  });

  it('trump (black) beats colored suits', () => {
    const trick = [play(num('green', 14), 'a'), play(num('black', 2), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('highest trump wins among multiple trumps', () => {
    const trick = [
      play(num('green', 10), 'a'),
      play(num('black', 5), 'b'),
      play(num('black', 8), 'c'),
    ];
    expect(winnerId(trick)).toBe('c');
  });

  it('a pirate beats all number cards including trump', () => {
    const trick = [play(num('black', 14), 'a'), play(special('pirate'), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('the skull king beats pirates', () => {
    const trick = [play(special('pirate'), 'a'), play(special('skull_king'), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('a mermaid beats the skull king', () => {
    const trick = [play(special('skull_king'), 'a'), play(special('mermaid'), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('mermaid wins when mermaid, pirate and skull king are all present', () => {
    const trick = [
      play(special('pirate'), 'a'),
      play(special('skull_king'), 'b'),
      play(special('mermaid'), 'c'),
    ];
    expect(winnerId(trick)).toBe('c');
  });

  it('a pirate beats a mermaid when no skull king is present', () => {
    const trick = [play(special('mermaid'), 'a'), play(special('pirate'), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('first pirate played wins ties between pirates', () => {
    const trick = [play(special('pirate', 0), 'a'), play(special('pirate', 1), 'b')];
    expect(winnerId(trick)).toBe('a');
  });

  it('escapes never win against a number card', () => {
    const trick = [play(special('escape'), 'a'), play(num('green', 3), 'b')];
    expect(winnerId(trick)).toBe('b');
  });

  it('the leader wins a trick of all escapes', () => {
    const trick = [play(special('escape', 0), 'a'), play(special('escape', 1), 'b')];
    expect(winnerId(trick)).toBe('a');
  });

  it('white whale: highest number wins regardless of suit, specials lose', () => {
    const trick = [
      play(special('skull_king'), 'a'),
      play(num('green', 4), 'b'),
      play(special('white_whale'), 'c'),
      play(num('yellow', 9), 'd'),
    ];
    expect(winnerId(trick)).toBe('d'); // yellow 9 beats green 4; skull king nullified
  });

  it('white whale: black trump loses its trump power (pure number rank)', () => {
    const trick = [
      play(special('white_whale'), 'a'),
      play(num('black', 3), 'b'),
      play(num('green', 10), 'c'),
    ];
    expect(winnerId(trick)).toBe('c'); // 10 > 3, suit/trump ignored
  });

  it('white whale with no number cards: no winner', () => {
    const trick = [
      play(special('white_whale'), 'a'),
      play(special('pirate'), 'b'),
      play(special('escape'), 'c'),
    ];
    expect(resolveTrick(trick)).toBe(null);
  });
});

describe('calculateMaxRounds', () => {
  it('is 10 for typical player counts', () => {
    expect(calculateMaxRounds(2)).toBe(10);
    expect(calculateMaxRounds(6)).toBe(10);
  });

  it('caps so a full hand can be dealt for many players', () => {
    // 70 cards / 8 players = 8 cards max in the final round.
    expect(calculateMaxRounds(8)).toBe(8);
  });
});
