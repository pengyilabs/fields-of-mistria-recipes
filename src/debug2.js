const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const html = fs.readFileSync(path.join(__dirname, '..', 'info', 'cooking_full.html'), 'utf8');
const $ = cheerio.load(html);
function clean(t){return t.replace(/\[edit\s*\|\s*source\]/i,'').split('\n').join(' ').trim();}
$('h2').each((_,h)=>{ console.log(JSON.stringify(clean($(h).text())), '|| len', clean($(h).text()).length); });