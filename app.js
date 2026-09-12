// Fields of Mistria — Recipe Finder + Gifts (i18n + sort + gifts)
let DATA = [];
let ING = {};
let CATORDER = [];
let ingNames = [];
let RECIPES = {};
let TR = { en: {}, es: {} };
let GIFTS = null;

const GTIER = [
  { key: 'love', cls: 'love' },
  { key: 'like', cls: 'like' },
  { key: 'hate', cls: 'hate' },
];

const state = {
  page: 'recipes',       // 'recipes' | 'gifts'
  mode: 'recipes',       // recipes page internal: 'recipes' | 'ingredients'
  q: '', ing: null, lang: 'es', sort: 'default',
  char: null,            // selected character for gifts page
  selItem: null,         // selected gift item
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// --- translation helpers ---
function t(key) {
  return (TR[state.lang] && TR[state.lang].ui && TR[state.lang].ui[key]) || key;
}

function tRecipe(name) {
  if (!TR[state.lang] || !TR[state.lang].recipes) return name;
  return TR[state.lang].recipes[name] || name;
}

function tIng(name) {
  if (!TR[state.lang] || !TR[state.lang].ingredients) return name;
  return TR[state.lang].ingredients[name] || name;
}

function tCat(name) {
  if (!TR[state.lang] || !TR[state.lang].categories) return name;
  return TR[state.lang].categories[name] || name;
}

function tSub(name) {
  if (!TR[state.lang] || !TR[state.lang].subcategories) return name;
  return TR[state.lang].subcategories[name] || name;
}

// A gift item name: prefer recipe/ingredient translation, else the raw name.
function tItem(name) {
  const inRecipes = TR[state.lang] && TR[state.lang].recipes && TR[state.lang].recipes[name];
  if (inRecipes) return inRecipes;
  const inIng = TR[state.lang] && TR[state.lang].ingredients && TR[state.lang].ingredients[name];
  return inIng || name;
}

// Build ingredient usage index from English names
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
    if (tRecipe(r.name).toLowerCase().includes(q)) return true;
    return r.ingredients.some((i) => {
      const enLow = i.name.toLowerCase();
      const esLow = tIng(i.name).toLowerCase();
      return enLow.includes(q) || esLow.includes(q);
    });
  });
}

/* ---------- rendering ---------- */

function renderStaticUI() {
  const lang = state.lang;
  const ui = TR[lang] && TR[lang].ui || {};
  document.documentElement.lang = lang;

  const st = $('#site-title');
  if (st) {
    st.innerHTML = state.page === 'gifts'
      ? (lang === 'es' ? 'Campos de Mistria <span>Regalos de los Aldeanos</span>' : 'Fields of Mistria <span>Gift Guide</span>')
      : (lang === 'es' ? 'Campos de Mistria <span>Buscador de Recetas</span>' : 'Fields of Mistria <span>Recipe Finder</span>');
  }

  const tag = $('#site-tagline');
  if (tag) {
    tag.textContent = state.page === 'gifts'
      ? (lang === 'es' ? 'Descubre qué regalos adoran, gustan y odian cada aldeano.' : 'Discover what every villager loves, likes, and hates.')
      : (ui.tagline || 'Browse every cooking recipe and see exactly which recipes use any ingredient.');
  }

  const search = $('#search');
  if (search) search.placeholder = ui.search_placeholder || 'Search a recipe or ingredient\u2026';

  const tabR = $('#tab-recipes');
  const tabI = $('#tab-ingredients');
  if (tabR) tabR.textContent = ui.recipes || 'Recipes';
  if (tabI) tabI.textContent = ui.ingredients || 'Ingredients';

  const emptyMsg = $('#empty-msg');
  if (emptyMsg) emptyMsg.textContent = ui.no_recipes || 'No recipes found.';

  const footer = $('#footer-text');
  if (footer) {
    const wikiLabel = lang === 'es' ? 'wiki de Campos de Mistria' : 'Fields of Mistria wiki';
    const dataLabel = lang === 'es' ? 'Datos obtenidos de la' : 'Data sourced from the';
    const fanLabel = lang === 'es' ? 'Herramienta no oficial de fans.' : 'Unofficial fan tool.';
    footer.innerHTML = `${dataLabel} <a href="https://fieldsofmistria.wiki.gg/wiki/Characters" target="_blank" rel="noopener">${wikiLabel}</a>. ${fanLabel}`;
  }

  document.title = state.page === 'gifts'
    ? (lang === 'es' ? 'Campos de Mistria \u2014 Regalos de los Aldeanos' : 'Fields of Mistria \u2014 Gift Guide')
    : (lang === 'es' ? 'Campos de Mistria \u2014 Buscador de Recetas' : 'Fields of Mistria \u2014 Recipe Finder');

  const btn = $('#lang-toggle');
  if (btn) {
    btn.textContent = lang === 'es' ? 'EN' : 'ES';
    btn.title = lang === 'es' ? 'English' : 'Espa\u00f1ol';
  }

  // sort button label (recipes page only)
  const sortBtn = $('#sort-toggle');
  const sortLabel = $('#sort-label');
  if (sortBtn && sortLabel) {
    const isActive = state.sort === 'alpha';
    sortBtn.classList.toggle('active', isActive);
    if (isActive) {
      const defaultLabel = state.mode === 'recipes' ? (ui.sort_by_category || 'By category') : (ui.sort_by_category || 'By usage');
      sortLabel.textContent = defaultLabel;
      sortBtn.title = defaultLabel;
    } else {
      const alphaLabel = ui.sort_az || 'A-Z';
      sortLabel.textContent = alphaLabel;
      sortBtn.title = ui.sort_alpha || 'Alphabetical';
    }
  }

  // nav rail active state
  $$('.rail-btn').forEach((b) => b.classList.toggle('active', b.dataset.page === state.page));
  const railTitles = { recipes: t('nav_recipe_finder'), gifts: t('nav_gifts') };
  $$('.rail-btn').forEach((b) => { if (railTitles[b.dataset.page]) b.title = railTitles[b.dataset.page]; });
}

function renderStats() {
  const ui = TR[state.lang] && TR[state.lang].ui || {};
  if (state.page === 'gifts' && GIFTS) {
    const totalIng = new Set();
    Object.values(GIFTS.gifts).forEach((tiers) => Object.values(tiers).forEach((arr) => arr.forEach((n) => totalIng.add(n))));
    const rom = GIFTS.characters.filter((c) => c.romanceable).length;
    $('#stats').innerHTML =
      `<div class="stat-chip"><b>${GIFTS.characters.length}</b><span>${ui.gifts_villagers || 'Villagers'}</span></div>
       <div class="stat-chip"><b>${totalIng.size}</b><span>${ui.gifts_tracked || 'Gifts tracked'}</span></div>
       <div class="stat-chip"><b>${rom}</b><span>${ui.gifts_romanceable || 'Romanceable'}</span></div>`;
    return;
  }
  const totalIng = Object.keys(ING).length;
  $('#stats').innerHTML =
    `<div class="stat-chip"><b>${DATA.length}</b><span>${ui.recipes || 'Recipes'}</span></div>
     <div class="stat-chip"><b>${totalIng}</b><span>${ui.ingredients || 'Ingredients'}</span></div>
     <div class="stat-chip"><b>${CATORDER.length}</b><span>${ui.categories || 'Categories'}</span></div>`;
}

function renderBanner() {
  let banner = $('#filter-banner');
  if (!state.ing) {
    if (banner) banner.remove();
    return;
  }
  const n = matchedRecipes().length;
  const ui = TR[state.lang] && TR[state.lang].ui || {};
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'filter-banner';
    banner.className = 'filter-banner';
    const host = $('#foodlist');
    host.parentNode.insertBefore(banner, host);
  }
  const ing = ING[state.ing.toLowerCase()];
  const ingDisplayName = tIng(ing.name);
  const usedIn = ui.is_used_in || 'is used in';
  const recipeWord = n === 1 ? (ui.recipe || 'recipe') : (ui.recipes_plural || 'recipes');
  const clearLabel = ui.clear_filter || 'Clear filter';
  banner.innerHTML =
    `<img class="fb-ico" src="${esc(ing.img)}" alt="">` +
    `<div class="fb-txt"><b>${esc(ingDisplayName)}</b> ${usedIn} <b>${n}</b> ${recipeWord}</div>` +
    `<button class="clear-banner">${clearLabel}</button>`;
  $('.clear-banner', banner).onclick = () => { state.ing = null; render(); };
}

function chipHTML(i) {
  const displayName = tIng(i.name);
  return `<span class="chip" data-ing="${esc(i.name.toLowerCase())}" title="${esc(displayName)}">
    <img src="${esc(i.img)}" alt="">${esc(displayName)}<b class="qty">\u00d7${i.qty}</b>
  </span>`;
}

function cardHTML(r) {
  const displayName = tRecipe(r.name);
  const displaySub = r.subcategory ? tSub(r.subcategory) : '';
  const meta = [r.sell].filter(Boolean).map((x) => `<span class="pill">\ud83d\udcb0 <b>${esc(x)}</b></span>`)
    .concat(r.time ? [`<span class="pill">\u23f1 ${esc(r.time)}</span>`] : []);
  return `<article class="card" data-name="${esc(r.name.toLowerCase())}">
    <div class="card-top">
      ${displaySub ? `<span class="sub-badge">${esc(displaySub)}</span>` : ''}
      <img class="recipe" src="${esc(r.image)}" alt="${esc(displayName)}" loading="lazy">
    </div>
    <div class="card-body">
      <h3>${esc(displayName)}</h3>
      <div class="chips">${r.ingredients.map(chipHTML).join('')}</div>
      <div class="card-meta">${meta.join('')}</div>
    </div>
  </article>`;
}

function renderRecipes() {
  const list = matchedRecipes();
  const ui = TR[state.lang] && TR[state.lang].ui || {};
  $('#empty').classList.toggle('hidden', list.length > 0);
  if (!list.length) { $('#foodlist').innerHTML = ''; return; }

  if (state.sort === 'alpha') {
    const sorted = [...list].sort((a, b) => tRecipe(a.name).localeCompare(tRecipe(b.name), state.lang));
    const allLabel = ui.recipes || 'Recetas';
    let html = `<div class="category"><h2>${esc(allLabel)} <span class="count">${sorted.length}</span></h2>
      <div class="recipe-grid">${sorted.map(cardHTML).join('')}</div></div>`;
    $('#foodlist').innerHTML = html;
  } else {
    const byCat = {};
    list.forEach((r) => { (byCat[r.category] = byCat[r.category] || []).push(r); });

    let html = '';
    CATORDER.filter((c) => byCat[c]).forEach((c) => {
      const items = byCat[c];
      const catDisplay = tCat(c);
      html += `<div class="category"><h2>${esc(catDisplay)} <span class="count">${items.length}</span></h2>
        <div class="recipe-grid">${items.map(cardHTML).join('')}</div></div>`;
    });
    $('#foodlist').innerHTML = html;
  }
}

function renderIngredients() {
  const q = state.q.trim().toLowerCase();
  const ui = TR[state.lang] && TR[state.lang].ui || {};
  const matches = q
    ? ingNames.filter((k) => {
        const enLow = ING[k].name.toLowerCase();
        const esLow = tIng(ING[k].name).toLowerCase();
        return enLow.includes(q) || esLow.includes(q);
      })
    : ingNames;

  let sorted;
  if (state.sort === 'alpha') {
    sorted = matches
      .map((k) => ING[k])
      .sort((a, b) => tIng(a.name).localeCompare(tIng(b.name), state.lang));
  } else {
    sorted = matches
      .map((k) => ING[k])
      .sort((a, b) => b.used.length - a.used.length || a.name.localeCompare(b.name));
  }

  const shoppingLabel = ui.shopping_by_ingredient || 'Shopping by ingredient';
  const clickLabel = ui.click_ingredient || 'Click an ingredient to see every recipe that uses it.';
  const recipeSingular = ui.recipe || 'recipe';
  const recipePlural = ui.recipes_plural || 'recipes';

  $('#empty').classList.toggle('hidden', sorted.length > 0);
  $('#foodlist').innerHTML = `<div class="category"><h2>${esc(shoppingLabel)} <span class="count">${sorted.length}</span></h2>
    <p class="tagline" style="margin:0 0 12px;color:var(--ink-soft)">${esc(clickLabel)}</p>
    <div class="ing-grid">
      ${sorted.map((ing) => {
        const displayName = tIng(ing.name);
        const countWord = ing.used.length === 1 ? recipeSingular : recipePlural;
        return `
        <div class="ing-item" data-ing="${esc(ing.name.toLowerCase())}">
          <img src="${esc(ing.img)}" alt="">
          <div class="grow">
            <div class="i-name">${esc(displayName)}</div>
            <div class="i-count">${ing.used.length} ${countWord}</div>
          </div>
          <span class="i-arrow">\u2192</span>
        </div>`;
      }).join('')}
    </div></div>`;
}

/* ---------- gifts ---------- */

function firstGiftFor(char) {
  for (const gt of GTIER) {
    const items = giftItemsFor(char, gt.key);
    if (items.length) return items[0];
  }
  return null;
}

function ensureCharSelected() {
  if (!GIFTS) return;
  if (!state.char || !GIFTS.characters.some((c) => c.name === state.char)) {
    const first = GIFTS.characters.find((c) => c.romanceable) || GIFTS.characters[0];
    state.char = first ? first.name : null;
    state.selItem = firstGiftFor(state.char);
  }
}

function giftItemsFor(char, tier) {
  return (GIFTS.gifts[char] && GIFTS.gifts[char][tier]) || [];
}

function itemTier(name, char) {
  for (const gt of GTIER) {
    if (giftItemsFor(char, gt.key).includes(name)) return gt;
  }
  return null;
}

function renderCharRail() {
  const rail = $('#char-rail');
  const html = GIFTS.characters.map((c) =>
    `<button class="char-thumb ${c.name === state.char ? 'active' : ''}" data-char="${esc(c.name)}" data-name="${esc(c.name)}" title="${esc(c.name)}">
      <img src="${esc(c.portrait)}" alt="${esc(c.name)}" loading="lazy">${c.romanceable ? '<span class="rom-dot" title=""></span>' : ''}
      <span class="char-label">${esc(c.name)}</span>
    </button>`
  ).join('');
  rail.innerHTML = html;
}

function renderCharHead() {
  const c = GIFTS.characters.find((x) => x.name === state.char);
  if (!c) return;
  const badge = c.romanceable ? `<span class="rom-badge">\u2661 ${esc(t('gifts_romanceable_badge'))}</span>` : '';
  const birthdayLabel = t('gifts_birthday') || 'Birthday';
  const birthLine = c.birth ? `<span class="ch-birth">\ud83c\udf82 ${esc(birthdayLabel)}: ${esc(c.birth)}</span>` : '';
  $('#char-head').innerHTML = `
    <div class="port"><img src="${esc(c.portrait)}" alt="${esc(c.name)}"></div>
    <div class="ch-meta">
      <h2>${esc(c.name)} ${badge}</h2>
      <div class="ch-details">
        ${c.occupation ? `<span class="occ">${esc(c.occupation)}</span>` : ''}
        ${birthLine}
      </div>
    </div>`;
}

function renderGiftGroups() {
  const host = $('#gift-groups');
  const noneLabel = t('gifts_none') || 'None';
  let html = '';
  for (const gt of GTIER) {
    const items = giftItemsFor(state.char, gt.key);
    const label = t('gifts_' + gt.key);
    const tiles = items.length
      ? items.map((name) => {
          const it = GIFTS.items[name];
          const icon = it && it.icon
            ? `<img src="${esc(it.icon)}" alt="">`
            : `<span class="no-img">?</span>`;
          const sel = state.selItem === name ? ' selected' : '';
          return `<button class="gift-item${sel}" data-item="${esc(name)}" title="${esc(tItem(name))}">
            ${icon}<span class="g-name">${esc(tItem(name))}</span>
          </button>`;
        }).join('')
      : `<p class="tagline" style="margin:0;color:var(--ink-soft);font-family:'Segoe UI',Arial,sans-serif;font-size:13px">— ${esc(noneLabel)} —</p>`;
    html += `<section class="gift-group ${gt.cls}">
      <h3><span class="glabel">${esc(label)}</span><span class="gcount">${items.length}</span></h3>
      <div class="gift-grid">${tiles}</div>
    </section>`;
  }
  host.innerHTML = html;
}

function renderItemDetail() {
  const host = $('#item-detail');
  const mobile = window.innerWidth <= 768;
  if (!state.selItem) {
    host.innerHTML = `<div class="id-empty">${esc(t('gifts_detail_placeholder'))}</div>`;
    if (mobile) closeModal();
    return;
  }
  const it = GIFTS.items[state.selItem];
  const gt = itemTier(state.selItem, state.char);
  const tierLabel = gt ? t('gifts_' + gt.key) : '';
  const icon = it && it.icon ? `<img src="${esc(it.icon)}" alt="">` : '<span style="opacity:.4">?</span>';
  const desc = it ? it.desc : '';

  // recipe ingredients: look up this item in the recipe index
  const recipeKey = state.selItem.toLowerCase();
  const recipeData = RECIPES[recipeKey];
  let ingredientsHTML = '';
  if (recipeData && recipeData.ingredients && recipeData.ingredients.length) {
    const ingsLabel = t('gifts_ingredients') || 'Ingredients';
    const items = recipeData.ingredients.map((i) => {
      const ingName = tIng(i.name);
      return `<div class="id-ing-row">
        <img class="id-ing-img" src="${esc(i.img)}" alt="">
        <span class="id-ing-name">${esc(ingName)}</span>
        <span class="id-ing-qty">\u00d7${i.qty}</span>
      </div>`;
    }).join('');
    ingredientsHTML = `
      <div class="id-recipe-ings">
        <div class="id-recipe-ings-header">${esc(ingsLabel)}</div>
        <div class="id-recipe-ings-list">${items}</div>
      </div>`;
  }

  const detailHTML = `
    <div class="id-top">
      <div class="id-icon">${icon}</div>
      <div>
        <div class="id-name">${esc(tItem(state.selItem))}</div>
        ${gt ? `<span class="id-tier ${esc(gt.cls)}">${esc(tierLabel)}</span>` : ''}
      </div>
    </div>
    ${desc ? `<p class="id-desc">${esc(desc)}</p>` : ''}
    ${ingredientsHTML}`;

  // desktop: inline panel; mobile: bottom-sheet modal
  host.innerHTML = detailHTML;
  if (mobile) {
    $('#gift-modal-body').innerHTML = detailHTML;
    openModal();
  }
}

function renderGiftsPage() {
  ensureCharSelected();
  if (!state.char) return;
  renderCharRail();
  renderCharHead();
  renderGiftGroups();
  // only render inline detail on desktop (mobile uses modal)
  if (window.innerWidth > 768) renderItemDetail();
}

/* ---------- mobile modal ---------- */

function openModal() {
  const overlay = $('#gift-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeModal() {
  const overlay = $('#gift-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

/* ---------- main render ---------- */

function render() {
  renderStaticUI();
  renderStats();

  const pageRecipes = $('#page-recipes');
  const pageGifts = $('#page-gifts');
  pageRecipes.classList.toggle('hidden', state.page !== 'recipes');
  pageGifts.classList.toggle('hidden', state.page !== 'gifts');
  document.body.classList.toggle('gifts-mode', state.page === 'gifts');

  if (state.page === 'gifts') {
    if (GIFTS) renderGiftsPage();
    return;
  }

  renderBanner();
  if (state.mode === 'ingredients') renderIngredients();
  else renderRecipes();
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === state.mode));
  $('#clear-search').classList.toggle('show', !!state.q);
  $$('.rail-btn').forEach((b) => b.classList.toggle('active', b.dataset.page === state.page));
}

/* ---------- events ---------- */

function bind() {
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#clear-search').addEventListener('click', () => { state.q = ''; $('#search').value = ''; render(); });
  $$('.tab').forEach((t) => t.addEventListener('click', () => { state.mode = t.dataset.mode; render(); }));

  // page navigation (side rail)
  $$('.rail-btn').forEach((b) => b.addEventListener('click', () => {
    state.page = b.dataset.page;
    if (state.page === 'recipes') {
      state.q = ''; $('#search').value = '';
    }
    render();
  }));

  // language toggle
  $('#lang-toggle').addEventListener('click', () => {
    state.lang = state.lang === 'es' ? 'en' : 'es';
    try { localStorage.setItem('fom-lang', state.lang); } catch (_) {}
    render();
  });

  // sort toggle
  $('#sort-toggle').addEventListener('click', () => {
    state.sort = state.sort === 'default' ? 'alpha' : 'default';
    try { localStorage.setItem('fom-sort', state.sort); } catch (_) {}
    render();
  });

  // character selection (gifts)
  $('#char-rail').addEventListener('click', (e) => {
    const el = e.target.closest('.char-thumb');
    if (!el) return;
    state.char = el.dataset.char;
    state.selItem = firstGiftFor(state.char);
    render();
  });

  // gift item selection
  $('#gift-groups').addEventListener('click', (e) => {
    const el = e.target.closest('.gift-item');
    if (!el) return;
    state.selItem = el.dataset.item;
    renderGiftGroups();
    renderItemDetail();
  });

  // event delegation for ingredient clicks (chips + ingredient items)
  $('#foodlist').addEventListener('click', (e) => {
    const el = e.target.closest('[data-ing]');
    if (!el) return;
    state.ing = el.dataset.ing;
    state.mode = 'recipes';
    state.q = '';
    $('#search').value = '';
    render();
    $('#page-recipes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // mobile modal close
  $('#gift-modal-close').addEventListener('click', closeModal);
  $('#gift-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

(async () => {
  const [dataRes, trRes, giftsRes] = await Promise.all([
    fetch('data.json'),
    fetch('translations.json'),
    fetch('gifts-data.json')
  ]);
  DATA = await dataRes.json();
  TR = await trRes.json();
  GIFTS = await giftsRes.json();

  // restore preferences
  try {
    const savedLang = localStorage.getItem('fom-lang');
    if (savedLang === 'en' || savedLang === 'es') state.lang = savedLang;
    const savedSort = localStorage.getItem('fom-sort');
    if (savedSort === 'alpha' || savedSort === 'default') state.sort = savedSort;
  } catch (_) {}

  buildIndex();
  // build recipe name lookup for gift detail panel
  RECIPES = {};
  for (const r of DATA) RECIPES[r.name.toLowerCase()] = r;
  ensureCharSelected();
  bind();
  render();
})().catch((err) => {
  const fl = $('#foodlist');
  if (fl) fl.innerHTML = `<div class="empty">Could not load recipe data: ${esc(err.message)}</div>`;
});