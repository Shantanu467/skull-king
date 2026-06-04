import { SUIT_META, SPECIAL_META } from '../cards.js';

export default function Card({ card, small, disabled, dim, selected, onClick }) {
  if (!card) return null;
  const isNumbered = card.type === 'numbered';
  const meta = isNumbered ? SUIT_META[card.suit] : SPECIAL_META[card.type];
  const color = (meta && meta.color) || '#fff';
  const isTrump = isNumbered && card.suit === 'black';

  const classes = [
    'card',
    small ? 'card-small' : '',
    isTrump ? 'card-trump' : '',
    !isNumbered ? 'card-special' : '',
    dim ? 'card-dim' : '',
    selected ? 'card-selected' : '',
    onClick && !disabled ? 'card-clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ '--card-color': color }}
      onClick={!disabled && onClick ? onClick : undefined}
      title={meta ? (isNumbered ? `${meta.name} ${card.rank}` : meta.label) : ''}
    >
      {isNumbered ? (
        <>
          <span className="card-corner card-corner-tl">{card.rank}</span>
          <span className="card-face-icon">{meta && meta.icon}</span>
          <span className="card-corner card-corner-br">{card.rank}</span>
          {isTrump && <span className="card-trump-badge">TRUMP</span>}
        </>
      ) : (
        <>
          <span className="card-face-icon card-face-icon-big">{meta && meta.icon}</span>
          <span className="card-special-label">{meta && meta.label}</span>
        </>
      )}
    </div>
  );
}
