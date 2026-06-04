// Shared visual metadata for Skull King cards (suits + special cards).

export const SUIT_META = {
  green:  { color: '#2ecc71', icon: '🦜', name: 'Parrot' },
  yellow: { color: '#f1c40f', icon: '💰', name: 'Treasure' },
  purple: { color: '#a55eea', icon: '🗺️', name: 'Map' },
  black:  { color: '#cfd8e3', icon: '☠️', name: 'Jolly Roger', trump: true },
};

export const SPECIAL_META = {
  escape:      { color: '#9aa6b2', icon: '🏳️',  label: 'Escape' },
  pirate:      { color: '#e67e22', icon: '⚔️',  label: 'Pirate' },
  mermaid:     { color: '#1abc9c', icon: '🧜‍♀️', label: 'Mermaid' },
  skull_king:  { color: '#e74c3c', icon: '👑',  label: 'Skull King' },
  white_whale: { color: '#74b9ff', icon: '🐳',  label: 'White Whale' },
};

export function cardLabel(card) {
  if (card.type === 'numbered') {
    const meta = SUIT_META[card.suit];
    return `${meta ? meta.name : card.suit} ${card.rank}`;
  }
  const meta = SPECIAL_META[card.type];
  return meta ? meta.label : card.type;
}
