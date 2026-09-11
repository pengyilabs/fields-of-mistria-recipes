const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'translations.json');
const tr = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Add sort UI keys
tr.en.ui.sort_az = 'A-Z';
tr.en.ui.sort_default = 'Default';
tr.en.ui.sort_by_category = 'By category';
tr.en.ui.sort_alpha = 'Alphabetical';

tr.es.ui.sort_az = 'A-Z';
tr.es.ui.sort_default = 'Por defecto';
tr.es.ui.sort_by_category = 'Por categoría';
tr.es.ui.sort_alpha = 'Alfabético';

fs.writeFileSync(filePath, JSON.stringify(tr, null, 2), 'utf8');
console.log('Added sort keys. en.ui keys:', Object.keys(tr.en.ui).length, 'es.ui keys:', Object.keys(tr.es.ui).length);