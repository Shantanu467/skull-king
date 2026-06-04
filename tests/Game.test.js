import { describe, it, expect, beforeEach } from 'vitest';
import { SkullKingGame } from '../game/Game.js';

const num = (suit, rank) => ({
  type: 'numbered', suit, rank, isTrump: suit === 'black', id: `${suit}-${rank}`,
});
const special = (type, i = 0) => ({ type, suit: 'special', id: `${type}-${i}` });

describe('SkullKingGame — lobby', () => {
  let game;
  beforeEach(() => { game = new SkullKingGame('TEST'); });

  it('adds players in the lobby', () => {
    expect(game.addPlayer('p1', 'Ann')).toBe(true);
    expect(game.addPlayer('p2', 'Bo')).toBe(true);
    expect(game.players.length).toBe(2);
  });

  it('rejects duplicate ids', () => {
    game.addPlayer('p1', 'Ann');
    expect(game.addPlayer('p1', 'Ann again')).toBe(false);
  });

  it('does not start with fewer than 2 players', () => {
    game.addPlayer('p1', 'Ann');
    expect(game.startGame()).toBe(false);
    expect(game.phase).toBe('lobby');
  });

  it('removes a player in the lobby only', () => {
    game.addPlayer('p1', 'Ann');
    game.addPlayer('p2', 'Bo');
    expect(game.removePlayer('p1')).toBe(true);
    expect(game.players.length).toBe(1);
  });
});

describe('SkullKingGame — bidding', () => {
  let game;
  beforeEach(() => {
    game = new SkullKingGame('TEST');
    game.addPlayer('p1', 'Ann');
    game.addPlayer('p2', 'Bo');
    game.startGame();
  });

  it('deals round 1 (one card each) and enters bidding', () => {
    expect(game.phase).toBe('bidding');
    expect(game.round).toBe(1);
    expect(game.players.every(p => p.hand.length === 1)).toBe(true);
  });

  it('rejects a bid larger than the hand', () => {
    const r = game.placeBid('p1', 5);
    expect(r.success).toBe(false);
  });

  it('moves to the playing phase once everyone bids', () => {
    game.placeBid('p1', 0);
    game.placeBid('p2', 1);
    expect(game.phase).toBe('playing');
  });

  it('allows the bids to total the hand size (no Oh-Hell restriction)', () => {
    expect(game.placeBid('p1', 1).success).toBe(true);
    expect(game.placeBid('p2', 0).success).toBe(true);
  });
});

describe('SkullKingGame — hidden bids', () => {
  let game;
  beforeEach(() => {
    game = new SkullKingGame('TEST');
    game.addPlayer('p1', 'Ann');
    game.addPlayer('p2', 'Bo');
    game.startGame();
  });

  it('hides other players bids during bidding but reveals hasBid', () => {
    game.placeBid('p1', 1);
    const stateForBo = game.getPlayerState('p2');
    const ann = stateForBo.players.find(p => p.id === 'p1');
    expect(ann.bid).toBe(null);   // number hidden from Bo
    expect(ann.hasBid).toBe(true); // but Bo can see Ann has bid
  });

  it('lets a player see their own bid during bidding', () => {
    game.placeBid('p1', 1);
    const stateForAnn = game.getPlayerState('p1');
    expect(stateForAnn.myBid).toBe(1);
    expect(stateForAnn.players.find(p => p.id === 'p1').bid).toBe(1);
  });

  it('reveals all bids once bidding completes', () => {
    game.placeBid('p1', 1);
    game.placeBid('p2', 0);
    const state = game.getPlayerState('p2');
    expect(state.players.find(p => p.id === 'p1').bid).toBe(1);
  });
});

describe('SkullKingGame — simple mode', () => {
  it('does not award capture bonuses in simple mode', () => {
    const game = new SkullKingGame('TEST', 'simple');
    expect(game.bonusEnabled).toBe(false);
    game.addPlayer('p1', 'Ann');
    game.addPlayer('p2', 'Bo');
    game.startGame();
    game.phase = 'playing';
    game.players[0].hand = [{ type: 'skull_king', suit: 'special', id: 'skull_king-0' }];
    game.players[1].hand = [{ type: 'pirate', suit: 'special', id: 'pirate-0' }];
    game.players[0].bid = 1; game.players[1].bid = 0;
    game.firstPlayerIndex = 0; game.currentPlayerIndex = 0;
    game.ledSuit = null; game.currentTrick = [];
    game.round = 1; game.maxRounds = 2;
    game.playCard('p1', 'skull_king-0');
    game.playCard('p2', 'pirate-0');
    game.endTrickReview();
    // Exact bid of 1 -> 20, but NO +30 skull-king-takes-pirate bonus in simple mode
    expect(game.players[0].score).toBe(20);
  });
});

// Helper: drop a 2-player game into a controlled trick-playing state.
function playingGame(hands, bids = [1, 1]) {
  const game = new SkullKingGame('TEST');
  game.addPlayer('p1', 'Ann');
  game.addPlayer('p2', 'Bo');
  game.startGame();
  game.phase = 'playing';
  game.players[0].hand = hands[0];
  game.players[1].hand = hands[1];
  game.players[0].bid = bids[0];
  game.players[1].bid = bids[1];
  game.firstPlayerIndex = 0;
  game.currentPlayerIndex = 0;
  game.ledSuit = null;
  game.currentTrick = [];
  return game;
}

describe('SkullKingGame — follow suit and trick resolution', () => {
  it('rejects a card that does not follow the led suit when able', () => {
    const game = playingGame([
      [num('green', 5)],
      [num('green', 9), num('yellow', 3)],
    ], [1, 0]);
    game.players[1].hand = [num('green', 9), num('yellow', 3)];
    expect(game.playCard('p1', 'green-5').success).toBe(true);
    expect(game.ledSuit).toBe('green');
    const bad = game.playCard('p2', 'yellow-3');
    expect(bad.success).toBe(false);
    expect(game.playCard('p2', 'green-9').success).toBe(true);
  });

  it('the higher led-suit card wins the trick, then leads next after the review', () => {
    const game = playingGame([
      [num('green', 5), num('green', 1)],
      [num('green', 9), num('green', 2)],
    ]);
    game.playCard('p1', 'green-5');
    game.playCard('p2', 'green-9');
    expect(game.players[1].tricksTaken).toBe(1);
    expect(game.players[0].tricksTaken).toBe(0);
    // Trick pauses for the reveal: no one's turn, full trick still on the table.
    expect(game.reviewingTrick).toBe(true);
    expect(game.currentPlayerIndex).toBe(-1);
    expect(game.currentTrick.length).toBe(2);
    expect(game.lastTrick.winnerId).toBe('p2');
    expect(game.lastTrick.winningCardId).toBe('green-9');
    // After the reveal ends, the winner (p2, index 1) leads the next trick.
    game.endTrickReview();
    expect(game.reviewingTrick).toBe(false);
    expect(game.currentTrick.length).toBe(0);
    expect(game.currentPlayerIndex).toBe(1);
  });

  it('white whale with no number cards: nobody wins the trick', () => {
    const game = playingGame([
      [special('white_whale')],
      [special('escape')],
    ], [0, 0]);
    game.playCard('p1', 'white_whale-0');
    game.playCard('p2', 'escape-0');
    expect(game.reviewingTrick).toBe(true);
    expect(game.lastTrick.winnerId).toBe(null);
    expect(game.players[0].tricksTaken).toBe(0);
    expect(game.players[1].tricksTaken).toBe(0);
    game.endTrickReview();
    expect(game.phase).toBe('scoring');
    expect(game.players[0].score).toBe(10); // bid 0, took 0 -> +10 (round 1)
    expect(game.players[1].score).toBe(10);
  });

  it('reports only legal cards for the current player', () => {
    const game = playingGame([
      [num('green', 5)],
      [num('green', 9), num('yellow', 3), special('pirate')],
    ]);
    game.players[1].hand = [num('green', 9), num('yellow', 3), special('pirate')];
    game.playCard('p1', 'green-5');
    const legal = game.getLegalCardIds('p2');
    expect(legal).toContain('green-9');   // must follow
    expect(legal).toContain('pirate-0');  // special always legal
    expect(legal).not.toContain('yellow-3');
  });
});

describe('SkullKingGame — scoring a round', () => {
  it('scores exact bids with bonus and missed bids with penalty', () => {
    // Round 1, one card each. p1 bids 1 and wins with the skull king,
    // capturing p2's pirate -> +30 bonus. p2 bids 0 and takes no trick.
    const game = playingGame([
      [special('skull_king')],
      [special('pirate')],
    ], [1, 0]);
    game.round = 1;
    game.maxRounds = 1;
    game.playCard('p1', 'skull_king-0');
    game.playCard('p2', 'pirate-0');
    expect(game.reviewingTrick).toBe(true); // pauses to show the winner first
    game.endTrickReview();                  // last trick of the round -> score it
    expect(game.phase).toBe('game_over');
    // p1: exact bid 1 -> 20, + skull-king-captures-pirate bonus 30 = 50
    expect(game.players[0].score).toBe(50);
    // p2: exact bid 0 (took 0 tricks) -> +10 × round(1) = 10
    expect(game.players[1].score).toBe(10);
    expect(game.winner.id).toBe('p1');
  });

  it('drops the bonus when the bid is missed', () => {
    const game = playingGame([
      [special('skull_king')],
      [special('pirate')],
    ], [0, 1]); // p1 bid 0 but will take the trick (miss)
    game.round = 1;
    game.maxRounds = 2; // not the final round
    game.playCard('p1', 'skull_king-0');
    game.playCard('p2', 'pirate-0');
    game.endTrickReview();
    expect(game.phase).toBe('scoring');
    // p1 missed a zero bid: -10 × round, bonus dropped
    expect(game.players[0].score).toBe(-10);
  });
});
