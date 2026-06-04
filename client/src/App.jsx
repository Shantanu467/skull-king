import { useState, useEffect } from 'react';
import socket from './socket.js';
import Lobby from './Lobby.jsx';
import GameBoard from './GameBoard.jsx';
import HelpButton from './components/HelpButton.jsx';

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('skullking_room') || null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function persistRoom(code) {
      setRoomCode(code);
      if (code) localStorage.setItem('skullking_room', code);
    }
    function clearRoom() {
      setRoomCode(null);
      setGameState(null);
      localStorage.removeItem('skullking_room');
    }

    function onConnect() {
      setConnected(true);
      // Reconnected: try to slip back into our existing seat.
      const saved = localStorage.getItem('skullking_room');
      if (saved) socket.emit('resume', { roomCode: saved });
    }
    function onDisconnect() { setConnected(false); }
    function onGameState(state) { setGameState(state); }
    function onRoomCreated({ roomCode: code }) { persistRoom(code); }
    function onRoomJoined({ roomCode: code }) { persistRoom(code); }
    function onResumeFailed() { clearRoom(); }
    function onError({ message }) { setError(message); setTimeout(() => setError(''), 5000); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_state', onGameState);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('resume_failed', onResumeFailed);
    socket.on('error', onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state', onGameState);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('resume_failed', onResumeFailed);
      socket.off('error', onError);
    };
  }, []);

  function leaveRoom() {
    localStorage.removeItem('skullking_room');
    setRoomCode(null);
    setGameState(null);
  }

  const inGame = gameState && gameState.phase !== 'lobby';

  return (
    <div className="app">
      {!connected && (
        <div className="conn-banner">Reconnecting to server…</div>
      )}
      {error && <div className="toast">{error}</div>}

      {!connected && !gameState ? (
        <div className="connecting">
          <h1 className="title">☠ Skull King</h1>
          <p>Connecting to server…</p>
        </div>
      ) : !inGame ? (
        <Lobby gameState={gameState} roomCode={roomCode} onLeave={leaveRoom} />
      ) : (
        <GameBoard gameState={gameState} onLeave={leaveRoom} />
      )}

      <HelpButton />
    </div>
  );
}
