// R6 Playbook - main app logic
// Loads reference.json (maps, sites, operators) and videos.json (entries),
// then renders a fast drill-down UI: Map > Site > Side > Operator > Videos.

const STATE_KEY = 'r6-playbook-state';

let reference = null;
let videos = [];
let state = {
  view: 'maps',      // 'maps' | 'sites' | 'operators' | 'search'
  map: null,
  site: null,
  side: 'defense',   // 'attack' | 'defense'
  query: ''
};

const $ = (sel) => document.querySelector(sel);
const content = $('#content');
const breadcrumbs = $('#breadcrumbs');
const searchInput = $('#search');

// ---------- Load data ----------
async function load() {
  try {
    const [refRes, vidRes] = await Promise.all([
      fetch('data/reference.json'),
      fetch('data/videos.json')
    ]);
    reference = await refRes.json();
    videos = await vidRes.json();

    restoreState();
    render();
  } catch (err) {
    content.innerHTML = `<div class="error">
      <h2>Couldn't load data</h2>
      <p>Check that <code>data/reference.json</code> and <code>data/videos.json</code> exist and are valid JSON.</p>
      <pre>${escapeHtml(err.message)}</pre>
    </div>`;
  }
}

// ---------- State persistence ----------
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      map: state.map,
      site: state.site,
      side: state.side,
      view: state.view
    }));
  } catch (e) { /* localStorage may be disabled */ }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    // Only restore if the map still exists in the current reference
    if (saved.map && reference.maps[saved.map]) {
      state.map = saved.map;
      if (saved.site && reference.maps[saved.map].includes(saved.site)) {
        state.site = saved.site;
      }
      state.side = saved.side === 'attack' ? 'attack' : 'defense';
      state.view = saved.site ? 'operators' : (saved.map ? 'sites' : 'maps');
    }
  } catch (e) { /* ignore */ }
}

// ---------- Render ----------
function render() {
  renderBreadcrumbs();
  if (state.view === 'search') {
    renderSearch();
  } else if (state.view === 'maps') {
    renderMaps();
  } else if (state.view === 'sites') {
    renderSites();
  } else if (state.view === 'operators') {
    renderOperators();
  }
  saveState();
}

function renderBreadcrumbs() {
  const parts = [];
  parts.push(`<a href="#" data-nav="home">Maps</a>`);
  if (state.view === 'search') {
    parts.push(`<span class="current">Search: "${escapeHtml(state.query)}"</span>`);
  } else {
    if (state.map) {
      if (state.view === 'sites') {
        parts.push(`<span class="current">${escapeHtml(state.map)}</span>`);
      } else {
        parts.push(`<a href="#" data-nav="map">${escapeHtml(state.map)}</a>`);
      }
    }
    if (state.site && state.view === 'operators') {
      parts.push(`<span class="current">${escapeHtml(state.site)}</span>`);
    }
  }
  breadcrumbs.innerHTML = parts.join(' <span class="sep">›</span> ');
}

function renderMaps() {
  const maps = Object.keys(reference.maps).sort();
  const recent = videos.slice(-5).reverse();

  let html = '';

  if (recent.length > 0) {
    html += `<section class="recent">
      <h2>Recently added</h2>
      <ul class="video-list">
        ${recent.map(renderVideoItem).join('')}
      </ul>
    </section>`;
  }

  html += `<section>
    <h2>Pick a map</h2>
    <div class="grid">
      ${maps.map(m => `
        <button class="tile" data-map="${escapeHtml(m)}">
          <span class="tile-title">${escapeHtml(m)}</span>
          <span class="tile-count">${countVideosForMap(m)} videos</span>
        </button>
      `).join('')}
    </div>
  </section>`;

  content.innerHTML = html;
}

function renderSites() {
  const sites = reference.maps[state.map] || [];
  content.innerHTML = `
    <section>
      <h2>${escapeHtml(state.map)} — pick a site</h2>
      <div class="grid">
        ${sites.map(s => `
          <button class="tile" data-site="${escapeHtml(s)}">
            <span class="tile-title">${escapeHtml(s)}</span>
            <span class="tile-count">${countVideosForSite(state.map, s)} videos</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderOperators() {
  const attackers = videosForSlot('attack');
  const defenders = videosForSlot('defense');

  content.innerHTML = `
    <section>
      <div class="side-toggle">
        <button class="toggle-btn ${state.side === 'attack' ? 'active' : ''}" data-side="attack">
          Attack <span class="count">(${attackers.length})</span>
        </button>
        <button class="toggle-btn ${state.side === 'defense' ? 'active' : ''}" data-side="defense">
          Defense <span class="count">(${defenders.length})</span>
        </button>
      </div>
      <h2>${escapeHtml(state.map)} › ${escapeHtml(state.site)} — ${state.side}</h2>
      ${renderOperatorList()}
    </section>
  `;
}

function renderOperatorList() {
  const ops = groupByOperator(videosForSlot(state.side));
  const operatorNames = Object.keys(ops).sort();

  if (operatorNames.length === 0) {
    return `<div class="empty">
      <p>No ${state.side} videos for this site yet.</p>
      <a href="add.html" class="btn">+ Add the first one</a>
    </div>`;
  }

  return `<div class="op-list">
    ${operatorNames.map(op => `
      <div class="op-card">
        <h3>${escapeHtml(op)}</h3>
        <ul class="video-list">
          ${ops[op].map(renderVideoItem).join('')}
        </ul>
      </div>
    `).join('')}
  </div>`;
}

function renderVideoItem(v) {
  const host = hostFromUrl(v.url);
  const tags = (v.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const context = state.view === 'search' || state.view === 'maps'
    ? `<span class="ctx">${escapeHtml(v.map)} › ${escapeHtml(v.site)} › ${escapeHtml(v.operator)}</span>`
    : '';
  return `<li class="video-item">
    <a href="${escapeAttr(v.url)}" target="_blank" rel="noopener">
      <div class="vi-main">
        <span class="vi-title">${escapeHtml(v.title || '(untitled)')}</span>
        <span class="vi-host">${host}</span>
      </div>
      ${context}
      ${v.notes ? `<div class="vi-notes">${escapeHtml(v.notes)}</div>` : ''}
      ${tags ? `<div class="vi-tags">${tags}</div>` : ''}
    </a>
  </li>`;
}

function renderSearch() {
  const q = state.query.toLowerCase();
  const matches = videos.filter(v => {
    const hay = [v.map, v.site, v.side, v.operator, v.title, v.notes, ...(v.tags || [])]
      .filter(Boolean).join(' ').toLowerCase();
    return q.split(/\s+/).every(term => hay.includes(term));
  });

  content.innerHTML = `<section>
    <h2>${matches.length} result${matches.length === 1 ? '' : 's'} for "${escapeHtml(state.query)}"</h2>
    ${matches.length === 0
      ? `<p class="empty">No videos match. Try fewer or different words.</p>`
      : `<ul class="video-list">${matches.map(renderVideoItem).join('')}</ul>`
    }
  </section>`;
}

// ---------- Filtering helpers ----------
function videosForSlot(side) {
  return videos.filter(v =>
    v.map === state.map && v.site === state.site && v.side === side
  );
}

function countVideosForMap(map) {
  return videos.filter(v => v.map === map).length;
}

function countVideosForSite(map, site) {
  return videos.filter(v => v.map === map && v.site === site).length;
}

function groupByOperator(list) {
  return list.reduce((acc, v) => {
    (acc[v.operator] = acc[v.operator] || []).push(v);
    return acc;
  }, {});
}

function hostFromUrl(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (h.includes('instagram')) return 'Instagram';
    if (h.includes('tiktok')) return 'TikTok';
    if (h.includes('youtube') || h.includes('youtu.be')) return 'YouTube';
    return h;
  } catch { return 'link'; }
}

// ---------- Utils ----------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const mapBtn = e.target.closest('[data-map]');
  if (mapBtn) {
    state.map = mapBtn.dataset.map;
    state.site = null;
    state.view = 'sites';
    render();
    window.scrollTo(0, 0);
    return;
  }

  const siteBtn = e.target.closest('[data-site]');
  if (siteBtn) {
    state.site = siteBtn.dataset.site;
    state.view = 'operators';
    render();
    window.scrollTo(0, 0);
    return;
  }

  const sideBtn = e.target.closest('[data-side]');
  if (sideBtn) {
    state.side = sideBtn.dataset.side;
    render();
    return;
  }

  const navLink = e.target.closest('[data-nav]');
  if (navLink) {
    e.preventDefault();
    const nav = navLink.dataset.nav;
    if (nav === 'home') {
      state.view = 'maps';
      state.map = null;
      state.site = null;
      searchInput.value = '';
      state.query = '';
    } else if (nav === 'map') {
      state.view = 'sites';
      state.site = null;
    }
    render();
    window.scrollTo(0, 0);
    return;
  }

  if (e.target.id === 'home-link') {
    e.preventDefault();
    state.view = 'maps';
    state.map = null;
    state.site = null;
    searchInput.value = '';
    state.query = '';
    render();
    window.scrollTo(0, 0);
  }
});

let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  searchTimer = setTimeout(() => {
    if (q === '') {
      // Return to whatever view we were in before searching
      state.view = state.site ? 'operators' : (state.map ? 'sites' : 'maps');
      state.query = '';
    } else {
      state.query = q;
      state.view = 'search';
    }
    render();
  }, 120);
});

// Escape key clears search
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  }
});

load();
