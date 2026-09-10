// Fields of Mistria Recipe Finder
let DATA = [];
let ING = {};            // name(lower) -> { name, img, used:[{recipe,qty}] }
let CATORDER = [];
let ingNames = [];       // sorted unique ingredient names

const state = { mode: 'recipes', q: '', ing: null };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildIndex() {
  const cats = [];
  DATA.forEach((r) => {
    if (!cats.includes(r.category)) cats.push(r.category);
    const set = new Set();
    r.ingredients.forEach((i) => {
      const k = i.name.toLowerCase();
      if (!ING[k]) ING[k] = { name: i.name, img: i.img, used: [] };
      const sig = k + '|' + r.name;
      if (!set.has(sig)) {
        set.add(sig);
        ING[k].used.push({ recipe: r.name, qty: i.qty });
      }
    });
  });
  CATORDER = cats;
  ingNames = Object.keys(ING).sort();
}

function recipeUsesIng(r, ingLower) {
  return r.ingredients.some((i) => i.name.toLowerCase() === (ingLower || 'no'));
}

function matchedRecipes() {
  const q = state.q.trim().toLowerCase();
  return DATA.filter((r) => {
    if (state.ing && !recipeUsesIng(r, state.ing.toLowerCase())) return false;
    if (!q) return true;
    if (r.name.toLowerCase().includes(q)) return true;
    return r.ingredients.some((i) => i.name.toLowerCase().includes(q));
  });
}

/* ---------- rendering ---------- */

function renderStats() {
  const totalIng = Object.keys(ING).length;
  $('#stats').innerHTML =
    `<div class="stat-chip"><b>${DATA.length}</b><span>Recipes</span></div>
     <div class="stat-chip"><b>${totalIng}</b><span>Ingredients</span></div>
     <div class="stat-chip"><b>${CATORDER.length}</b><span>Categories</span></div>`;
}

function renderBanner() {
  let banner = $('#filter-banner');
  if (!state.ing) {
    if (banner) banner.remove();
    return;
  }
  const n = matchedRecipes().length;
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'filter-banner';
    banner.className = 'filter-banner';
    const host = $('#foodlist');
    host.parentNode.insertBefore(banner, host);
  }
  const ing = ING[state.ing.toLowerCase()];
  banner.innerHTML =
    `<img class="fb-ico" src="${esc(ing.img)}" alt="">` +
    `<div class="fb-txt"><b>${esc(ing.name)}</b> is used in <b>${n}</b> recipe${n === 1 ? '' : 's'}</div>` +
    `<button class="clear-banner">Clear filter</button>`;
  $('.clear-banner', banner).onclick = () => { state.ing = null; render(); };
}

function chipHTML(i) {
  return `<span class="chip" data-ing="${esc(i.name.toLowerCase())}" title="Show recipes using ${esc(i.name)}">
    <img src="${esc(i.img)}" alt="">${esc(i.name)}<b class="qty">×${i.qty}</b>
  </span>`;
}

function cardHTML(r) {
  const meta = [r.sell].filter(Boolean).map((x) => `<span class="pill">💰 <b>${esc(x)}</b></span>`)
    .concat(r.time ? [`<span class="pill">⏱ ${esc(r.time)}</span>`] : []);
  return `<article class="card" data-name="${esc(r.name.toLowerCase())}">
    <div class="card-top">
      ${r.subcategory ? `<span class="sub-badge">${esc(r.subcategory)}</span>` : ''}
      <img class="recipe" src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy">
    </div>
    <div class="card-body">
      <h3>${esc(r.name)}</h3>
      <div class="chips">${r.ingredients.map(chipHTML).join('')}</div>
      <div class="card-meta">${meta.join('')}</div>
    </div>
  </article>`;
}

function renderRecipes() {
  const list = matchedRecipes();
  $('#empty').classList.toggle('hidden', list.length > 0);
  if (!list.length) { $('#foodlist').innerHTML = ''; return; }

  const byCat = {};
  list.forEach((r) => { (byCat[r.category] = byCat[r.category] || []).push(r); });

  let html = '';
  CATORDER.filter((c) => byCat[c]).forEach((c) => {
    const items = byCat[c];
    html += `<div class="category"><h2>${esc(c)} <span class="count">${items.length}</span></h2>
      <div class="recipe-grid">${items.map(cardHTML).join('')}</div></div>`;
  });
  $('#foodlist').innerHTML = html;
}

function renderIngredients() {
  const q = state.q.trim().toLowerCase();
  const matches = q
    ? ingNames.filter((k) => ING[k].name.toLowerCase().includes(q))
    : ingNames;
  const sorted = matches
    .map((k) => ING[k])
    .sort((a, b) => b.used.length - a.used.length || a.name.localeCompare(b.name));

  $('#empty').classList.toggle('hidden', sorted.length > 0);
  $('#foodlist').innerHTML = `<div class="category"><h2>Shopping by ingredient <span class="count">${sorted.length}</span></h2>
    <p class="tagline" style="margin:0 0 12px;color:var(--ink-soft)">Click an ingredient to see every recipe that uses it.</p>
    <div class="ing-grid">
      ${sorted.map((ing) => `
        <div class="ing-item" data-ing="${esc(ing.name.toLowerCase())}">
          <img src="${esc(ing.img)}" alt="">
          <div class="grow">
            <div class="i-name">${esc(ing.name)}</div>
            <div class="i-count">${ing.used.length} recipe${ing.used.length === 1 ? '' : 's'}</div>
          </div>
          <span class="i-arrow">→</span>
        </div>`).join('')}
    </div></div>`;
}

function render() {
  renderStats();
  renderBanner();
  if (state.mode === 'ingredients') renderIngredients();
  else renderRecipes();
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === state.mode));
  $('#clear-search').classList.toggle('show', !!state.q);
}

/* ---------- events ---------- */

function bind() {
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#clear-search').addEventListener('click', () => { state.q = ''; $('#search').value = ''; render(); });
  $$('.tab').forEach((t) => t.addEventListener('click', () => { state.mode = t.dataset.mode; render(); }));

  // event delegation for ingredient clicks (chips + ingredient items)
  $('#foodlist').addEventListener('click', (e) => {
    const el = e.target.closest('[data-ing]');
    if (!el) return;
    state.ing = el.dataset.ing;
    state.mode = 'recipes';
    state.q = '';
    $('#search').value = '';
    render();
    $('#foodlist').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

(async () => {
  const res = await fetch('data.json');
  DATA = await res.json();
  buildIndex();
  bind();
  render();
})().catch((err) => {
  $('#foodlist').innerHTML = `<div class="empty">Could not load recipe data: ${esc(err.message)}</div>`;
});