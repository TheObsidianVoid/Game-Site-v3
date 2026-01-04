// scripts.js — JSON-driven games renderer
// Expects games.json next to index.html (or change path below).

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-only').forEach(el => el.style.display = 'block');
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');
  const dirSelect = document.getElementById('directory');
  const gamesList = document.getElementById('games');

  // Path to your JSON file (change if you store it elsewhere)
  const JSON_PATH = 'games.json';

  // Basic helpers
  const normalize = s => String(s || '').trim().toLowerCase();

  // Render one game card and return element
  function renderCard(game, config) {
    const li = document.createElement('li');
    li.className = 'game-card';
    li.dataset.title = game.title || game.id || '';
    li.dataset.category = game.category || '';
    li.dataset.dir = game.dir || game.directory || '';

    // Build href using precedence: game.url -> template using config -> fallback to directory + file
    let href = game.url || '';
    if (!href) {
      const base = config.baseDir || '';
      const dir = game.dir || game.directory || game.id || '';
      const file = game.file || 'index.html';
      if (config.gamePathTemplate) {
        // replace placeholders {base},{dir},{file}
        href = config.gamePathTemplate
          .replace('{base}', base)
          .replace('{dir}', dir)
          .replace('{file}', file);
      } else {
        // default
        href = [base, dir, file].filter(Boolean).join('/').replace(/\/+/g, '/');
      }
    }

    // Thumbnail path: if thumbnail is absolute (starts with http or /) use it; otherwise apply template
    let thumb = game.thumbnail || game.thumb || '';
    if (!thumb) {
      const base = config.baseDir || '';
      const dir = game.dir || game.directory || game.id || '';
      const defaultThumb = 'thumbnail.png';
      if (config.thumbnailPathTemplate) {
        thumb = config.thumbnailPathTemplate
          .replace('{base}', base)
          .replace('{dir}', dir)
          .replace('{thumb}', defaultThumb);
      } else {
        thumb = [config.baseDir || '', dir, defaultThumb].filter(Boolean).join('/').replace(/\/+/g, '/');
      }
    } else {
      // if thumb is relative filename, expand using template
      if (!/^\/|https?:\/\//.test(thumb)) {
        const base = config.baseDir || '';
        const dir = game.dir || game.directory || game.id || '';
        if (config.thumbnailPathTemplate) {
          thumb = config.thumbnailPathTemplate
            .replace('{base}', base)
            .replace('{dir}', dir)
            .replace('{thumb}', thumb);
        } else {
          thumb = [config.baseDir || '', dir, thumb].filter(Boolean).join('/').replace(/\/+/g, '/');
        }
      }
    }

    // Build inner HTML
    li.innerHTML = `
      <a class="game-link" href="${escapeHtml(href)}" ${game.target ? `target="${escapeHtmlAttr(game.target)}"` : 'target="_blank" rel="noopener noreferrer"'} >
        <img class="game-thumb" src="${escapeHtmlAttr(thumb)}" alt="${escapeHtmlAttr(game.alt || (game.title || 'Game') + ' thumbnail')}" loading="lazy" />
        <div class="game-info">
          <h3 class="game-title">${escapeHtml(game.title || game.id || 'Untitled')}</h3>
          <p class="game-desc">${escapeHtml(game.description || '')}</p>
        </div>
      </a>
    `;
    return li;
  }

  // Small escape helpers to avoid injecting raw JSON content
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeHtmlAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  // Filter matcher
  function matches(cardEl, q, cat, dir) {
    const title = normalize(cardEl.dataset.title || '');
    const desc = normalize(cardEl.querySelector('.game-desc')?.textContent || '');
    const catVal = normalize(cardEl.dataset.category || '');
    const dirVal = normalize(cardEl.dataset.dir || '');
    const qn = normalize(q);
    const textMatch = qn === '' || title.includes(qn) || desc.includes(qn);
    const catMatch = !cat || catVal === normalize(cat);
    const dirMatch = !dir || dirVal === normalize(dir);
    return textMatch && catMatch && dirMatch;
  }

  // Update visibility based on filters
  function update() {
    const q = searchInput.value;
    const cat = categorySelect.value;
    const dir = dirSelect.value;
    const cards = Array.from(gamesList.children);
    let visible = 0;
    cards.forEach(card => {
      if (matches(card, q, cat, dir)) {
        card.style.display = '';
        visible++;
      } else {
        card.style.display = 'none';
      }
    });

    let empty = document.getElementById('no-results');
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement('p');
        empty.id = 'no-results';
        empty.className = 'notice';
        empty.textContent = 'No games match your search. Try a different keyword or category.';
        gamesList.parentNode.appendChild(empty);
      }
    } else {
      if (empty) empty.remove();
    }
  }

  // Debounce helper
  function debounce(fn, wait) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Keyboard shortcut: press "/" to focus search
  window.addEventListener('keydown', function (e) {
    const active = document.activeElement;
    const tag = active && active.tagName && active.tagName.toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Load JSON and render
  fetch(JSON_PATH).then(res => {
    if (!res.ok) throw new Error('Failed to load games.json');
    return res.json();
  }).then(data => {
    const config = data.config || {};
    const games = Array.isArray(data.games) ? data.games : [];

    // Build selects dynamically from games data
    const categories = new Set();
    const dirs = new Set();

    // Render each game card
    games.forEach(game => {
      const card = renderCard(game, config);
      gamesList.appendChild(card);
      if (game.category) categories.add(game.category);
      const d = game.dir || game.directory || game.id || '';
      if (d) dirs.add(d);
    });

    // Populate category select
    Array.from(categories).sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });

    // Populate directory select
    Array.from(dirs).sort().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      dirSelect.appendChild(opt);
    });

    // Attach handlers
    searchInput.addEventListener('input', debounce(update, 160));
    categorySelect.addEventListener('change', update);
    dirSelect.addEventListener('change', update);

    // Make spacebar open focused link when focused on a card
    gamesList.addEventListener('keydown', (e) => {
      const el = e.target.closest('.game-card');
      if (!el) return;
      const link = el.querySelector('a.game-link');
      if (!link) return;
      if (e.code === 'Space') {
        e.preventDefault();
        link.click();
      }
    });

    update();
  }).catch(err => {
    console.error(err);
    gamesList.innerHTML = '<li class="notice">Could not load games data. Check that games.json exists and is valid JSON.</li>';
  });
});