// build.js: compile src/scanner.jsx and splice it into index.html (replaces the bundled `function bu`).
// Usage: node build.js <in index.html> <out index.html>
const fs = require("fs"), esbuild = require("esbuild"), path = require("path");
const [inp, out] = process.argv.slice(2);
let html = fs.readFileSync(inp, "utf8");
const src = fs.readFileSync(path.join(__dirname, "src/scanner.jsx"), "utf8");
const js = esbuild.transformSync(src, { loader: "jsx", jsxFactory: "ze.createElement", jsxFragment: "ze.Fragment", target: "es2020", minifyWhitespace: true }).code;
if (js.includes("</script")) throw new Error("compiled code contains </script");
// locate old scanner component by brace matching (skipping strings)
const start = html.indexOf("function bu({S:e})");
if (start < 0) throw new Error("function bu not found");
let i = html.indexOf("{", start + 15), d = 0, j;
for (j = i; j < html.length; j++) {
  const c = html[j];
  if (c === '"' || c === "'" || c === "`") { const q = c; j++; while (html[j] !== q) { if (html[j] === "\\") j++; j++; } continue; }
  if (c === "{") d++; else if (c === "}") { d--; if (!d) break; }
}
// earlier snapshot (11:25 AM) of the same posts, already in the bundle's dashboard data
const prevPath = path.join(__dirname, "src/prev.json");
const prev = fs.existsSync(prevPath) ? fs.readFileSync(prevPath, "utf8").trim() : null;
const prelude = prev ? `var SC_PREV_SNAP={label:"11:25 AM",views:${prev}};` : "";
html = html.slice(0, start) + prelude + js + html.slice(j + 1);
// machine-readable pull time for age math
if (!html.includes("pulledAtISO")) html = html.replace('var Yt={pulledAt:"Oct 27, 2026, 1:50 PM CDT",', 'var Yt={pulledAt:"Oct 27, 2026, 1:50 PM CDT",pulledAtISO:"2026-10-27T18:50:00Z",');
if (!html.includes("pulledAtISO")) throw new Error("could not add pulledAtISO");
fs.writeFileSync(out, html);
console.log("ok", out, html.length, "bytes; scanner", js.length, "bytes");
