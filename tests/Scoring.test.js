import { describe, it, expect } from 'vitest';
import {
  calculateBidScore,
  calculateTrickBonus,
  calculateRoundScore,
} from '../game/Scoring.js';

const num = (suit, rank) => ({
  type: 'numbered', suit, rank, isTrump: suit === 'black', id: `${suit}-${rank}`,
});
const special = type => ({ type, suit: 'special', id: type });
const play = card => ({ playerId: 'w', card });

describe('calculateBidScore', () => {
  it('exact non-zero bid scores 20 per trick', () => {
    expect(calculateBidScore(3, 3, 5)).toBe(60);
    expect(calculateBidScore(1, 1, 2)).toBe(20);
  });

  it('exact zero bid scores 10 × round number', () => {
    expect(calculateBidScore(0, 0, 1)).toBe(10);
    expect(calculateBidScore(0, 0, 7)).toBe(70);
  });

  it('missed non-zero bid loses 10 per trick off', () => {
    expect(calculateBidScore(2, 4, 6)).toBe(-20); // 2 over
    expect(calculateBidScore(3, 1, 6)).toBe(-20); // 2 under
  });

  it('missed zero bid loses 10 × round number', () => {
    expect(calculateBidScore(0, 1, 4)).toBe(-40);
    expect(calculateBidScore(0, 3, 8)).toBe(-80);
  });
});

describe('calculateTrickBonus', () => {
  it('is 0 for a plain trick', () => {
    const trick = [play(num('green', 5)), play(num('yellow', 9))];
    expect(calculateTrickBonus(num('green', 5), trick)).toBe(0);
  });

  it('adds 10 for each colored 14 captured', () => {
    const trick = [play(num('green', 14)), play(num('yellow', 14)), play(num('green', 2))];
    expect(calculateTrickBonus(num('green', 2), trick)).toBe(20);
  });

  it('adds 20 for the black 14 captured', () => {
    const trick = [play(num('black', 14)), play(num('green', 3))];
    expect(calculateTrickBonus(num('black', 14), trick)).toBe(20);
  });

  it('adds 30 per pirate when the skull king wins', () => {
    const sk = special('skull_king');
    const trick = [play(special('pirate')), play(special('pirate')), play(sk)];
    expect(calculateTrickBonus(sk, trick)).toBe(60);
  });

  it('adds 40 when a mermaid captures the skull king', () => {
    const mermaid = special('mermaid');
    const trick = [play(special('skull_king')), play(mermaid)];
    expect(calculateTrickBonus(mermaid, trick)).toBe(40);
  });

  it('does not award the pirate bonus when a pirate (not the skull king) wins', () => {
    const pirate = special('pirate');
    const trick = [play(pirate), play(special('pirate'))];
    expect(calculateTrickBonus(pirate, trick)).toBe(0);
  });
});

describe('calculateRoundScore', () => {
  it('adds bonus only when the bid is hit exactly', () => {
    // bid hit: 20×2 + 30 bonus
    expect(calculateRoundScore(2, 2, 30, 5)).toBe(70);
    // bid missed: bonus dropped, base penalty only
    expect(calculateRoundScore(2, 3, 30, 5)).toBe(-10);
  });

  it('keeps zero-bid round scoring with bonus', () => {
    expect(calculateRoundScore(0, 0, 0, 3)).toBe(30);
  });
});
