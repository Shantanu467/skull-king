import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { SkullKingGame } from './game/Game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const games = new Map();        // roomCode -> SkullKingGame (players keyed by stable token)
const tokenToRoom = new Map();  // playerToken -> roomCode
const tokenToSocket = new Map();// playerToken -> live socket.id
const socketToToken = new Map();// socket.id -> playerToken
const trickTimers = new Map();  // roomCode -> timeout for the post-trick reveal

const TRICK_REVIEW_MS = 2600;   // how long everyone sees who won a trick

// Identity is a stable per-browser token sent in the socket handshake, NOT the
// ephemeral socket.id. This lets a player who drops and reconnects keep their
// seat and hand mid-game. We fall back to the socket.id if no token is sent.
function tokenOf(socket) {
  return socketToToken.get(socket.id) || socket.id;
}

function bindIdentity(socket) {
  const token = socket.handshake.auth?.token || socket.id;
  socketToToken.set(socket.id, token);
  tokenToSocket.set(token, socket.id);
  return token;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (games.has(code));
  return code;
}

function broadcastGameState(roomCode) {
  const game = games.get(roomCode);
  if (!game) return;
  for (const player of game.players) {
    const socketId = tokenToSocket.get(player.id);
    if (socketId) io.to(socketId).emit('game_state', game.getPlayerState(player.id));
  }
}

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

io.on('connection', (socket) => {
  const token = bindIdentity(socket);
  console.log(`Player connected: socket=${socket.id} token=${token.slice(0, 8)}`);

  socket.on('create_room', ({ name, mode }) => {
    const roomCode = generateRoomCode();
    const game = new SkullKingGame(roomCode, mode === 'simple' ? 'simple' : 'classic');
    game.addPlayer(token, name || 'Player 1');
    games.set(roomCode, game);
    tokenToRoom.set(token, roomCode);
    socket.join(roomCode);
    socket.emit('room_created', { roomCode, players: game.getPlayersForClient() });
    broadcastGameState(roomCode);
    console.log(`Room ${roomCode} created by ${name || 'Player 1'}`);
  });

  socket.on('join_room', ({ roomCode, name }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = games.get(code);
    if (!game) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    // Same browser/token already in this room -> treat as a resume, not a dup.
    if (game.players.find(p => p.id === token)) {
      tokenToRoom.set(token, code);
      socket.join(code);
      socket.emit('room_joined', { roomCode: code, players: game.getPlayersForClient() });
      broadcastGameState(code);
      return;
    }
    if (game.phase !== 'lobby') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    if (game.players.length >= 8) {
      socket.emit('error', { message: 'Room is full (max 8 players)' });
      return;
    }
    game.addPlayer(token, name || `Player ${game.players.length + 1}`);
    tokenToRoom.set(token, code);
    socket.join(code);
    socket.emit('room_joined', { roomCode: code, players: game.getPlayersForClient() });
    broadcastGameState(code);
    console.log(`${name || 'Player'} joined room ${code}`);
  });

  // Re-attach a reconnecting socket to its existing seat and resend state.
  socket.on('resume', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = games.get(code);
    if (!game || !game.players.find(p => p.id === token)) {
      socket.emit('resume_failed', { roomCode: code });
      return;
    }
    tokenToRoom.set(token, code);
    socket.join(code);
    socket.emit('room_joined', { roomCode: code, players: game.getPlayersForClient() });
    socket.emit('game_state', game.getPlayerState(token));
  });

  socket.on('start_game', () => {
    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (!game) return;
    if (game.players[0].id !== token) {
      socket.emit('error', { message: 'Only the room creator can start the game' });
      return;
    }
    if (game.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    game.startGame();
    broadcastGameState(roomCode);
    console.log(`Game started in room ${roomCode}`);
  });

  socket.on('place_bid', ({ bid }) => {
    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (!game) return;
    const result = game.placeBid(token, bid);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }
    broadcastGameState(roomCode);
  });

  socket.on('play_card', ({ cardId }) => {
    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (!game) return;
    const result = game.playCard(token, cardId);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }
    broadcastGameState(roomCode);

    // A completed trick pauses on the table so everyone sees who won, then the
    // game continues (next trick or round scoring).
    if (game.reviewingTrick) {
      if (trickTimers.has(roomCode)) clearTimeout(trickTimers.get(roomCode));
      const timer = setTimeout(() => {
        trickTimers.delete(roomCode);
        const g = games.get(roomCode);
        if (g && g.reviewingTrick) {
          g.endTrickReview();
          broadcastGameState(roomCode);
        }
      }, TRICK_REVIEW_MS);
      trickTimers.set(roomCode, timer);
    }
  });

  socket.on('next_round', () => {
    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (!game) return;
    if (game.phase !== 'scoring') return;
    if (game.players[0].id !== token) {
      socket.emit('error', { message: 'Only the room creator can advance rounds' });
      return;
    }
    game.advanceRound();
    broadcastGameState(roomCode);
  });

  socket.on('play_again', () => {
    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (!game) return;
    if (game.phase !== 'game_over') return;
    if (game.players[0].id !== token) {
      socket.emit('error', { message: 'Only the room creator can start a new game' });
      return;
    }
    const newGame = new SkullKingGame(roomCode, game.mode);
    for (const p of game.players) {
      newGame.addPlayer(p.id, p.name);
    }
    games.set(roomCode, newGame);
    broadcastGameState(roomCode);
    console.log(`New game started in room ${roomCode}`);
  });

  socket.on('disconnect', () => {
    socketToToken.delete(socket.id);
    // Only drop the live socket mapping if this socket is the player's current
    // one (a reconnect may have already replaced it).
    if (tokenToSocket.get(token) === socket.id) tokenToSocket.delete(token);

    const roomCode = tokenToRoom.get(token);
    const game = games.get(roomCode);
    if (game && (game.phase === 'lobby' || game.phase === 'game_over')) {
      // Safe to free the seat outside of active play.
      game.removePlayer(token);
      tokenToRoom.delete(token);
      if (game.players.length > 0) {
        broadcastGameState(roomCode);
      } else {
        games.delete(roomCode);
      }
    }
    // Mid-game: keep the seat so the player can `resume` into it.
    console.log(`Socket ${socket.id} disconnected (token ${token.slice(0, 8)})`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Skull King server running on http://0.0.0.0:${PORT}`);
});
