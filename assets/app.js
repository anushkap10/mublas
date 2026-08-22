// Parses data/albums.csv (RFC4180-ish: handles quoted fields with commas/newlines)
// and renders the stat tiles, charts, and sortable/searchable table.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // skip, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift();
  return rows
    .filter(r => r.some(v => v.trim() !== ''))
    .map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

function parseDate(str) {
  // format: "10 Dec 2023"
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS.indexOf(m[2]);
  const year = parseInt(m[3], 10);
  if (month === -1) return null;
  return new Date(year, month, day);
}

function buyClass(buy) {
  if (buy === 'Buy!') return 'buy-badge--buy';
  if (buy === 'Maybe?') return 'buy-badge--maybe';
  return 'buy-badge--nah';
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderStats(albums) {
  const rated = albums.filter(a => a.Rating !== '');
  const avg = rated.length
    ? (rated.reduce((sum, a) => sum + parseFloat(a.Rating), 0) / rated.length)
    : 0;
  const buyCount = albums.filter(a => a.Buy === 'Buy!').length;

  const artistCounts = new Map();
  for (const a of albums) {
    artistCounts.set(a.Artist, (artistCounts.get(a.Artist) || 0) + 1);
  }
  let topArtist = '—';
  let topCount = 0;
  for (const [artist, count] of artistCounts) {
    if (count > topCount) { topCount = count; topArtist = artist; }
  }

  document.getElementById('stat-total').textContent = albums.length;
  document.getElementById('stat-avg').textContent = avg.toFixed(1);
  document.getElementById('stat-buy').textContent = buyCount;
  document.getElementById('stat-artist').textContent = topCount > 1 ? `${topArtist} (${topCount})` : topArtist;
}

function renderRatingChart(albums) {
  const rated = albums.filter(a => a.Rating !== '');
  const buckets = new Array(6).fill(0); // 4-5, 5-6, 6-7, 7-8, 8-9, 9-10
  const labels = ['4-5', '5-6', '6-7', '7-8', '8-9', '9-10'];

  for (const a of rated) {
    const r = parseFloat(a.Rating);
    let idx = Math.floor(r) - 4;
    idx = Math.max(0, Math.min(5, idx));
    buckets[idx]++;
  }

  const max = Math.max(...buckets, 1);
  const container = document.getElementById('rating-chart');
  container.innerHTML = '';

  buckets.forEach((count, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.title = `${labels[i]}: ${count} album${count === 1 ? '' : 's'}`;

    const countLabel = document.createElement('div');
    countLabel.className = 'bar-count';
    countLabel.textContent = count > 0 ? count : '';

    const bar = document.createElement('div');
    bar.className = 'bar';
    const heightPct = (count / max) * 100;
    bar.style.height = `${Math.max(heightPct, count > 0 ? 4 : 0)}%`;

    const tick = document.createElement('div');
    tick.className = 'bar-tick';
    tick.textContent = labels[i];

    col.appendChild(countLabel);
    col.appendChild(bar);
    col.appendChild(tick);
    container.appendChild(col);
  });
}

function renderBuyChart(albums) {
  const order = [
    { key: 'Buy!', label: 'Buy!', varName: '--series-1' },
    { key: 'Maybe?', label: 'Maybe?', varName: '--series-2' },
    { key: 'Nah', label: 'Nah', varName: '--series-3' },
  ];
  const counts = order.map(o => albums.filter(a => a.Buy === o.key).length);
  const max = Math.max(...counts, 1);

  const container = document.getElementById('buy-chart');
  container.innerHTML = '';

  order.forEach((o, i) => {
    const row = document.createElement('div');
    row.className = 'hbar-row';
    row.title = `${o.label}: ${counts[i]} album${counts[i] === 1 ? '' : 's'}`;

    const label = document.createElement('div');
    label.className = 'hbar-label';
    label.textContent = o.label;

    const track = document.createElement('div');
    track.className = 'hbar-track';

    const fill = document.createElement('div');
    fill.className = 'hbar-fill';
    fill.style.width = `${(counts[i] / max) * 100}%`;
    fill.style.background = `var(${o.varName})`;

    const countEl = document.createElement('div');
    countEl.className = 'hbar-count';
    countEl.textContent = counts[i];

    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(countEl);
    container.appendChild(row);
  });
}

function renderTable(albums) {
  const tbody = document.getElementById('album-tbody');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  if (albums.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const a of albums) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(a.Album)}</td>
      <td>${escapeHTML(a.Artist)}</td>
      <td class="col-rating">${a.Rating || '—'}</td>
      <td><span class="buy-badge ${buyClass(a.Buy)}">${escapeHTML(a.Buy)}</span></td>
      <td>${escapeHTML(a.Date) || '—'}</td>
      <td>${escapeHTML(a.Fav) || '—'}</td>
      <td class="col-notes">${escapeHTML(a.Notes)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function sortAlbums(albums, sortKey) {
  const sorted = [...albums];
  const dateVal = a => parseDate(a.Date)?.getTime() ?? -Infinity;
  const ratingVal = a => a.Rating !== '' ? parseFloat(a.Rating) : -Infinity;

  switch (sortKey) {
    case 'date-asc': sorted.sort((a, b) => dateVal(a) - dateVal(b)); break;
    case 'date-desc': sorted.sort((a, b) => dateVal(b) - dateVal(a)); break;
    case 'rating-asc': sorted.sort((a, b) => ratingVal(a) - ratingVal(b)); break;
    case 'rating-desc': sorted.sort((a, b) => ratingVal(b) - ratingVal(a)); break;
    case 'artist-asc': sorted.sort((a, b) => a.Artist.localeCompare(b.Artist)); break;
    case 'album-asc': sorted.sort((a, b) => a.Album.localeCompare(b.Album)); break;
  }
  return sorted;
}

async function init() {
  const res = await fetch('data/albums.csv');
  const text = await res.text();
  const albums = parseCSV(text);

  renderStats(albums);
  renderRatingChart(albums);
  renderBuyChart(albums);

  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');

  function update() {
    const query = searchInput.value.trim().toLowerCase();
    let filtered = albums;
    if (query) {
      filtered = albums.filter(a =>
        a.Album.toLowerCase().includes(query) || a.Artist.toLowerCase().includes(query)
      );
    }
    renderTable(sortAlbums(filtered, sortSelect.value));
  }

  searchInput.addEventListener('input', update);
  sortSelect.addEventListener('change', update);
  update();
}

init();
