import { useState } from 'react';
import socket from '../socket.js';

export default function BidPanel({ maxBid }) {
  const [bid, setBid] = useState(null);

  function submit() {
    if (bid === null) return;
    socket.emit('place_bid', { bid });
  }

  // For small hands, show tappable number chips; that's the fastest on a phone.
  const options = Array.from({ length: maxBid + 1 }, (_, i) => i);

  return (
    <div className="bid-panel">
      <h3 className="bid-title">How many tricks will you win?</h3>
      <p className="bid-hint">Pick a number from 0 to {maxBid}</p>
      <div className="bid-chips">
        {options.map(n => (
          <button
            key={n}
            className={`bid-chip ${bid === n ? 'bid-chip-active' : ''}`}
            onClick={() => setBid(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-block" disabled={bid === null} onClick={submit}>
        {bid === null ? 'Choose your bid' : `Lock in bid: ${bid}`}
      </button>
    </div>
  );
}
