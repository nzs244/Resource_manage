# Resource Hub — consulting resource manager

Web app for consulting capacity: people, projects, assignments, scenarios, planning heatmaps, actual hours, and import/export. Data is stored in the browser unless you export a workspace file.

---

## What you need installed (requirements)

| Requirement | Notes |
|-------------|--------|
| **Node.js (LTS)** | **Required.** Install from [nodejs.org](https://nodejs.org/). This includes **npm** (the package manager); you do not install npm separately. Recommended: current **LTS** version (e.g. v20 or v22). |
| **A modern web browser** | **Required to use the app** — Chrome, Firefox, Safari, Edge, or similar. The dev server opens your **default** browser automatically when you start the app (see below). |
| **Microsoft Excel or compatible app** | **Optional.** Only if you use **Excel / CSV import**. You can run the app entirely without Excel by entering data in the UI or loading a **workspace JSON** file. |
| **Git** | **Optional.** Only if you clone the repository from version control. Not required to run the app from a folder you already have. |

### What you do *not* need

- **No VS Code, Cursor, or other editor plugins** are required to run the app. Any editor is optional.
- **No Java, Python, Docker, or database** — the app runs in the browser with local storage; dependencies are JavaScript packages installed by npm.
- **No global installs** of Vite, TypeScript, or React — project scripts use the versions in `node_modules` after `npm install`.

### Under the hood (installed automatically)

Running `npm install` (or using `npm run launch` on first run) installs dev and runtime packages defined in `package.json`, including **Vite**, **React**, **TypeScript**, **Tailwind CSS**, **Recharts**, **Zustand**, and **SheetJS (xlsx)**. You do not configure these manually.

---

## Run the app (browser opens automatically)

All commands below are run in a terminal **from the `consulting-rm` folder** (the same folder as this `README.md`).

### Easiest: launch script

```bash
npm run launch
```

This will:

1. Run **`npm install`** automatically if `node_modules` is missing (first time only).
2. Start the Vite dev server.
3. **Open your default web browser** to the local URL (usually `http://localhost:5173`). You should not need to copy a link from the terminal.

### Alternative

```bash
npm install          # first time only, if you skipped launch
npm run dev          # same as launch after deps exist — also opens the browser
```

To stop the server, focus the terminal and press **Ctrl+C**.

---

## Production build (optional)

```bash
npm install
npm run build
npm run preview
```

`preview` serves the built files and **opens the browser** (same `--open` behavior as dev).

---

## Help inside the app

Open **Instructions** in the left sidebar (or go to `/instructions`) for step-by-step guidance, especially:

- **Export workspace file** — full JSON backup / handoff to teammates  
- **Load workspace file** — replace local data with a file  
- **Merge legacy JSON** — partial merge without resetting dashboard filters  
- **Excel / CSV import** — sheets, import modes, and column reference  

The **Import / Export** page is where you perform downloads and file picks.

---

## Project scripts

| Script | Purpose |
|--------|---------|
| `npm run launch` | First-time install if needed + `vite --open` |
| `npm run dev` | Dev server + open browser |
| `npm run build` | Typecheck + production bundle to `dist/` |
| `npm run preview` | Serve `dist/` + open browser |
| `npm run lint` | ESLint |

---

## Folder layout (high level)

- `src/` — React UI, pages, store, lib  
- `launch.mjs` — wrapper that runs `npm run dev`  
- `dist/` — created by `npm run build` (not in source control)

---

## License

Private project (`"private": true` in `package.json`). Adjust as needed for your organization.
