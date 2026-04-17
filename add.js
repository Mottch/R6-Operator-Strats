// add.js — form helper that generates a JSON snippet for a new video entry.
// No backend: user copies the snippet and pastes it into data/videos.json on GitHub.

// ⚠️ EDIT THIS: change to your GitHub user/repo so the "Open on GitHub" button works.
// Format: "username/repo-name"
const GITHUB_REPO = 'Mottch/R6-Operator-Strats';
const GITHUB_BRANCH = 'main';

let reference = null;

const $ = (sel) => document.querySelector(sel);
const mapSel = $('#f-map');
const siteSel = $('#f-site');
const opSel = $('#f-operator');
const output = $('#output');
const jsonOutput = $('#json-output');
const copyStatus = $('#copy-status');
const ghLink = $('#github-link');

// ---------- Load reference ----------
fetch('data/reference.json')
  .then(r => r.json())
  .then(ref => {
    reference = ref;
    populateMaps();
    populateOperators();
    setupGithubLink();
  })
  .catch(err => {
    $('#content').innerHTML =
      `<div class="error"><h2>Couldn't load reference.json</h2><pre>${err.message}</pre></div>`;
  });

function populateMaps() {
  const maps = Object.keys(reference.maps).sort();
  mapSel.innerHTML = '<option value="">— select —</option>' +
    maps.map(m => `<option value="${escAttr(m)}">${escHtml(m)}</option>`).join('');
}

function populateSites(map) {
  const sites = reference.maps[map] || [];
  siteSel.innerHTML = '<option value="">— select —</option>' +
    sites.map(s => `<option value="${escAttr(s)}">${escHtml(s)}</option>`).join('');
  siteSel.disabled = sites.length === 0;
}

function populateOperators() {
  const side = document.querySelector('input[name="f-side"]:checked').value;
  const ops = (reference.operators[side] || []).slice().sort();
  opSel.innerHTML = '<option value="">— select —</option>' +
    ops.map(o => `<option value="${escAttr(o)}">${escHtml(o)}</option>`).join('');
}

function setupGithubLink() {
  if (GITHUB_REPO.startsWith('YOUR_')) {
    ghLink.textContent = '⚠️ Set GITHUB_REPO in add.js';
    ghLink.href = '#';
    ghLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Open add.js and set GITHUB_REPO to "yourusername/yourrepo".');
    });
    return;
  }
  ghLink.href = `https://github.com/${GITHUB_REPO}/edit/${GITHUB_BRANCH}/data/videos.json`;
}

// ---------- Events ----------
mapSel.addEventListener('change', () => populateSites(mapSel.value));
document.querySelectorAll('input[name="f-side"]').forEach(r =>
  r.addEventListener('change', populateOperators)
);

$('#generate-btn').addEventListener('click', () => {
  const map = mapSel.value;
  const site = siteSel.value;
  const side = document.querySelector('input[name="f-side"]:checked').value;
  const operator = opSel.value;
  const title = $('#f-title').value.trim();
  const url = $('#f-url').value.trim();
  const notes = $('#f-notes').value.trim();
  const tagsRaw = $('#f-tags').value.trim();

  // Validate
  const missing = [];
  if (!map) missing.push('Map');
  if (!site) missing.push('Site');
  if (!operator) missing.push('Operator');
  if (!title) missing.push('Title');
  if (!url) missing.push('URL');
  if (missing.length) {
    alert('Missing: ' + missing.join(', '));
    return;
  }
  try { new URL(url); }
  catch { alert('URL is not valid. Include https://'); return; }

  const entry = { map, site, side, operator, title, url };
  if (notes) entry.notes = notes;
  if (tagsRaw) {
    entry.tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  }

  // Format with 2-space indent, and add leading comma+newline for easy pasting
  // right after an existing entry (before the closing `]`).
  const json = JSON.stringify(entry, null, 2);
  jsonOutput.value = ',\n' + json;
  output.classList.remove('hidden');
  copyStatus.textContent = '';
  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#copy-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    copyStatus.textContent = '✓ Copied! Now paste into videos.json on GitHub.';
    copyStatus.className = 'status success';
  } catch {
    // Fallback for older browsers / non-HTTPS
    jsonOutput.select();
    document.execCommand('copy');
    copyStatus.textContent = '✓ Copied (selected). Ctrl/Cmd+C if it didn\'t copy automatically.';
    copyStatus.className = 'status success';
  }
});

// ---------- Utils ----------
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escAttr(s) { return escHtml(s); }
