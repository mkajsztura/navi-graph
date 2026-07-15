# navi-graph

A small, fully client-side tool for preparing a **Dijkstra graph** used to
compute shortest routes between points across building floors. You upload path
and floor-change-point geojson files per floor, and it generates a merged
geojson of navigation points with pre-computed distances.

Rewritten from Vue 2 / Vue CLI to a plain **TypeScript + [Vite](https://vitejs.dev)**
app with **zero runtime dependencies** (haversine distance and file download are
implemented locally). The production build is static, so it hosts anywhere.

## Development

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
```

## Build

```bash
npm run build    # type-checks, then outputs a static site to dist/
npm run preview  # preview the production build locally
```

## Hosting

`npm run build` produces a static `dist/` folder — no server or Node runtime
needed. Deploy it to any static host:

- **GitHub Pages** – push `dist/` (or use an action). `base: "./"` in
  `vite.config.ts` makes it work from a project sub-path.
- **Netlify / Vercel / Cloudflare Pages** – build command `npm run build`,
  publish directory `dist`.
- **Any file server / S3 bucket** – copy the contents of `dist/`.

Because paths are relative you can even open `dist/index.html` directly.

## How it works

1. Enter a floor name.
2. Upload the paths geojson (`LineString` features — the connected graph).
3. Upload the floor-change points geojson (`Point` features with `type`, `id`,
   `nodes`), or choose "no floor-change points".
4. Repeat for each floor, then generate the merged `navi-points.geojson`.

Project layout:

- `src/main.ts` – UI wiring and state
- `src/graph.ts` – graph construction and distance calculation
- `src/utils.ts` – haversine distance + file download helpers
- `src/model/geojson.model.ts` – geojson type definitions
