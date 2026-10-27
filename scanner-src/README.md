# Post scanner v2 source

The main dashboard source (src/scanner.tsx, src/scandata.ts) is not in this repo, so this
folder holds the v2 scanner as a standalone component and a splice build:

    npm i esbuild
    node scanner-src/build.js index.html index.html   # replaces the bundled `function bu`

- src/scanner.jsx: the scanner component (uses in-bundle React `ze` and scan data `Yt`).
- src/prev.json: views per post id from the 11:25 AM CDT pull (already in the dashboard data), used for "gained since last pull".
- The build adds `pulledAtISO` to the scan data for age math.

When the TSX project is rebuilt, port scanner.jsx into src/scanner.tsx (same logic) and move prev/pulledAtISO into src/scandata.ts.
