// Add gift guide UI translation keys to translations.json
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'translations.json');
const tr = JSON.parse(fs.readFileSync(file, 'utf8'));

const en = {
  nav_recipe_finder: 'Recipe Finder',
  nav_gifts: 'Gifts',
  gifts_villagers: 'Villagers',
  gifts_tracked: 'Gifts tracked',
  gifts_romanceable: 'Romanceable',
  gifts_romanceable_badge: 'Romanceable',
  gifts_love: 'Loved',
  gifts_like: 'Liked',
  gifts_hate: 'Hated',
  gifts_none: 'None',
  gifts_detail_placeholder: 'Click a gift to see its details.',
};

const es = {
  nav_recipe_finder: 'Buscador de recetas',
  nav_gifts: 'Regalos',
  gifts_villagers: 'Aldeanos',
  gifts_tracked: 'Regalos',
  gifts_romanceable: 'Romanceables',
  gifts_romanceable_badge: 'Romanceable',
  gifts_love: 'Adoran',
  gifts_like: 'Gustan',
  gifts_hate: 'Odian',
  gifts_none: 'Ninguno',
  gifts_detail_placeholder: 'Haz clic en un regalo para ver su detalle.',
};

tr.en.ui = Object.assign({}, tr.en.ui, en);
tr.es.ui = Object.assign({}, tr.es.ui, es);

fs.writeFileSync(file, JSON.stringify(tr, null, 2) + '\n');
console.log('Added gift keys to', file);