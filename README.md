# ☠ Skull King — online multiplayer

Play the pirate trick-taking game **Skull King** with friends in different cities,
straight from a phone or laptop browser. Create a room, share the 4-letter code (or
a link), bid, and play full official-rules rounds with the black Jolly Roger trump
suit, Pirates, Mermaids, the Skull King, Escapes, and bonus scoring.

- **Backend:** Node.js + Express + Socket.io
- **Frontend:** React + Vite
- **Tests:** Vitest (game engine)

---

## Quick start (play tonight, hosted from your laptop)

The app already works across the internet — the only missing piece was a **public
address** for your laptop. A free tunnel gives you one in seconds.

### 1. Install (first time only)

```bash
npm install
npm install --prefix client
```

### 2. Build + run the server

```bash
npm run serve
```

This builds the client and serves everything (game + Socket.io) on
**http://localhost:3000**.

### 3. Expose it with a tunnel

In a **second terminal**, run one of:

```bash
# Cloudflare (free, no account):
cloudflared tunnel --url http://localhost:3000

# or ngrok:
ngrok http 3000
```

It prints a public HTTPS URL like `https://something.trycloudflare.com`.
**Share that URL** with your friends. They open it, enter the room code you give
them, and play. (HTTPS matters — phones block insecure WebSocket connections.)

> Keep both terminals running while you play. The tunnel URL changes each time you
> start it, so share the current one.

---

## Testing it yourself (2 players on one machine)

Open the URL in **two different browsers** (e.g. Chrome + Firefox) or one normal
window + one **incognito/private** window. Each window gets its own player.

Don't use two tabs of the *same* browser — they share the same reconnection
identity (stored in `localStorage`), so they'd be treated as the same seat.

---

## Reconnecting

Each browser keeps a stable identity, so if your phone drops signal or you reload
the page mid-game, you automatically slip back into your seat with your hand and
score intact. Other players' seats are held while they reconnect, too.

---

## Local development

```bash
npm run dev
```

Runs the server (port 3000) and the Vite dev server (port 5173) together; open
http://localhost:5173. Vite proxies Socket.io to the backend.

## Tests

```bash
npm test
```

Covers the deck, follow-suit/trump trick resolution, the special-card hierarchy
(Mermaid > Skull King > Pirate > Mermaid), and bid-gated bonus scoring.

---

## Later: a permanent cloud URL

When you're playing often and want an always-on link (laptop off, URL never
changes), deploy to a free host such as **Render**, **Railway**, or **Fly.io**:

- Push this repo to GitHub.
- Create a Web Service from the repo.
- **Build command:** `npm install && npm run build`
- **Start command:** `NODE_ENV=production node server.js`
- The server already reads `PORT` from the environment and binds `0.0.0.0`, and the
  client connects to its own origin — **no code changes needed**.

You'll get a permanent URL like `https://skull-king.onrender.com` to share anytime.

---

## How the game plays (official rules summary)

- **Rounds:** round *N* deals *N* cards. Standard game is 10 rounds.
- **Bidding:** each player secretly bids how many tricks they'll win (0 up to their
  hand size). Unlike Oh-Hell/Wizard, bids may total anything.
- **Suits:** three colored suits (Parrot 🦜 / Treasure 💰 / Map 🗺️), 1–14, plus the
  black **Jolly Roger** trump suit ☠️, 1–14, which beats all colored suits.
- **Following suit:** you must follow the led suit if you can; special cards are
  always legal. Off-suit greyed cards can't be played.
- **Special cards:** Skull King 👑 beats Pirates ⚔️; Pirates beat Mermaids 🧜‍♀️;
  Mermaids beat the Skull King. All beat number cards. Escapes 🏳️ always lose.
- **Scoring:** hit your exact bid → 20 × bid (or 10 × round for a perfect 0 bid).
  Miss → −10 per trick off (or −10 × round for a missed 0 bid). **Bonuses** (only if
  you hit your bid): colored 14 +10, black 14 +20, Skull King capturing each Pirate
  +30, a Mermaid capturing the Skull King +40.
