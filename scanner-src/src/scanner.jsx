// X Scout HQ: Post scanner (v2, answer-first)
// Compiled with esbuild (--jsx-factory=ze.createElement) and spliced into index.html,
// replacing the old `function bu`. In-bundle globals it relies on: ze (React), Yt (scan data).
// Every number shown is computed from Yt.items (real X API pulls) and links to a real post.

var SC_PULL = Date.parse(Yt.pulledAtISO || "2026-10-27T18:50:00Z");
var SC_PREV = typeof SC_PREV_SNAP !== "undefined" ? SC_PREV_SNAP : null; // {label, views:{id:views}}
var SC_ME = "RagnarLongstock";
var SC_DEF = { acct: SC_ME, type: "all", win: "all", to: "", pv: "any", size: "any", media: "any", len: "any", wd: "any", h0: "0", h1: "23", age: "any", q: "", minV: "", minL: "", minB: "", minQ: "", minX: "", minSave: "", minRL: "", minVF: "", minLev: "", sort: "v" };
var SC_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var SC_PV = { xs: ["under 1K views", 0, 1e3], s: ["1K–10K views", 1e3, 1e4], m: ["10K–100K views", 1e4, 1e5], l: ["100K+ views", 1e5, Infinity] };
var SC_SIZE = { s: ["under 10K followers", 0, 1e4], m: ["10K–100K followers", 1e4, 1e5], l: ["100K–1M followers", 1e5, 1e6], xl: ["1M+ followers", 1e6, 1e13] };
var SC_LEN = { short: ["short (under 80 chars)", 0, 80], mid: ["medium (80–200)", 80, 200], long: ["long (200+)", 200, 1e9] };
var SC_TYPES = { all: "posts, replies and quotes", o: "posts", r: "replies", q: "quote posts" };
var SC_TYPE1 = { o: "Post", r: "Reply", q: "Quote" };
var SC_TYPEN = { o: "Posts", r: "Replies", q: "Quotes" };
var scPl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
var SC_SORTS = { v: "views", new: "newest", x: "× typical post", gain: "views gained since last pull", l: "likes", b: "bookmarks", rp: "replies", qt: "quotes", rt: "reposts", save: "saves per 1K views (1K+ views)", rl: "replies per like (3+ likes)", lev: "share of parent's views (10K+ parents)" };
var SC_BLOCKS = [[0, 3], [4, 7], [8, 11], [12, 15], [16, 19], [20, 23]];

var scNum = (e) => { let t = parseFloat(e); return Number.isFinite(t) ? t : 0; };
var scFmt = (e) => e >= 1e6 ? (e / 1e6).toFixed(1) + "M" : e >= 1e3 ? (e / 1e3).toFixed(e >= 1e4 ? 0 : 1) + "K" : String(Math.round(e));
var scMed = (a) => { if (!a.length) return 0; let t = [...a].sort((x, y) => x - y), n = t.length >> 1; return t.length % 2 ? t[n] : (t[n - 1] + t[n]) / 2; };
var scQ = (a, p) => { if (!a.length) return 0; let t = [...a].sort((x, y) => x - y); return t[Math.min(t.length - 1, Math.floor(p * t.length))]; };
var scHr = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
var scUrl = (it) => `https://x.com/${it[1]}/status/${it[0]}`;
var scT = (it) => Date.parse(it[2] + ":00Z");
var scSf = (id) => { try { return Number((BigInt(id) >> BigInt(22)) + BigInt(1288834974657)); } catch { return NaN; } };
var scMin = (m) => m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${(m / 60).toFixed(m < 600 ? 1 : 0)} h` : `${(m / 1440).toFixed(1)} days`;
var scDateFmt = (ms) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
var SC_TZ = (() => { try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", hourCycle: "h23" }); } catch { return null; } })();
var scLocal = (ms) => {
  if (SC_TZ) { let p = SC_TZ.formatToParts(new Date(ms)), wd = p.find((x) => x.type === "weekday")?.value, h = +(p.find((x) => x.type === "hour")?.value || 0); return { wd: SC_DAYS.indexOf(wd), hour: h % 24 }; }
  let d = new Date(ms - 5 * 36e5); return { wd: d.getUTCDay(), hour: d.getUTCHours() };
};
// A comparison only earns a verdict word when both sides have n>=8, the gap is >=1.5x, and it survives dropping each side's top item.
var scVerdict = (A, B) => {
  if (A.length < 8 || B.length < 8) return "too few items to call";
  let drop = (x) => [...x].sort((p, q) => q - p).slice(1), r = scMed(A) / Math.max(1, scMed(B)), r2 = scMed(drop(A)) / Math.max(1, scMed(drop(B)));
  if (r >= 1.5 && r2 > 1) return "higher"; if (r <= 1 / 1.5 && r2 < 1) return "lower"; return "about the same";
};
var scReadHash = () => { try { let e = window.location.hash.match(/scan=([^&]+)/); return e ? { ...SC_DEF, ...JSON.parse(decodeURIComponent(e[1])) } : null; } catch { return null; } };
var scHash = (f) => { let t = {}; Object.keys(f).forEach((k) => { f[k] !== SC_DEF[k] && (t[k] = f[k]); }); return "#scan=" + encodeURIComponent(JSON.stringify(t)); };

// Typical views for an account+type. Prefers items 24h+ old (views still climb for a day), falls back and says so.
var scBase = (acct, type) => {
  let all = Yt.items.filter((i) => i[1] === acct && i[3] === type), age = (i) => (SC_PULL - scT(i)) / 36e5;
  let pool = all.filter((i) => age(i) >= 24), label = "24h+ old";
  if (pool.length < 10) { let p6 = all.filter((i) => age(i) >= 6); if (p6.length > pool.length) { pool = p6; label = "6h+ old"; } }
  if (pool.length < 5) { pool = all; label = "includes items under 6h old"; }
  let vs = pool.map((i) => i[8]);
  return { med: scMed(vs), n: pool.length, p25: scQ(vs, 0.25), p75: scQ(vs, 0.75), label };
};

function bu({ S: e }) {
  let { tx: F, tx2: E, line: K, well: J, a1: A1, a2: Q, grad: GR, ON: ON, btn: je, ctl: CT, lnk: LK } = e;
  let init = ze.useMemo(() => scReadHash(), []);
  let [f, setFull] = ze.useState(init || SC_DEF);
  let [open, setOpen] = ze.useState(!!init);
  let [more, setMore] = ze.useState(false);
  let [lim, setLim] = ze.useState(8);
  let [msg, setMsg] = ze.useState("");
  let [pname, setPname] = ze.useState("");
  let [presets, setPresets] = ze.useState(() => { try { return JSON.parse(localStorage.getItem("xs-scan-presets") || "[]"); } catch { return []; } });
  ze.useEffect(() => { try { localStorage.setItem("xs-scan-presets", JSON.stringify(presets)); } catch {} }, [presets]);
  let set = (p) => { setFull((o) => ({ ...o, ...p })); setLim(8); };
  let run = (p, scrollTo) => { setFull({ ...SC_DEF, acct: f.acct, ...p }); setLim(8); setOpen(true); if (scrollTo) setTimeout(() => { try { document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {} }, 60); };
  let accts = ze.useMemo(() => Array.from(new Set(Yt.items.map((i) => i[1]))), []);

  // ---- per-item derived rows (all accounts) ----
  let rows = ze.useMemo(() => {
    let bases = new Map();
    accts.forEach((a) => ["o", "r", "q"].forEach((t) => bases.set(a + t, scBase(a, t))));
    return Yt.items.map((it) => {
      let v = it[8], tp = bases.get(it[1] + "o"), base = bases.get(it[1] + it[3]), ageH = (SC_PULL - scT(it)) / 36e5, loc = scLocal(scT(it));
      let x = it[3] === "r" ? (tp.n >= 5 && tp.med > 0 ? v / tp.med : null) : base.n >= 5 && base.med > 0 ? v / base.med : null;
      let prev = SC_PREV && SC_PREV.views[it[0]] != null ? SC_PREV.views[it[0]] : null;
      let delay = it[3] === "r" && it[7] ? (scSf(it[0]) - scSf(it[7])) / 6e4 : null;
      return {
        it, v, ageH, fresh: ageH < 24, base, tp, x,
        lev: it[6] >= 1e4 ? v / it[6] : null, rawLev: it[6] > 0 ? v / it[6] : null,
        save: v >= 1e3 && it[13] >= 1 ? (it[13] / v) * 1e3 : null,
        rl: it[9] >= 3 ? it[10] / it[9] : null,
        vf: Yt.followers[it[1]] ? v / Yt.followers[it[1]] : 0,
        gain: prev != null ? v - prev : null,
        delay: delay != null && Number.isFinite(delay) && delay >= 0 ? delay : null,
        hour: loc.hour, wd: loc.wd,
      };
    });
  }, [accts]);
  let mine = ze.useMemo(() => rows.filter((r) => r.it[1] === f.acct), [rows, f.acct]);
  let who = f.acct === SC_ME ? "my" : `@${f.acct}'s`, You = f.acct === SC_ME ? "your" : `@${f.acct}'s`;
  let repliedTo = ze.useMemo(() => { let m = new Map(); mine.forEach((r) => { r.it[3] === "r" && r.it[4] && m.set(r.it[4], (m.get(r.it[4]) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [mine]);

  // ---- account-level answers (ignore filters so the first screen is stable) ----
  let acc = ze.useMemo(() => {
    let tp = mine[0]?.tp || { med: 0, n: 0 }, H = tp.n >= 5 ? tp.med : 100, total = mine.reduce((s, r) => s + r.v, 0);
    let top = mine.reduce((a, b) => (!a || b.v > a.v ? b : a), null);
    let reps = mine.filter((r) => r.it[3] === "r" && r.it[4] !== f.acct), known = reps.filter((r) => r.it[6] >= 0);
    let tiers = Object.entries(SC_PV).map(([k, [lab, lo, hi]]) => {
      let xs = known.filter((r) => r.it[6] >= lo && r.it[6] < hi), hits = xs.filter((r) => r.v >= H), by = new Map();
      hits.forEach((r) => by.set(r.it[4], (by.get(r.it[4]) || 0) + 1));
      let dom = [...by].sort((a, b) => b[1] - a[1])[0];
      let sorted = [...xs].sort((a, b) => b.v - a.v);
      return { k, lab, n: xs.length, hits: hits.length, med: scMed(xs.map((r) => r.v)), accts: new Set(xs.map((r) => r.it[4])).size, best: sorted[0] || null, dom: dom && hits.length >= 2 && dom[1] / hits.length > 0.5 ? dom : null, hitsNoTop: sorted.slice(1).filter((r) => r.v >= H).length };
    }).filter((t) => t.n);
    let big = [...tiers].reverse().find((t) => t.n >= 5), small = tiers.find((t) => t.n >= 5);
    let posts = mine.filter((r) => r.it[3] === "o"), settledPosts = posts.filter((r) => r.ageH >= 6);
    let bestPost = posts.reduce((a, b) => (!a || b.v > a.v ? b : a), null);
    let pm = settledPosts.filter((r) => r.it[14]).map((r) => r.v), pt = settledPosts.filter((r) => !r.it[14]).map((r) => r.v);
    let bigReach = known.filter((r) => r.it[6] >= 1e5).reduce((s, r) => s + r.v, 0);
    let saved = mine.filter((r) => r.it[13] > 0).length, saveRows = mine.filter((r) => r.save != null).length;
    let cov = ["o", "r", "q"].map((t) => { let xs = mine.filter((r) => r.it[3] === t); if (!xs.length) return null; let ts = xs.map((r) => scT(r.it)); return `${SC_TYPEN[t]} ${scDateFmt(Math.min(...ts))}–${scDateFmt(Math.max(...ts))} (${xs.length})`; }).filter(Boolean);
    let out = reps.filter((r) => r.v >= H).length;
    return { tp, H, total, top, reps, known, tiers, head: big && small && big !== small ? { big, small } : null, bestPost, pm, pt, bigReach, saved, saveRows, saveOK: saveRows >= 5, cov, out, hasGain: mine.some((r) => r.gain != null) };
  }, [mine, f.acct]);

  // ---- filtered + sorted list ----
  let list = ze.useMemo(() => {
    let q = f.q.trim().toLowerCase(), h0 = scNum(f.h0), h1 = scNum(f.h1);
    let xs = mine.filter((r) => {
      let it = r.it;
      if ((f.type !== "all" && it[3] !== f.type) || (f.win !== "all" && scT(it) < SC_PULL - scNum(f.win) * 864e5) || (f.to && it[4] !== f.to)) return false;
      if (f.pv !== "any") { let [, lo, hi] = SC_PV[f.pv]; if (it[3] !== "r" || it[6] < lo || it[6] >= hi) return false; }
      if (f.size !== "any") { let [, lo, hi] = SC_SIZE[f.size]; if (it[3] !== "r" || it[5] < lo || it[5] >= hi) return false; }
      if ((f.media === "media" && !it[14]) || (f.media === "text" && it[14])) return false;
      if (f.len !== "any") { let [, lo, hi] = SC_LEN[f.len]; if (it[15] < lo || it[15] >= hi) return false; }
      if ((f.age === "settled" && r.fresh) || (f.age === "fresh" && !r.fresh)) return false;
      return !(
        (f.wd !== "any" && r.wd !== scNum(f.wd)) || (h0 <= h1 ? r.hour < h0 || r.hour > h1 : r.hour < h0 && r.hour > h1) ||
        (q && !it[16].toLowerCase().includes(q) && !it[4].toLowerCase().includes(q)) ||
        r.v < scNum(f.minV) || it[9] < scNum(f.minL) || it[13] < scNum(f.minB) || it[12] < scNum(f.minQ) ||
        (f.minX && !(r.x >= scNum(f.minX))) || (f.minSave && !(r.save >= scNum(f.minSave))) || (f.minRL && !(r.rl >= scNum(f.minRL))) ||
        (f.minVF && r.vf < scNum(f.minVF)) || (f.minLev && !(r.rawLev >= scNum(f.minLev)))
      );
    });
    let key = { v: (r) => r.v, l: (r) => r.it[9], b: (r) => r.it[13], qt: (r) => r.it[12], rp: (r) => r.it[10], rt: (r) => r.it[11], save: (r) => r.save ?? -1, rl: (r) => r.rl ?? -1, x: (r) => r.x ?? -1, lev: (r) => r.lev ?? -1, gain: (r) => r.gain ?? -1e12, new: (r) => scT(r.it) }[f.sort] || ((r) => r.v);
    return xs.sort((a, b) => key(b) - key(a));
  }, [mine, f]);

  // ---- insights on the filtered list ----
  let ins = ze.useMemo(() => {
    let reps = list.filter((r) => r.it[3] === "r" && r.it[4] !== f.acct);
    let outreach = reps.filter((r) => r.v >= acc.H).sort((a, b) => b.v - a.v);
    let levTier = f.pv !== "any" ? f.pv : "l", [, lo, hi] = SC_PV[levTier];
    let lev = reps.filter((r) => r.lev != null && r.it[6] >= Math.max(lo, 1e4) && r.it[6] < hi).sort((a, b) => b.lev - a.lev);
    let by = new Map(); reps.forEach((r) => r.it[4] && by.set(r.it[4], [...(by.get(r.it[4]) || []), r]));
    let accRows = [...by.entries()].map(([h, xs]) => ({ h, n: xs.length, med: scMed(xs.map((r) => r.v)), hits: xs.filter((r) => r.v >= acc.H).length, fol: xs[0].it[5], best: xs.reduce((a, b) => (b.v > a.v ? b : a)) }));
    let repeat = accRows.filter((a) => a.n >= 2).sort((a, b) => b.med - a.med).slice(0, 6), oneOff = accRows.filter((a) => a.n === 1 && a.best.v >= acc.H).sort((a, b) => b.best.v - a.best.v).slice(0, 4);
    let saves = list.filter((r) => r.save != null).sort((a, b) => b.save - a.save).slice(0, 5);
    let outl = list.filter((r) => r.it[3] !== "r" && r.x != null && r.x >= 3).sort((a, b) => b.x - a.x).slice(0, 5);
    let heatSrc = (f.type === "all" ? list.filter((r) => r.it[3] !== "r") : list).filter((r) => !r.fresh);
    let grid = SC_DAYS.map((_, d) => Array.from({ length: 6 }, (_, b) => { let vs = heatSrc.filter((r) => r.wd === d && Math.floor(r.hour / 4) === b).map((r) => r.v); return { n: vs.length, m: scMed(vs) }; }));
    let groups = [["Posts & quotes", ["o", "q"]], ["Replies", ["r"]]].map(([lab, ts]) => {
      let xs = list.filter((r) => ts.includes(r.it[3]) && !r.fresh);
      let pair = (fn) => { let A = xs.filter(fn).map((r) => r.v), B = xs.filter((r) => !fn(r)).map((r) => r.v); return { mA: scMed(A), nA: A.length, mB: scMed(B), nB: B.length, word: scVerdict(A, B) }; };
      return { lab, n: xs.length, media: pair((r) => r.it[14]), len: pair((r) => r.it[15] < 80) };
    }).filter((g) => g.n >= 3);
    return { outreach, lev, levTier, repeat, oneOff, saves, outl, grid, heatN: heatSrc.length, groups };
  }, [list, acc, f.pv, f.type, f.acct]);

  // ---- small UI helpers ----
  let ext = { target: "_blank", rel: "noopener noreferrer" };
  let Nb = ({ n }) => <span style={{ fontSize: 10.5, fontWeight: 650, padding: "1px 7px", borderRadius: 99, border: `1px solid ${K}`, color: n < 8 ? Q : E, marginLeft: 6, whiteSpace: "nowrap" }}>{`n=${n}${n < 8 ? " · small sample" : ""}`}</span>;
  let Card = ({ title, n, id, children }) => <div id={id} style={{ border: `1px solid ${K}`, borderRadius: 14, padding: 12, marginTop: 10, background: J }}><div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>{title}{n != null ? <Nb n={n} /> : null}</div>{children}</div>;
  let Muted = ({ children }) => <div style={{ fontSize: 12.5, color: E, lineHeight: 1.5 }}>{children}</div>;
  let stat = (label, val) => <span style={{ whiteSpace: "nowrap" }}><b style={{ color: F }}>{val}</b> {label}</span>;
  let lbl = (t, hint, ctl) => <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 700, color: F, minWidth: 0 }}>{t}{hint ? <span style={{ fontWeight: 400, color: E, fontSize: 11 }}>{hint}</span> : null}{ctl}</label>;
  let sel = (k, opts) => <select value={f[k]} onChange={(ev) => set({ [k]: ev.target.value })} style={{ ...CT, minHeight: 40 }}>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>;
  let numIn = (k, ph) => <input type="number" inputMode="decimal" min={0} value={f[k]} placeholder={ph} onChange={(ev) => set({ [k]: ev.target.value })} style={{ ...CT, minHeight: 40 }} />;
  let grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,140px),1fr))", gap: 10 };
  let pill = (t, on, onClick, key) => <button key={key || t} onClick={onClick} style={{ minHeight: 40, padding: "8px 13px", borderRadius: 99, border: `1px solid ${on ? "transparent" : K}`, background: on ? GR : "transparent", color: on ? ON : F, fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: e.font, whiteSpace: "nowrap", flex: "0 0 auto" }}>{t}</button>;
  let cleanText = (it) => it[16].replace(/^(@\w+\s*)+/, "") || "(media only)";

  let Row = (r, extra) => {
    let it = r.it;
    return (
      <div key={it[0]} style={{ padding: "10px 0", borderTop: `1px solid ${K}` }}>
        <a href={scUrl(it)} {...ext} style={{ color: F, textDecoration: "none", fontSize: 14, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: Q, marginRight: 6 }}>{SC_TYPE1[it[3]]}{it[3] === "r" && it[4] ? ` → @${it[4]}` : ""}</span>
          {cleanText(it)} <span style={{ color: Q }}>↗</span>
        </a>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 12, color: E, marginTop: 4 }}>
          {stat("views", scFmt(r.v))}
          {stat(it[9] === 1 ? "like" : "likes", it[9].toLocaleString("en-US"))}
          {it[13] ? stat(it[13] === 1 ? "save" : "saves", String(it[13])) : null}
          {it[10] ? stat(it[10] === 1 ? "reply" : "replies", String(it[10])) : null}
          {it[12] ? stat(it[12] === 1 ? "quote" : "quotes", String(it[12])) : null}
          {r.x != null && r.x >= 1 ? stat(it[3] === "r" ? `× ${You} typical post` : `× typical ${SC_TYPE1[it[3]].toLowerCase()}`, r.x.toFixed(r.x < 10 ? 1 : 0)) : null}
          {r.save != null ? stat("saves/1K", r.save.toFixed(1)) : null}
          {r.gain != null && r.gain > 0 ? stat(`since ${SC_PREV.label}`, "+" + scFmt(r.gain)) : null}
          {r.fresh ? <span title="Views keep climbing for about a day after posting" style={{ color: Q, whiteSpace: "nowrap" }}>🌱 {r.ageH < 1 ? "<1" : Math.floor(r.ageH)}h old at pull</span> : null}
          <span style={{ whiteSpace: "nowrap" }}>{SC_DAYS[r.wd]} {scHr(r.hour)} CT · {it[14] ? "media" : "text"}</span>
        </div>
        {it[3] === "r" && it[7] ? (
          <div style={{ fontSize: 12, color: E, marginTop: 3 }}>
            <a href={`https://x.com/${it[4] || "i"}/status/${it[7]}`} {...ext} style={LK}>parent post{it[6] >= 0 ? ` (${scFmt(it[6])} views)` : ""} ↗</a>
            {r.delay != null ? ` · replied ${scMin(r.delay)} after it` : ""}
            {r.lev != null ? ` · got ${(r.lev * 100).toFixed(r.lev < 0.01 ? 2 : 1)}% of its views` : ""}
          </div>
        ) : null}
        {extra}
      </div>
    );
  };

  // ---- chips for active filters ----
  let chips = [];
  f.type !== "all" && chips.push([`Only ${SC_TYPES[f.type]}`, { type: "all" }]);
  f.win !== "all" && chips.push([`Last ${f.win === "1" ? "24 hours" : f.win + " days"} before the pull`, { win: "all" }]);
  f.to && chips.push([`Replying to @${f.to}`, { to: "" }]);
  f.pv !== "any" && chips.push([`Replies under posts with ${SC_PV[f.pv][0]}`, { pv: "any" }]);
  f.size !== "any" && chips.push([`Replies under accounts with ${SC_SIZE[f.size][0]}`, { size: "any" }]);
  f.media !== "any" && chips.push([f.media === "media" ? "With a photo or video" : "Text only", { media: "any" }]);
  f.len !== "any" && chips.push([`Length: ${SC_LEN[f.len][0]}`, { len: "any" }]);
  f.age !== "any" && chips.push([f.age === "settled" ? "24h+ old at pull" : "Under 24h old at pull", { age: "any" }]);
  f.wd !== "any" && chips.push([`Posted on ${SC_DAYS[scNum(f.wd)]}`, { wd: "any" }]);
  (f.h0 !== "0" || f.h1 !== "23") && chips.push([`Posted ${scHr(scNum(f.h0))}–${scHr((scNum(f.h1) + 1) % 24)} CT`, { h0: "0", h1: "23" }]);
  f.q && chips.push([`Mentions "${f.q}"`, { q: "" }]);
  f.minV && chips.push([`${scFmt(scNum(f.minV))}+ views`, { minV: "" }]);
  f.minL && chips.push([`${f.minL}+ likes`, { minL: "" }]);
  f.minB && chips.push([`${f.minB}+ bookmarks`, { minB: "" }]);
  f.minQ && chips.push([`${f.minQ}+ quotes`, { minQ: "" }]);
  f.minX && chips.push([`Beat ${who} typical post ${f.minX}x`, { minX: "" }]);
  f.minSave && chips.push([`Saved ${f.minSave}+ times per 1K views`, { minSave: "" }]);
  f.minRL && chips.push([`${f.minRL}+ replies per like`, { minRL: "" }]);
  f.minVF && chips.push([`Views ≥ ${f.minVF}× follower count`, { minVF: "" }]);
  f.minLev && chips.push([`Reply got ${Math.round(scNum(f.minLev) * 100)}%+ of the parent's views`, { minLev: "" }]);
  let moreKeys = ["win", "to", "pv", "size", "media", "len", "age", "wd", "h0", "h1", "q", "minV", "minL", "minB", "minQ", "minX", "minSave", "minRL", "minVF", "minLev"];
  let moreCount = moreKeys.filter((k) => f[k] !== SC_DEF[k] && !(k === "h1" && f.h0 !== "0")).length;

  // ---- question chips (scoped to the account on screen; hidden when their data gate fails) ----
  let questions = [
    acc.known.length ? ["🎯 Where should I reply?", { type: "r", pv: acc.head ? acc.head.big.k : "l", sort: "v" }, "sc-reach"] : null,
    acc.tp.n >= 5 && acc.out ? ["🔁 Which replies beat my posts?", { type: "r", minX: "1", sort: "x" }, "sc-list"] : null,
    acc.tp.n >= 5 ? ["🚀 What were my breakout posts?", { type: "o", minX: "2", sort: "x" }, "sc-list"] : null,
    acc.hasGain ? ["📈 What's climbing right now?", { sort: "gain" }, "sc-list"] : null,
    acc.saveOK ? ["🔖 What gets saved?", { sort: "save" }, "sc-list"] : null,
    ["💬 Which posts started conversations?", { type: "o", sort: "rl" }, "sc-list"],
  ].filter(Boolean).map(([t, p, id]) => [f.acct === SC_ME ? t : t.replace(/\bmy\b/, `@${f.acct}'s`).replace(/\bI\b/, `@${f.acct}`), p, id]);

  let share = () => { let u = window.location.origin + window.location.pathname + scHash(f); try { window.history.replaceState(null, "", scHash(f)); } catch {} try { navigator.clipboard.writeText(u); setMsg("Link copied. Anyone opening it sees this exact scan."); } catch { setMsg(u); } };
  let heatMax = Math.max(1, ...ins.grid.flat().filter((c) => c.n >= 3).map((c) => c.m));
  let listViews = list.reduce((s, r) => s + r.v, 0);
  let tp = acc.tp;

  // ---- answer cards ----
  let reachCard = !acc.known.length ? (
    <Muted>Parent post views weren't fetched for @{f.acct}'s replies, so this can't be answered yet. Ask Grok Bot to re-pull @{f.acct} with parent posts.</Muted>
  ) : (
    <div>
      {acc.head ? (
        <div style={{ fontSize: 14.5, lineHeight: 1.45, marginBottom: 8 }}>
          Under posts with <b>{acc.head.big.lab}</b>, <b>{acc.head.big.hits} of {acc.head.big.n}</b> of {You} replies beat {You} typical post ({scFmt(acc.H)} views). Under posts with {acc.head.small.lab}: <b>{acc.head.small.hits} of {acc.head.small.n}</b>.
        </div>
      ) : <Muted>Not enough replies in two different parent-size groups (5+ each) to compare yet.</Muted>}
      {acc.head && acc.head.big.dom ? <div style={{ fontSize: 12.5, color: Q, marginBottom: 6 }}>Caveat: {acc.head.big.dom[1]} of those {acc.head.big.hits} were under @{acc.head.big.dom[0]} ({acc.head.big.accts} accounts in that group), so this may be about that account, not post size.</div> : null}
      {acc.tiers.map((t) => (
        <button key={t.k} onClick={() => run({ type: "r", pv: t.k, sort: "v" }, "sc-list")} style={{ display: "flex", width: "100%", gap: 8, alignItems: "baseline", flexWrap: "wrap", padding: "9px 0", minHeight: 40, border: "none", borderTop: `1px solid ${K}`, background: "transparent", color: F, cursor: "pointer", fontFamily: e.font, textAlign: "left", fontSize: 13 }}>
          <b style={{ flex: "1 1 100%" }}>Parent had {t.lab}</b>
          {t.n < 3 ? <span style={{ color: E }}>{t.n} repl{t.n > 1 ? "ies" : "y"}, too few to summarize</span> : <span style={{ color: E }}><b style={{ color: F }}>{t.hits}/{t.n}</b> beat typical post · median <b style={{ color: F }}>{scFmt(t.med)}</b></span>}
          <span style={{ color: Q }}>see →</span>
        </button>
      ))}
      <div style={{ fontSize: 11.5, color: E, marginTop: 6, lineHeight: 1.45 }}>
        "Beat typical post" = at least {scFmt(acc.H)} views ({tp.n >= 5 ? `median of ${tp.n} posts, ${tp.label}` : "fallback: 100 views, too few posts for a baseline"}). Grouped by the parent post's views at pull, not the account's followers.{acc.reps.length - acc.known.length ? ` ${acc.reps.length - acc.known.length} repl${acc.reps.length - acc.known.length > 1 ? "ies" : "y"} without parent views not counted.` : ""}
      </div>
    </div>
  );

  let top = acc.top;
  let hitCard = top ? (
    <div>
      <a href={scUrl(top.it)} {...ext} style={{ color: F, textDecoration: "none", display: "block" }}>
        <div style={{ fontSize: 26, fontWeight: 850, lineHeight: 1.1 }}>{scFmt(top.v)} <span style={{ fontSize: 13, fontWeight: 600, color: E }}>views</span></div>
        <div style={{ fontSize: 13, color: Q, fontWeight: 700, marginTop: 4 }}>{SC_TYPE1[top.it[3]]}{top.it[3] === "r" && top.it[4] ? ` under @${top.it[4]}` : ""} ↗</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.4, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cleanText(top.it)}</div>
      </a>
      <div style={{ fontSize: 12, color: E, marginTop: 6, lineHeight: 1.5 }}>
        {top.it[3] === "r" && top.it[6] > 0 ? `Parent post had ${scFmt(top.it[6])} views. ` : ""}
        {top.x != null && top.it[3] === "r" ? `${top.x.toFixed(0)}× ${You} typical post. ` : ""}
        {top.gain != null && top.gain > 0 ? `+${scFmt(top.gain)} since ${SC_PREV.label}. ` : ""}
        {top.fresh ? `🌱 ${Math.floor(top.ageH)}h old at pull. ` : ""}
        This one item is <b style={{ color: F }}>{Math.round((top.v / Math.max(1, acc.total)) * 100)}%</b> of all {scFmt(acc.total)} views in this pull.
      </div>
    </div>
  ) : <Muted>No items loaded.</Muted>;

  let postCard = (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
      {tp.n >= 5 ? <div>{You[0].toUpperCase() + You.slice(1)} typical post: <b>{scFmt(tp.med)}</b> views <Nb n={tp.n} /><div style={{ fontSize: 11.5, color: E }}>middle half {scFmt(tp.p25)}–{scFmt(tp.p75)} · {tp.label}</div></div> : <Muted>Only {tp.n} posts loaded, too few for a typical-post number.</Muted>}
      {acc.bestPost ? <div style={{ marginTop: 6 }}>Best post: <a href={scUrl(acc.bestPost.it)} {...ext} style={LK}>{scFmt(acc.bestPost.v)} views ↗</a> <span style={{ color: E }}>"{cleanText(acc.bestPost.it).slice(0, 70)}{cleanText(acc.bestPost.it).length > 70 ? "…" : ""}"</span></div> : null}
      {acc.pm.length + acc.pt.length >= 3 ? <div style={{ marginTop: 6, color: E }}>Media vs text (posts only): <b style={{ color: F }}>{scFmt(scMed(acc.pm))}</b> ({acc.pm.length}) vs <b style={{ color: F }}>{scFmt(scMed(acc.pt))}</b> ({acc.pt.length}) → {scVerdict(acc.pm, acc.pt)}</div> : null}
    </div>
  );

  return (
    <details open={open} onToggle={(ev) => setOpen(ev.currentTarget.open)} style={{ marginTop: 24, borderRadius: 16, border: `1px solid ${K}`, background: e.card, padding: "4px 14px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 15, padding: "12px 0", minHeight: 24 }}>
        🔬 Post scanner <span style={{ fontWeight: 500, fontSize: 12, color: E }}>· what took off, and why</span>
      </summary>
      <div style={{ paddingBottom: 16 }}>
        {/* header: account + coverage */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select aria-label="Account" value={f.acct} onChange={(ev) => run({ acct: ev.target.value })} style={{ ...CT, minHeight: 40, fontWeight: 700, flex: "0 1 360px", maxWidth: "100%" }}>
            {accts.map((a) => <option key={a} value={a}>@{a} ({scFmt(Yt.followers[a] || 0)} followers)</option>)}
          </select>
          <span style={{ fontSize: 12, color: E }}>{mine.length} items · pulled {Yt.pulledAt}</span>
        </div>
        <div style={{ fontSize: 11.5, color: E, marginTop: 6, lineHeight: 1.45 }}>
          {acc.cov.join(" · ")}. Views are one snapshot; items under a day old are still climbing.
          {acc.total ? <> {" "}Top item = <b style={{ color: F }}>{Math.round((acc.top.v / acc.total) * 100)}%</b> of {scFmt(acc.total)} views{acc.bigReach ? <>; replies under 100K+-view posts = <b style={{ color: F }}>{Math.round((acc.bigReach / acc.total) * 100)}%</b></> : null}.</> : null}
        </div>

        {/* three answer cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 10, marginTop: 4 }}>
          <Card title="🏆 Biggest hit">{hitCard}</Card>
          <Card id="sc-reach" title="🎯 Where should I reply?" n={acc.known.length || null}>{reachCard}</Card>
          <Card title="✍️ What should I post?">{postCard}</Card>
        </div>

        {/* question chips */}
        <div style={{ fontWeight: 800, fontSize: 13, margin: "14px 0 6px" }}>Ask a question</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flexWrap: "nowrap", paddingBottom: 6, scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          {questions.map(([t, p, id]) => pill(t, false, () => run(p, id), t))}
        </div>
        {presets.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: E }}>Saved:</span>
            {presets.map((p, i) => (
              <span key={i} style={{ display: "inline-flex", gap: 2 }}>
                {pill("⭐ " + p.name, false, () => { setFull({ ...SC_DEF, ...p.f }); setLim(8); })}
                <button aria-label={"Delete " + p.name} onClick={() => setPresets(presets.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: E, cursor: "pointer", minWidth: 32 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* always-visible controls */}
        <div id="sc-list" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, alignItems: "center" }}>
          {[["all", "All"], ["o", "Posts"], ["r", "Replies"], ["q", "Quotes"]].map(([k, t]) => pill(t, f.type === k, () => set({ type: k }), "t" + k))}
          <select aria-label="Sort by" value={f.sort} onChange={(ev) => set({ sort: ev.target.value })} style={{ ...CT, minHeight: 40, flex: "1 1 170px" }}>
            {Object.entries(SC_SORTS).filter(([k]) => (k !== "gain" || acc.hasGain) && (k !== "save" || acc.saveOK)).map(([k, t]) => <option key={k} value={k}>Sort: {t}</option>)}
          </select>
          {pill(`⚙️ More filters${moreCount ? ` (${moreCount})` : ""}`, more, () => setMore(!more), "more")}
        </div>

        {more && (
          <div style={{ border: `1px solid ${K}`, borderRadius: 14, padding: 12, marginTop: 10, background: J }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Who & when</div>
            <div style={grid2}>
              {lbl("Time window", "back from the pull", sel("win", [["all", "All loaded"], ["1", "Last 24 hours"], ["3", "Last 3 days"], ["7", "Last 7 days"]]))}
              {lbl("Age at pull", "views climb for ~a day", sel("age", [["any", "Any age"], ["settled", "24h+ old"], ["fresh", "Under 24h old"]]))}
              {lbl("Weekday", "CT", sel("wd", [["any", "Any day"], ...SC_DAYS.map((d, i) => [String(i), d])]))}
              {lbl("Time of day", "CT", <select value={`${f.h0}-${f.h1}`} onChange={(ev) => { let [a, b] = ev.target.value.split("-"); set({ h0: a, h1: b }); }} style={{ ...CT, minHeight: 40 }}>
                <option value="0-23">Any time</option>
                {SC_BLOCKS.map(([a, b]) => <option key={a} value={`${a}-${b}`}>{scHr(a)}–{scHr((b + 1) % 24)}</option>)}
                {!(f.h0 === "0" && f.h1 === "23") && !SC_BLOCKS.some(([a, b]) => `${a}-${b}` === `${f.h0}-${f.h1}`) ? <option value={`${f.h0}-${f.h1}`}>{scHr(scNum(f.h0))}–{scHr((scNum(f.h1) + 1) % 24)} (custom)</option> : null}
              </select>)}
              {lbl("Keyword", "in text or handle", <input value={f.q} placeholder="e.g. Grok, $TSLA" onChange={(ev) => set({ q: ev.target.value })} style={{ ...CT, minHeight: 40 }} />)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, margin: "14px 0 8px" }}>Replies</div>
            <div style={grid2}>
              {lbl("Replying to", "one account", sel("to", [["", "Any account"], ...repliedTo.map(([h, n]) => [h, `@${h} (${n})`])]))}
              {lbl("Parent post size", "views on the post replied to", sel("pv", [["any", "Any size"], ...Object.entries(SC_PV).map(([k, [t]]) => [k, t])]))}
              {lbl("Parent account size", "followers", sel("size", [["any", "Any size"], ...Object.entries(SC_SIZE).map(([k, [t]]) => [k, t])]))}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, margin: "14px 0 8px" }}>Format & thresholds</div>
            <div style={grid2}>
              {lbl("Media", "photo/video or not", sel("media", [["any", "Any"], ["media", "With media"], ["text", "Text only"]]))}
              {lbl("Length", "characters", sel("len", [["any", "Any length"], ...Object.entries(SC_LEN).map(([k, [t]]) => [k, t])]))}
              {lbl("Min views", "", numIn("minV", "0"))}
              {lbl("Min likes", "", numIn("minL", "0"))}
              {lbl("Beat typical post by", "× (replies vs your posts)", numIn("minX", "e.g. 2"))}
              {acc.saveOK ? lbl("Min bookmarks", "", numIn("minB", "0")) : null}
              {acc.saveOK ? lbl("Saves per 1K views", "1K+ view items", numIn("minSave", "e.g. 2")) : null}
            </div>
            {!acc.saveOK ? <div style={{ fontSize: 11.5, color: E, marginTop: 8 }}>Bookmark filters are hidden: only {acc.saved} of {mine.length} @{f.acct} items were ever saved.</div> : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <input value={pname} placeholder="Name this scan to save it" onChange={(ev) => setPname(ev.target.value)} style={{ ...CT, minHeight: 40, flex: "1 1 160px" }} />
              <button disabled={!pname.trim()} onClick={() => { setPresets([...presets, { name: pname.trim().slice(0, 40), f }]); setPname(""); setMsg("Saved on this device."); }} style={{ ...je(false), minHeight: 40, opacity: pname.trim() ? 1 : 0.5 }}>Save</button>
            </div>
          </div>
        )}

        {/* active chips + share */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 750, padding: "6px 0" }}>Showing {who} {SC_TYPES[f.type]}{chips.length ? ":" : ""}</span>
          {chips.map(([t, p]) => <button key={t} onClick={() => set(p)} style={{ minHeight: 34, padding: "5px 10px", borderRadius: 99, border: `1px solid ${A1}`, background: "transparent", color: F, fontSize: 12, cursor: "pointer", fontFamily: e.font }}>{t} ✕</button>)}
          {chips.length ? <button onClick={() => run({})} style={{ ...je(false), minHeight: 34 }}>Clear</button> : null}
          <button onClick={share} style={{ ...je(), minHeight: 34 }}>🔗 Share this scan</button>
        </div>
        {msg && <div style={{ fontSize: 12, color: E, marginTop: 6, wordBreak: "break-all" }}>{msg}</div>}

        {/* results */}
        <div style={{ fontSize: 12.5, color: E, margin: "8px 0 2px" }}>{list.length} of {mine.length} items · {scFmt(listViews)} views · sorted by {SC_SORTS[f.sort] || "views"}</div>
        {list.slice(0, lim).map((r) => Row(r))}
        {list.length > lim && <button onClick={() => setLim(lim + 12)} style={{ ...je(false), marginTop: 8, minHeight: 40 }}>Show 12 more ({list.length - lim} left)</button>}
        {!list.length && <div style={{ fontSize: 13, color: E, padding: "10px 0" }}>Nothing matches. Tap a chip to remove a filter, or Clear.</div>}

        {/* insights */}
        <div style={{ fontWeight: 850, fontSize: 16, marginTop: 22 }}>💡 Patterns <span style={{ fontWeight: 500, fontSize: 12, color: E }}>from the {list.length} items above · every row links to the real post</span></div>

        <Card title={`🔁 Replies that out-reached ${You} posts`} n={list.filter((r) => r.it[3] === "r").length}>
          {tp.n < 5 ? <Muted>Too few posts for a typical-post baseline.</Muted> : ins.outreach.length ? (
            <div>
              <Muted>{ins.outreach.length} of these replies got at least {You} typical post's views ({scFmt(acc.H)}).</Muted>
              {ins.outreach.slice(0, 5).map((r) => Row(r))}
            </div>
          ) : <Muted>No reply here reached {You} typical post ({scFmt(acc.H)} views).</Muted>}
        </Card>

        <Card title={`📐 Share of the parent's views (parents with ${SC_PV[ins.levTier][0]})`} n={ins.lev.length}>
          {ins.lev.length >= 3 ? ins.lev.slice(0, 3).map((r) => Row(r)) : ins.lev.length ? <div><Muted>Only {ins.lev.length}, too few to rank. Shown as-is:</Muted>{ins.lev.map((r) => Row(r))}</div> : <Muted>No replies under parents of this size in the current filter. Only compare this percentage between parents of similar size: on tiny threads it's meaningless.</Muted>}
        </Card>

        <Card title="🐋 Accounts to reply under">
          {ins.repeat.length ? (
            <div>
              <Muted>Accounts with 2+ replies, by median views of the replies. "hits" = replies that beat {You} typical post.</Muted>
              {ins.repeat.map((a) => (
                <div key={a.h} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "8px 0", borderTop: `1px solid ${K}`, fontSize: 13, flexWrap: "wrap" }}>
                  <a href={`https://x.com/${a.h}`} {...ext} style={{ ...LK, flex: "1 1 120px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>@{a.h}</a>
                  <span style={{ color: E, fontSize: 11.5, whiteSpace: "nowrap" }}>{scFmt(a.fol)} followers · {a.hits}/{a.n} hits</span>
                  <b style={{ whiteSpace: "nowrap" }}>{scFmt(a.med)}</b><Nb n={a.n} />
                  <a href={scUrl(a.best.it)} {...ext} style={{ ...LK, fontSize: 12, whiteSpace: "nowrap" }}>best ↗</a>
                </div>
              ))}
            </div>
          ) : <Muted>No account has 2+ replies in this filter.</Muted>}
          {ins.oneOff.length ? <div style={{ marginTop: 8, fontSize: 12.5, color: E, lineHeight: 1.6 }}>One-off hits (1 reply each, not a pattern yet): {ins.oneOff.map((a, i) => <span key={a.h}>{i ? " · " : ""}<a href={scUrl(a.best.it)} {...ext} style={LK}>@{a.h} {scFmt(a.best.v)} ↗</a></span>)}</div> : null}
        </Card>

        <Card title="🔖 Most saved (bookmarks per 1K views, items with 1K+ views)" n={acc.saveOK ? ins.saves.length : null}>
          {!acc.saveOK ? <Muted>Only {acc.saved} of {mine.length} @{f.acct} items were ever saved ({acc.saveRows} with 1K+ views). Not enough to rank saves.</Muted> : ins.saves.length ? ins.saves.map((r) => Row(r)) : <Muted>No saved items with 1K+ views in this filter.</Muted>}
        </Card>

        <Card title="📈 Posts that beat their typical (3×+)" n={ins.outl.length}>
          {ins.outl.length ? ins.outl.map((r) => Row(r, <div style={{ fontSize: 12, color: Q, marginTop: 3 }}>{r.x.toFixed(1)}× the typical {SC_TYPE1[r.it[3]].toLowerCase()} ({scFmt(r.base.med)} views, median of {r.base.n}, {r.base.label}).</div>)) : <Muted>No post or quote here beat its typical by 3× or more.</Muted>}
        </Card>

        <Card title={`🗓️ When these were posted (median views, CT${f.type === "all" ? ", posts & quotes only" : ""}, 24h+ old)`} n={ins.heatN}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "34px repeat(6,minmax(40px,1fr))", gap: 3, fontSize: 10.5, minWidth: 290 }}>
              <span />
              {[0, 4, 8, 12, 16, 20].map((h) => <span key={h} style={{ color: E, textAlign: "center" }}>{scHr(h)}–{scHr((h + 4) % 24)}</span>)}
              {ins.grid.map((row, d) => [
                <span key={"d" + d} style={{ color: E, alignSelf: "center" }}>{SC_DAYS[d]}</span>,
                ...row.map((c, b) => (
                  <button key={d + "-" + b} disabled={!c.n} onClick={() => set({ wd: String(d), h0: String(b * 4), h1: String(b * 4 + 3) })} title={c.n ? `${c.n} items, median ${Math.round(c.m)} views` : "no items"}
                    style={{ height: 36, borderRadius: 6, border: `1px solid ${K}`, cursor: c.n ? "pointer" : "default", padding: 0, color: F, fontSize: 10, fontWeight: 700, lineHeight: 1.1,
                      background: !c.n ? "transparent" : c.n < 3 ? `repeating-linear-gradient(45deg, transparent 0 4px, ${K} 4px 6px)` : `color-mix(in srgb, ${Q} ${Math.round(15 + 85 * Math.sqrt(c.m / heatMax))}%, transparent)` }}>
                    {c.n ? (c.n < 3 ? <span style={{ color: E }}>n={c.n}</span> : <>{scFmt(c.m)}<br /><span style={{ fontWeight: 500, opacity: 0.75 }}>n={c.n}</span></>) : ""}
                  </button>
                )),
              ])}
            </div>
            <div style={{ fontSize: 11.5, color: E, marginTop: 6 }}>Hatched cells have fewer than 3 items: no median shown. Tap a cell to filter. This shows when items were posted, not a best time to post.</div>
          </div>
        </Card>

        <Card title="⚖️ Quick comparisons (within one type, 24h+ old)">
          {ins.groups.length ? ins.groups.map((g) => (
            <div key={g.lab} style={{ fontSize: 13, lineHeight: 1.6, padding: "6px 0", borderTop: `1px solid ${K}` }}>
              <b>{g.lab}</b> <span style={{ color: E }}>({g.n})</span>
              <div>With media <b>{scFmt(g.media.mA)}</b> ({g.media.nA}) · text only <b>{scFmt(g.media.mB)}</b> ({g.media.nB}) → <span style={{ color: Q }}>{g.media.word}</span></div>
              <div>Short (under 80 chars) <b>{scFmt(g.len.mA)}</b> ({g.len.nA}) · longer <b>{scFmt(g.len.mB)}</b> ({g.len.nB}) → <span style={{ color: Q }}>{g.len.word}</span></div>
            </div>
          )) : <Muted>Too few settled items to compare.</Muted>}
          <div style={{ fontSize: 11.5, color: E, marginTop: 6 }}>Medians. A difference is only called when both sides have 8+ items, the gap is 1.5×+, and it holds with each side's top item removed.</div>
        </Card>

        <details style={{ marginTop: 12, border: `1px solid ${K}`, borderRadius: 12, padding: "2px 12px" }}>
          <summary style={{ cursor: "pointer", color: Q, fontWeight: 750, fontSize: 13, padding: "10px 0" }}>📘 How to read this</summary>
          <ul style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 20, margin: "4px 0 10px" }}>
            <li><b>Typical post</b> = median views of the account's posts that were 24h+ old at the pull (falls back to 6h+ and says so). Replies are compared to it, because a reply that beats your posts reached more people than your own feed did.</li>
            <li><b>Where should I reply?</b> groups replies by how many views the parent post had at the pull, not by the account's followers.</li>
            <li><b>Small samples:</b> n under 8 is marked "small sample". Under 3, no median is shown at all.</li>
            <li><b>Fresh items</b> (🌱, under 24h) are still climbing{SC_PREV ? `; between the ${SC_PREV.label} and ${Yt.pulledAt.split(", ").pop()} pulls, items under 6h old gained far more than older ones` : ""}. They're left out of baselines and the time grid.</li>
            <li><b>Reply speed</b> comes from the post IDs, which encode when each post was made.</li>
            <li>Times are Central. "Share this scan" copies a link with your filters; "Save" keeps a preset on this device.</li>
          </ul>
        </details>

        <div style={{ fontSize: 11.5, color: E, marginTop: 12, lineHeight: 1.5 }}>
          Data: public X API reads, {Yt.pulledAt}{SC_PREV ? ` (earlier snapshot ${SC_PREV.label} for @${SC_ME})` : ""}. @RagnarLongstock: {rows.filter((r) => r.it[1] === SC_ME).length} posts, replies and quotes; parent post views fetched for {rows.filter((r) => r.it[1] === SC_ME && r.it[3] === "r" && r.it[6] >= 0).length} of {rows.filter((r) => r.it[1] === SC_ME && r.it[3] === "r").length} replies. @MiaAI_lab: her latest {rows.filter((r) => r.it[1] === "MiaAI_lab").length} items (about one day); parent views not fetched for her replies. To scan another handle, ask Grok Bot to pull it into this page.
        </div>
      </div>
    </details>
  );
}
