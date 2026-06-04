import { io } from 'socket.io-client';

// Stable per-browser identity so a dropped/reconnected player keeps their seat
// and hand mid-game. Persisted in localStorage and sent in the socket handshake.
function getPlayerToken() {
  let token = localStorage.getItem('skullking_token');
  if (!token) {
    token = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('skullking_token', token);
  }
  return token;
}

const socket = io({
  auth: { token: getPlayerToken() },
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
