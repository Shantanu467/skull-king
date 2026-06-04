import { useState } from 'react';
import { SUIT_META, SPECIAL_META } from '../cards.js';

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="help-fab"
        onClick={() => setOpen(true)}
        aria-label="How to play"
        title="How to play & card guide"
      >
        ?
      </button>

      {open && (
        <div className="help-overlay" onClick={() => setOpen(false)}>
          <div className="help-panel" onClick={e => e.stopPropagation()}>
            <div className="help-head">
              <h2>How to play</h2>
              <button className="help-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <h3>Goal</h3>
            <p className="help-text">
              Each round you're dealt cards (round 1 → 1 card, round 2 → 2 …). Secretly
              <b> bid</b> how many tricks you'll win, then play them out. Hit your bid
              exactly to score big.
            </p>

            <h3>Suits</h3>
            <div className="help-suits">
              {Object.entries(SUIT_META).map(([key, m]) => (
                <span key={key} className="help-suit" style={{ color: m.color }}>
                  {m.icon} {m.name}{m.trump ? ' (trump)' : ''}
                </span>
              ))}
            </div>
            <p className="help-text">
              You must <b>follow the led suit</b> if you can. The black <b>Jolly Roger</b>
              {' '}suit is trump — it beats all colored suits.
            </p>

            <h3>Card power (high → low)</h3>
            <ol className="help-list">
              <li>{SPECIAL_META.skull_king.icon} Skull King — beats pirates & numbers</li>
              <li>{SPECIAL_META.pirate.icon} Pirates — beat mermaids & numbers</li>
              <li>{SPECIAL_META.mermaid.icon} Mermaids — beat the Skull King!</li>
              <li>☠️ Black trump numbers</li>
              <li>Led-suit numbers (highest wins)</li>
              <li>{SPECIAL_META.escape.icon} Escape — always loses</li>
            </ol>
            <p className="help-text">
              It's a loop: Skull King &gt; Pirate &gt; Mermaid &gt; Skull King. First card
              played wins ties.
            </p>
            <p className="help-text">
              {SPECIAL_META.white_whale.icon} <b>White Whale:</b> cancels all special
              cards — the highest <b>number</b> card wins the trick (any suit). If no
              number cards were played, no one wins the trick.
            </p>

            <h3>Scoring</h3>
            <ul className="help-list">
              <li><b>Hit your bid:</b> +20 per trick (or +10 × round for a perfect 0 bid).</li>
              <li><b>Miss:</b> −10 per trick off (or −10 × round for a missed 0 bid).</li>
              <li><b>Bonuses (only if you hit your bid):</b> colored 14 +10, black 14 +20,
                Skull King taking each Pirate +30, a Mermaid taking the Skull King +40.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
