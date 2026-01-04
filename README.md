# TagGUI Web

Github Pages: https://inorinatsume.github.io/TagGUI_web/

TagGUI Web is a browser-based tag editor for image caption files. It is built
on a modular TypeScript core and a Svelte UI.

Credits
- The base tag editing workflow and features are derived from:
  https://github.com/jhc13/taggui

License
- This project is licensed under GPL-3.0. See `LICENSE`.

Requirements
- Chromium-based browser (Chrome/Edge) for File System Access API.
- HTTPS or localhost (GitHub Pages is supported).

Local Development (Windows PowerShell)
```
cd c:\Projects\tag_edit\web
npm install
npm run dev
```

GitHub Pages
- `web/vite.config.ts` sets `base` to `/TagGUI_web/`.
- Build the site and deploy `web/dist` to GitHub Pages.
```
cd c:\Projects\tag_edit\web
npm install
npm run build
```

Notes
- The app edits `.txt` caption files next to images.
- Unsaved changes are tracked as "dirty" until saved.
