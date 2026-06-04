import {
  createDeck,
  shuffleDeck,
  calculateMaxRounds,
  getLedSuit,
  isLegalPlay,
  resolveTrick,
} from './Deck.js';
import { calculateRoundScore, calculateTrickBonus } from './Scoring.js';

export class SkullKingGame {
  constructor(id, mode = 'classic') {
    this.id = id;
    this.mode = mode === 'simple' ? 'simple' : 'classic';
    this.bonusEnabled = this.mode !== 'simple';
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.maxRounds = 10;
    this.currentTrick = [];
    this.ledSuit = null;
    this.currentPlayerIndex = -1;
    this.dealerIndex = -1;
    this.firstPlayerIndex = -1;
    this.trickNumber = 0;
    this.lastTrickWinnerId = null;
    this.lastTrick = null;
    this.reviewingTrick = false;
    this.winner = null;
    this.leaderboard = [];
    this.finishedPlayers = 0;
  }

  addPlayer(id, name) {
    if (this.phase !== 'lobby') return false;
    if (this.players.find(p => p.id === id)) return false;
    this.players.push({
      id, name, hand: [], bid: null, tricksTaken: 0,
      capturedCards: [], roundBonus: 0, lastRoundScore: 0, score: 0,
    });
    return true;
  }

  removePlayer(id) {
    if (this.phase !== 'lobby') return false;
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.players.splice(idx, 1);
    return true;
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.maxRounds = calculateMaxRounds(this.players.length);
    this.dealerIndex = 0;
    this.startNewRound();
    return true;
  }

  startNewRound() {
    this.round++;
    this.phase = 'bidding';
    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = Math.min(this.round, Math.floor(deck.length / this.players.length));
    for (const player of this.players) {
      player.hand = deck.splice(0, cardsPerPlayer);
      player.bid = null;
      player.tricksTaken = 0;
      player.capturedCards = [];
      player.roundBonus = 0;
    }
    this.firstPlayerIndex = (this.dealerIndex + 1) % this.players.length;
    this.currentPlayerIndex = -1;
    this.trickNumber = 0;
    this.currentTrick = [];
    this.ledSuit = null;
    this.lastTrickWinnerId = null;
    this.lastTrick = null;
    this.reviewingTrick = false;
    this.finishedPlayers = 0;
  }

  getBiddingOrder() {
    const order = [];
    const start = (this.dealerIndex + 1) % this.players.length;
    for (let i = 0; i < this.players.length; i++) {
      order.push((start + i) % this.players.length);
    }
    return order;
  }

  placeBid(playerId, bid) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    if (this.phase !== 'bidding') return { success: false, error: 'Not bidding phase' };
    if (player.bid !== null) return { success: false, error: 'Already bid' };
    const handSize = player.hand.length;
    if (!Number.isInteger(bid) || bid < 0 || bid > handSize) {
      return { success: false, error: `Bid must be 0-${handSize}` };
    }
    player.bid = bid;
    this.finishedPlayers++;
    if (this.finishedPlayers === this.players.length) {
      this.phase = 'playing';
      this.currentPlayerIndex = this.firstPlayerIndex;
    }
    return { success: true };
  }

  playCard(playerId, cardId) {
    if (this.phase !== 'playing') return { success: false, error: 'Not playing phase' };
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }
    const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Card not in hand' };
    const card = currentPlayer.hand[cardIndex];
    if (!isLegalPlay(card, currentPlayer.hand, this.ledSuit)) {
      return { success: false, error: `You must follow the led suit (${this.ledSuit})` };
    }
    currentPlayer.hand.splice(cardIndex, 1);
    this.currentTrick.push({ playerId, card });
    if (this.ledSuit === null) this.ledSuit = getLedSuit(this.currentTrick);
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentTrick.length === this.players.length) {
      this.finishTrick();
    }
    return { success: true, card };
  }

  // Award the completed trick to its winner and enter a brief "review" pause so
  // every player can see who won before the next trick begins. The trick is NOT
  // cleared yet (endTrickReview does that). No one's turn during the pause.
  finishTrick() {
    const winning = resolveTrick(this.currentTrick); // may be null (White Whale)
    const winnerPlayer = winning ? this.players.find(p => p.id === winning.playerId) : null;
    if (winnerPlayer) {
      for (const play of this.currentTrick) {
        winnerPlayer.capturedCards.push(play.card);
      }
      winnerPlayer.tricksTaken++;
      if (this.bonusEnabled) {
        winnerPlayer.roundBonus += calculateTrickBonus(winning.card, this.currentTrick);
      }
    }
    this.trickNumber++;
    this.lastTrickWinnerId = winning ? winning.playerId : null;
    this.lastTrick = {
      plays: this.currentTrick.map(p => ({ playerId: p.playerId, card: p.card })),
      winnerId: winning ? winning.playerId : null,
      winnerName: winnerPlayer ? winnerPlayer.name : null,
      winningCardId: winning ? winning.card.id : null,
      leaderId: this.currentTrick[0]?.playerId ?? null,
      trickNumber: this.trickNumber,
      roundComplete: this.players[0].hand.length === 0,
    };
    this.reviewingTrick = true;
    this.currentPlayerIndex = -1;
  }

  // End the post-trick reveal: clear the table, then either score the round (if
  // hands are empty) or let the trick winner lead the next trick.
  endTrickReview() {
    if (!this.reviewingTrick) return false;
    this.reviewingTrick = false;
    // The winner leads next; if no one won (White Whale, no number cards) the
    // player who led this trick leads again.
    const lt = this.lastTrick || {};
    const nextLeaderId = lt.winnerId || lt.leaderId;
    this.currentTrick = [];
    this.ledSuit = null;
    if (this.players[0].hand.length === 0) {
      this.scoreRound();
    } else {
      this.currentPlayerIndex = this.players.findIndex(p => p.id === nextLeaderId);
    }
    return true;
  }

  scoreRound() {
    this.phase = 'scoring';
    for (const player of this.players) {
      const roundScore = calculateRoundScore(
        player.bid, player.tricksTaken, player.roundBonus, this.round,
      );
      player.lastRoundScore = roundScore;
      player.score += roundScore;
    }
    if (this.round >= this.maxRounds) {
      this.phase = 'game_over';
      this.leaderboard = [...this.players].sort((a, b) => b.score - a.score);
      this.winner = this.leaderboard[0];
    }
  }

  advanceRound() {
    if (this.phase !== 'scoring') return false;
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.startNewRound();
    return true;
  }

  // Card ids the current player is allowed to play right now (follow-suit aware).
  getLegalCardIds(playerId) {
    if (this.phase !== 'playing') return [];
    const current = this.players[this.currentPlayerIndex];
    if (!current || current.id !== playerId) return [];
    return current.hand
      .filter(c => isLegalPlay(c, current.hand, this.ledSuit))
      .map(c => c.id);
  }

  getPublicState() {
    // During bidding, hide everyone's bid number (only reveal that they've bid).
    // getPlayerState restores the requesting player's own bid afterwards.
    const hideBids = this.phase === 'bidding';
    return {
      id: this.id,
      phase: this.phase,
      mode: this.mode,
      bonusEnabled: this.bonusEnabled,
      round: this.round,
      maxRounds: this.maxRounds,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        handSize: p.hand.length,
        hand: null,
        bid: hideBids ? null : p.bid,
        hasBid: p.bid !== null,
        tricksTaken: p.tricksTaken,
        score: p.score,
        lastRoundScore: p.lastRoundScore,
        roundBonus: p.roundBonus,
        bonusEarned: this.bonusEnabled && p.bid === p.tricksTaken ? p.roundBonus : 0,
        capturedCards: p.capturedCards,
      })),
      currentTrick: this.currentTrick,
      ledSuit: this.ledSuit,
      reviewingTrick: this.reviewingTrick,
      lastTrick: this.lastTrick,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      firstPlayerIndex: this.firstPlayerIndex,
      trickNumber: this.trickNumber,
      lastTrickWinnerId: this.lastTrickWinnerId,
      winner: this.winner
        ? { id: this.winner.id, name: this.winner.name, score: this.winner.score }
        : null,
      leaderboard: this.leaderboard.map(p => ({ id: p.id, name: p.name, score: p.score })),
      biddingOrder: this.phase === 'bidding' ? this.getBiddingOrder() : [],
    };
  }

  getPlayerState(playerId) {
    const state = this.getPublicState();
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      state.myHand = player.hand;
      state.myBid = player.bid;
      state.myId = playerId;
      state.myTricksTaken = player.tricksTaken;
      state.myCapturedCards = player.capturedCards;
      state.myLegalCardIds = this.getLegalCardIds(playerId);
      const me = state.players.find(p => p.id === playerId);
      if (me) {
        me.hand = player.hand;
        me.bid = player.bid; // you can always see your own bid
      }
    }
    return state;
  }

  getPlayersForClient() {
    return this.players.map(p => ({ id: p.id, name: p.name }));
  }
}
