# mublas

A personal album listening log, published as a static site via GitHub Pages.

## Structure

- `data/albums.csv` — the log itself. Each row is one album: `Album, Artist,
  Rating, Fav, LeastFav, Buy, Date, Brief, Notes, Retry`. This is the only
  file you need to edit to add a new listen.
- `index.html`, `assets/style.css`, `assets/app.js` — a static page that
  fetches and renders `data/albums.csv` client-side. No build step.

## Adding an album

Append a row to `data/albums.csv`, commit, and push. GitHub Pages redeploys
automatically. Quote any field that contains a comma.

## Local preview

Browsers block `fetch()` on `file://` pages, so serve it over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
