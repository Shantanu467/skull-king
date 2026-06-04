import socket from './socket.js';
import Card from './components/Card.jsx';
import BidPanel from './components/BidPanel.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import { SUIT_META } from './cards.js';

// During bidding, other players' bids are hidden — show only whether they've
// locked one in. Your own bid (and all bids after bidding ends) show the number.
function bidDisplay(gameState, p) {
  if (gameState.phase === 'bidding') {
    if (p.id === gameState.myId) return p.bid ?? '–';
    return p.hasBid ? '✓' : '…';
  }
  return p.bid ?? '–';
}

export default function GameBoard({ gameState, onLeave }) {
  if (gameState.phase === 'scoring') return <Scoreboard gameState={gameState} />;
  if (gameState.phase === 'game_over') return <Scoreboard gameState={gameState} gameOver />;

  const me = gameState.players.find(p => p.id === gameState.myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn =
    gameState.phase === 'playing' &&
    gameState.currentPlayerIndex >= 0 &&
    currentPlayer?.id === gameState.myId;
  const legal = new Set(gameState.myLegalCardIds || []);
  const ledMeta = gameState.ledSuit ? SUIT_META[gameState.ledSuit] : null;
  const reviewing = gameState.reviewingTrick;
  const lastTrick = gameState.lastTrick;
  const winningCardId = reviewing && lastTrick ? lastTrick.winningCardId : null;
  const totalTricks = (gameState.myHand?.length || 0) + gameState.trickNumber;
  const standings = [...gameState.players].sort((a, b) => b.score - a.score);

  function playCard(cardId) {
    if (isMyTurn && legal.has(cardId)) socket.emit('play_card', { cardId });
  }

  return (
    <div className="game-board">
      <header className="game-header">
        <span className="hdr-chip">Round {gameState.round}/{gameState.maxRounds}</span>
        {gameState.phase === 'playing' && (
          <span className="hdr-chip">
            Trick {Math.min(reviewing ? gameState.trickNumber : gameState.trickNumber + 1, totalTricks)}/{totalTricks}
          </span>
        )}
        <span className={`hdr-chip hdr-phase phase-${gameState.phase}`}>
          {gameState.phase === 'bidding' ? 'Bidding' : 'Playing'}
        </span>
        {gameState.bonusEnabled === false && <span className="hdr-chip hdr-simple">Simple</span>}
        <button className="btn btn-link hdr-leave" onClick={onLeave}>Leave</button>
      </header>

      {/* Live standings — everyone's total score at a glance */}
      <div className="standings">
        {standings.map((p, i) => (
          <div
            key={p.id}
            className={`standing ${p.id === gameState.myId ? 'standing-me' : ''} ${i === 0 ? 'standing-lead' : ''}`}
          >
            <span className="standing-rank">{i === 0 ? '👑' : `#${i + 1}`}</span>
            <span className="standing-name">{p.name}{p.id === gameState.myId ? ' (you)' : ''}</span>
            <span className="standing-score">{p.score}</span>
            <span className="standing-sub">bid {bidDisplay(gameState, p)} · won {p.tricksTaken}</span>
          </div>
        ))}
      </div>

      {/* Opponents */}
      <div className="opponents">
        {gameState.players.filter(p => p.id !== gameState.myId).map(p => {
          const theirTurn = gameState.phase === 'playing' && currentPlayer?.id === p.id;
          const stillBidding = gameState.phase === 'bidding' && !p.hasBid;
          const wonLast = gameState.lastTrickWinnerId === p.id && gameState.trickNumber > 0;
          return (
            <div key={p.id} className={`opponent ${theirTurn ? 'opponent-active' : ''}`}>
              <div className="opponent-top">
                <span className="opponent-name">{p.name}</span>
                {wonLast && <span className="won-tag">won trick</span>}
              </div>
              <div className="opponent-cards">
                {Array.from({ length: p.handSize }).map((_, i) => (
                  <span key={i} className="card-back" />
                ))}
              </div>
              <div className="opponent-stats">
                {gameState.phase === 'bidding'
                  ? (p.hasBid
                      ? <span className="ready">✓ ready</span>
                      : <span className="thinking">bidding…</span>)
                  : <span>Bid {p.bid ?? '–'}</span>}
                <span>Won {p.tricksTaken}</span>
                <span>{p.score} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table center */}
      <div className="table-center">
        {gameState.phase === 'bidding' && (
          <div className="table-msg">
            {me && me.bid !== null
              ? <p>You bid <b>{me.bid}</b>. Waiting for others…</p>
              : <p>Look at your hand and place your bid.</p>}
            <p className="table-sub">
              {gameState.players.filter(p => !p.hasBid).length} still bidding
            </p>
          </div>
        )}

        {gameState.phase === 'playing' && (
          <>
            <div className="led-suit">
              {reviewing
                ? <span>Trick {lastTrick?.trickNumber} complete</span>
                : ledMeta
                  ? <span>Led suit: <b style={{ color: ledMeta.color }}>{ledMeta.icon} {ledMeta.name}</b></span>
                  : <span>{gameState.currentTrick.length === 0 ? 'Lead the trick' : 'No suit led yet'}</span>}
            </div>
            <div className="trick">
              {gameState.currentTrick.length === 0 && !reviewing && <div className="trick-empty">🏴‍☠️</div>}
              {gameState.currentTrick.map((play, i) => {
                const isWinner = reviewing && play.card.id === winningCardId;
                return (
                  <div key={i} className={`trick-slot ${isWinner ? 'trick-winner' : ''}`}>
                    <Card card={play.card} small selected={isWinner} />
                    <span className="trick-name">
                      {gameState.players.find(p => p.id === play.playerId)?.name}
                      {isWinner && ' 👑'}
                    </span>
                  </div>
                );
              })}
            </div>
            {reviewing ? (
              <div className="turn-banner turn-winner">
                🏴‍☠️ {lastTrick?.winnerId === gameState.myId ? 'You win' : `${lastTrick?.winnerName} wins`} the trick!
              </div>
            ) : (
              <div className={`turn-banner ${isMyTurn ? 'turn-mine' : ''}`}>
                {isMyTurn ? '⚓ Your turn — play a card' : `Waiting for ${currentPlayer?.name}…`}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bid panel */}
      {gameState.phase === 'bidding' && me && me.bid === null && (
        <BidPanel maxBid={gameState.myHand.length} />
      )}

      {/* My hand */}
      <div className="my-hand">
        <div className="my-hand-head">
          <span className="my-name">{me?.name} (you)</span>
          <span className="my-stats">
            Bid {me?.bid ?? '–'} · Won {me?.tricksTaken ?? 0} · {me?.score ?? 0} pts
          </span>
        </div>
        <div className="hand-cards">
          {(gameState.myHand || []).map(card => {
            const playable = isMyTurn && legal.has(card.id);
            return (
              <Card
                key={card.id}
                card={card}
                onClick={() => playCard(card.id)}
                disabled={!playable}
                dim={isMyTurn && !legal.has(card.id)}
              />
            );
          })}
        </div>
        {isMyTurn && (gameState.myLegalCardIds || []).length < (gameState.myHand || []).length && (
          <p className="follow-hint">You must follow the led suit — greyed cards can't be played.</p>
        )}
      </div>
    </div>
  );
}
