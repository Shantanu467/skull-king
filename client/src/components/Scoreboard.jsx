import socket from '../socket.js';
import Card from './Card.jsx';

export default function Scoreboard({ gameState, gameOver }) {
  const isCreator = gameState.players[0] && gameState.players[0].id === gameState.myId;
  const ranked = [...gameState.players].sort((a, b) => b.score - a.score);
  const showBonus = gameState.bonusEnabled !== false;

  return (
    <div className="scoreboard">
      {gameOver ? (
        <div className="game-over">
          <h1 className="game-over-title">🏆 {gameState.winner?.name} wins!</h1>
          <p className="game-over-sub">{gameState.winner?.score} points</p>
        </div>
      ) : (
        <h2 className="round-results-title">Round {gameState.round} results</h2>
      )}

      <div className={`score-table ${showBonus ? '' : 'score-table-nobonus'}`}>
        <div className="score-row score-head">
          <span>Player</span>
          <span>Bid</span>
          <span>Won</span>
          {showBonus && <span>Bonus</span>}
          <span>Round</span>
          <span>Total</span>
        </div>
        {ranked.map(p => {
          const hit = p.bid === p.tricksTaken;
          return (
            <div key={p.id} className={`score-row ${p.id === gameState.myId ? 'score-me' : ''}`}>
              <span className="score-name">{p.name}</span>
              <span>{p.bid ?? '–'}</span>
              <span className={hit ? 'hit' : 'miss'}>{p.tricksTaken}</span>
              {showBonus && <span>{p.bonusEarned ? `+${p.bonusEarned}` : '–'}</span>}
              <span className={p.lastRoundScore >= 0 ? 'pos' : 'neg'}>
                {p.lastRoundScore >= 0 ? `+${p.lastRoundScore}` : p.lastRoundScore}
              </span>
              <span className="score-total">{p.score}</span>
            </div>
          );
        })}
      </div>

      {showBonus && <div className="captured">
        <h3 className="captured-title">Bonus cards captured</h3>
        {gameState.players.map(p => {
          const bonusCards = (p.capturedCards || []).filter(c =>
            c.type !== 'numbered' || c.rank === 14);
          if (bonusCards.length === 0) return null;
          return (
            <div key={p.id} className="captured-row">
              <span className="captured-player">{p.name}</span>
              <div className="captured-cards">
                {bonusCards.map((c, i) => <Card key={c.id + i} card={c} small />)}
              </div>
            </div>
          );
        })}
      </div>}

      {gameOver && (
        <div className="leaderboard">
          <h3>Final standings</h3>
          {ranked.map((p, i) => (
            <div key={p.id} className={`lb-row ${i === 0 ? 'lb-first' : ''}`}>
              <span className="lb-rank">#{i + 1}</span>
              <span className="lb-name">{p.name}</span>
              <span className="lb-score">{p.score}</span>
            </div>
          ))}
        </div>
      )}

      {isCreator ? (
        <button
          className="btn btn-primary btn-block"
          onClick={() => socket.emit(gameOver ? 'play_again' : 'next_round')}
        >
          {gameOver ? 'Play again' : 'Next round'}
        </button>
      ) : (
        <p className="waiting-msg">
          Waiting for the host to {gameOver ? 'start a new game' : 'deal the next round'}…
        </p>
      )}
    </div>
  );
}
