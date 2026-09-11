const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'translations.json');
const tr = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Update UI keys to match app.js expectations
tr.en.ui = {
  "tagline": "Browse every cooking recipe and see exactly which recipes use any ingredient.",
  "search_placeholder": "Search a recipe or ingredient\u2026",
  "recipes": "Recipes",
  "ingredients": "Ingredients",
  "categories": "Categories",
  "no_recipes": "No recipes found.",
  "is_used_in": "is used in",
  "recipe": "recipe",
  "recipes_plural": "recipes",
  "clear_filter": "Clear filter",
  "shopping_by_ingredient": "Shopping by ingredient",
  "click_ingredient": "Click an ingredient to see every recipe that uses it."
};

tr.es.ui = {
  "tagline": "Explora todas las recetas de cocina y descubre exactamente qu\u00e9 recetas usan cada ingrediente.",
  "search_placeholder": "Busca una receta o ingrediente\u2026",
  "recipes": "Recetas",
  "ingredients": "Ingredientes",
  "categories": "Categor\u00edas",
  "no_recipes": "No se encontraron recetas.",
  "is_used_in": "se usa en",
  "recipe": "receta",
  "recipes_plural": "recetas",
  "clear_filter": "Limpiar filtro",
  "shopping_by_ingredient": "Compras por ingrediente",
  "click_ingredient": "Haz clic en un ingrediente para ver todas las recetas que lo usan."
};

fs.writeFileSync(filePath, JSON.stringify(tr, null, 2), 'utf8');
console.log('Updated UI keys. Counts:', {
  'en.recipes': Object.keys(tr.en.recipes).length,
  'en.ingredients': Object.keys(tr.en.ingredients).length,
  'en.ui': Object.keys(tr.en.ui).length,
  'es.recipes': Object.keys(tr.es.recipes).length,
  'es.ingredients': Object.keys(tr.es.ingredients).length,
  'es.ui': Object.keys(tr.es.ui).length
});