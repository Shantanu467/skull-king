import { useState, useRef } from 'react';
import socket from './socket.js';

const PIRATE_NAMES = [
  'Anonymous Buccaneer', 'Salty Pete', 'One-Eyed Jack', 'Red Anne',
  'Captain Nobody', 'Driftwood Dan', 'Stowaway', 'Barnacle Bill',
];

function suggestName() {
  const base = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
  return `${base} ${Math.floor(Math.random() * 90 + 10)}`;
}

export default function Lobby({ gameState, roomCode, onLeave }) {
  const [name, setName] = useState(() => localStorage.getItem('skullking_name') || '');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState('');
  const [pending, setPending] = useState(null); // { action, name } when name is blank
  const [mode, setMode] = useState('classic');  // classic | simple (creator's choice)
  const inputRef = useRef(null);

  const players = gameState ? gameState.players : [];
  const inRoom = !!roomCode;
  const amCreator = gameState && players[0] && gameState.myId === players[0].id;

  function emitWithName(action, playerName) {
    const finalName = playerName.trim();
    localStorage.setItem('skullking_name', finalName);
    if (action === 'create') {
      socket.emit('create_room', { name: finalName, mode });
    } else {
      socket.emit('join_room', { roomCode: joinCode.trim().toUpperCase(), name: finalName });
    }
  }

  // If the name is blank, ask the player to confirm a suggested default first.
  function attempt(action) {
    if (action === 'join' && !joinCode.trim()) return;
    if (name.trim()) {
      emitWithName(action, name);
    } else {
      setPending({ action, name: suggestName() });
    }
  }

  function confirmDefault() {
    emitWithName(pending.action, pending.name);
    setName(pending.name);
    setPending(null);
  }

  function declineDefault() {
    setPending(null);
    inputRef.current?.focus();
  }

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* clipboard unavailable */ }
  }

  if (!inRoom) {
    return (
      <div className="lobby">
        <h1 className="title">☠ Skull King</h1>
        <p className="subtitle">A pirate trick-taking game · 2–8 players</p>
        <div className="lobby-card">
          <label className="field-label">Your name</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="Captain..."
            value={name}
            onChange={e => { setName(e.target.value); if (pending) setPending(null); }}
            maxLength={20}
          />

          {pending ? (
            <div className="confirm-name">
              <p>No name entered. Play as <b>{pending.name}</b>?</p>
              <div className="confirm-name-actions">
                <button className="btn btn-primary" onClick={confirmDefault}>
                  Use this name
                </button>
                <button className="btn btn-ghost" onClick={declineDefault}>
                  I'll type my own
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="field-label" style={{ marginTop: 14 }}>Game mode</label>
              <div className="mode-select">
                <button
                  type="button"
                  className={`mode-opt ${mode === 'classic' ? 'mode-opt-active' : ''}`}
                  onClick={() => setMode('classic')}
                >
                  <b>Classic</b>
                  <span>Full rules + bonus points</span>
                </button>
                <button
                  type="button"
                  className={`mode-opt ${mode === 'simple' ? 'mode-opt-active' : ''}`}
                  onClick={() => setMode('simple')}
                >
                  <b>Simple</b>
                  <span>No bonus points — just bids</span>
                </button>
              </div>
              <button className="btn btn-primary btn-block" onClick={() => attempt('create')}>
                Create a Room
              </button>
              <div className="divider"><span>or join one</span></div>
              <div className="join-row">
                <input
                  className="input input-code"
                  placeholder="CODE"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={4}
                />
                <button className="btn btn-secondary" onClick={() => attempt('join')}>Join</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="lobby">
      <h1 className="title">☠ Skull King</h1>
      <div className="lobby-card">
        <p className="field-label">Room Code · share with your crew</p>
        <div className="room-code" onClick={() => copy(roomCode, 'code')}>
          {roomCode}
          <span className="copy-hint">{copied === 'code' ? 'Copied!' : 'tap to copy'}</span>
        </div>
        {shareUrl && (
          <button className="btn btn-ghost btn-block" onClick={() => copy(shareUrl, 'link')}>
            {copied === 'link' ? 'Link copied!' : `🔗 Copy link (${shareUrl.replace(/^https?:\/\//, '')})`}
          </button>
        )}

        <div className="players-list">
          <h3 className="players-title">Crew ({players.length}/8)</h3>
          {players.map((p, i) => (
            <div key={p.id} className={`player-item ${p.id === gameState.myId ? 'player-me' : ''}`}>
              <span className="player-dot" />
              <span className="player-name">{p.name}{p.id === gameState.myId ? ' (you)' : ''}</span>
              {i === 0 && <span className="host-badge">Host</span>}
            </div>
          ))}
        </div>

        {amCreator ? (
          players.length >= 2 ? (
            <button className="btn btn-primary btn-block" onClick={() => socket.emit('start_game')}>
              Start Game
            </button>
          ) : (
            <p className="waiting-msg">Waiting for at least one more player…</p>
          )
        ) : (
          <p className="waiting-msg">Waiting for the host to start…</p>
        )}
        <button className="btn btn-link" onClick={onLeave}>Leave room</button>
      </div>
    </div>
  );
}
