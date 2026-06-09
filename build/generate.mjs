// Notion -> static article pages generator for StratSchool.
// Reads the "Articles" Notion database and:
//   - generates /resources/<slug>/index.html for each Published article (matching the site design + cover image)
//   - injects article cards into /resources/index.html between the NOTION_CARDS markers
// Usage:  NOTION_TOKEN=... NOTION_DB=... node build/generate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.NOTION_TOKEN;
const DB = (process.env.NOTION_DB || "").replace(/-/g, "");
if (!TOKEN || !DB) { console.error("Missing NOTION_TOKEN or NOTION_DB env var"); process.exit(1); }

const NV = "2022-06-28";
const H = { Authorization: `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" };

async function notion(url, opts = {}) {
  const r = await fetch("https://api.notion.com/v1" + url, { headers: H, ...opts });
  if (!r.ok) throw new Error(`Notion ${url} -> ${r.status} ${await r.text()}`);
  return r.json();
}

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clean = (s) => String(s || "").replace(/ /g, " ").trim();

// rich_text array -> inline HTML
function rich(rt) {
  if (!rt || !rt.length) return "";
  return rt.map((t) => {
    let s = esc(t.plain_text);
    const a = t.annotations || {};
    if (a.code) s = `<code>${s}</code>`;
    if (a.bold) s = `<strong>${s}</strong>`;
    if (a.italic) s = `<em>${s}</em>`;
    if (a.underline) s = `<u>${s}</u>`;
    if (a.strikethrough) s = `<s>${s}</s>`;
    if (t.href) s = `<a href="${esc(t.href)}" target="_blank" rel="noreferrer">${s}</a>`;
    return s;
  }).join("");
}

async function getBlocks(id) {
  let out = [], cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}&page_size=100` : `?page_size=100`;
    const d = await notion(`/blocks/${id}/children${q}`);
    out = out.concat(d.results);
    cursor = d.has_more ? d.next_cursor : null;
  } while (cursor);
  return out;
}

async function download(url, destAbs) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, buf);
}
const fileUrl = (f) => (f?.type === "external" ? f.external.url : f?.file?.url);
const extFromUrl = (u) => { const m = (u.split("?")[0].match(/\.(png|jpe?g|webp|gif|svg)$/i)); return m ? m[0].toLowerCase() : ".jpg"; };

// Convert blocks -> array of "cards" (each card = {heading, html}); first card may have no heading (intro)
async function blocksToCards(blocks, slug) {
  const cards = [];
  let cur = { heading: null, parts: [] };
  let listType = null, listItems = [];
  let imgN = 0;
  const flushList = () => {
    if (listItems.length) {
      const tag = listType === "numbered_list_item" ? "ol" : "ul";
      cur.parts.push(`<${tag}>${listItems.join("")}</${tag}>`);
      listItems = []; listType = null;
    }
  };
  const pushCard = () => { flushList(); if (cur.heading || cur.parts.length) cards.push({ heading: cur.heading, html: cur.parts.join("\n") }); cur = { heading: null, parts: [] }; };

  for (const b of blocks) {
    const t = b.type;
    if (t === "heading_1" || t === "heading_2" || t === "heading_3") {
      flushList();
      // start a new card at each H1/H2 (H3 stays inline as a sub-heading)
      if (t === "heading_3") { cur.parts.push(`<h3>${rich(b[t].rich_text)}</h3>`); }
      else { pushCard(); cur.heading = rich(b[t].rich_text); }
      continue;
    }
    if (t === "bulleted_list_item" || t === "numbered_list_item") {
      if (listType && listType !== t) flushList();
      listType = t; listItems.push(`<li>${rich(b[t].rich_text)}</li>`); continue;
    }
    flushList();
    if (t === "paragraph") { const h = rich(b.paragraph.rich_text); if (h) cur.parts.push(`<p>${h}</p>`); }
    else if (t === "quote") cur.parts.push(`<blockquote>${rich(b.quote.rich_text)}</blockquote>`);
    else if (t === "callout") cur.parts.push(`<p>${rich(b.callout.rich_text)}</p>`);
    else if (t === "to_do") cur.parts.push(`<p>${b.to_do.checked ? "✅" : "⬜"} ${rich(b.to_do.rich_text)}</p>`);
    else if (t === "divider") cur.parts.push(`<div class="rule"></div>`);
    else if (t === "image") {
      const u = fileUrl(b.image); if (u) {
        imgN++; const rel = `/assets/article-covers/${slug}-img-${imgN}${extFromUrl(u)}`;
        try { await download(u, path.join(ROOT, rel.slice(1))); cur.parts.push(`<img class="article-body-img" src="${rel}" alt="${esc(rich(b.image.caption))}" loading="lazy">`); } catch {}
      }
    }
  }
  pushCard();
  return cards;
}

function articleHtml(a) {
  const title = clean(a.title);
  const cardsHtml = a.cards.map((c, i) => {
    const delay = i === 0 ? "" : ` style="--delay: ${i * 60}ms;"`;
    const id = c.heading ? ` id="${slugify(stripTags(c.heading))}"` : "";
    const head = c.heading ? `<h2>${c.heading}</h2>\n` : "";
    return `            <div class="card reveal"${id}${delay}>\n              ${head}${c.html}\n            </div>`;
  }).join("\n\n");
  const toc = a.cards.filter(c => c.heading).map(c => `                <a href="#${slugify(stripTags(c.heading))}">${stripTags(c.heading)}</a>`).join("\n");
  const cover = a.coverRel ? `\n      <div class="container section-inner" style="padding-top:0;"><img class="article-cover" src="${a.coverRel}" alt="${esc(title)}" style="width:100%;border-radius:24px;display:block;margin:0 auto;max-width:1000px;"></div>\n` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} | StratSchool</title>
  <meta name="description" content="${esc(a.excerpt || title)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/site.css">
</head>
<body>
  <div class="site-shell article-page">
    <nav class="site-nav" data-nav>
      <div class="container nav-inner">
        <a class="nav-brand" href="/"><img src="/logo.png" alt="StratSchool"></a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/bootcamp/">For Founders</a>
          <a href="/institutions/">For Institutions</a>
          <a href="/edii-tn-ai/">For Governments</a>
          <a href="/resources/" aria-current="page">Resources</a>
          <a class="btn btn-primary" href="/bootcamp/">Join Next Cohort</a>
        </div>
        <button class="menu-toggle" data-menu-toggle aria-label="Open menu" aria-expanded="false"><span></span></button>
      </div>
    </nav>
    <div class="mobile-menu" data-mobile-menu>
      <div class="container">
        <a href="/">Home</a>
        <a href="/bootcamp/">For Founders</a>
        <a href="/institutions/">For Institutions</a>
        <a href="/edii-tn-ai/">For Governments</a>
        <a href="/resources/">Resources</a>
        <a href="/about/">About</a>
      </div>
    </div>

    <main>
      <section class="section dark-section page-hero">
        <div class="container section-inner">
          <div class="article-meta reveal"><span class="article-tag">${esc(a.category || "Article")}</span><span>${esc(a.readTime || "")}</span></div>
          <h1 class="hero-title compact reveal" style="--delay: 80ms;">${esc(title)}</h1>
          <p class="lede reveal" style="--delay: 160ms;">${esc(a.excerpt || "")}</p>
        </div>
      </section>
${cover}
      <section class="section light-section">
        <div class="container section-inner article-shell">
          <article class="article-prose">
${cardsHtml}
          </article>

          <aside class="article-aside">
            ${toc ? `<div class="card reveal">
              <div class="kicker">In this article</div>
              <div class="mini-toc">
${toc}
              </div>
            </div>` : ""}
            <div class="card reveal" style="--delay: 80ms;">
              <div class="kicker">Related</div>
              <h3 class="card-title">Need more structure?</h3>
              <p class="body-copy">See how the 12-week StratSchool founder journey turns ideas into visible startup progress.</p>
              <a class="btn btn-secondary" href="/bootcamp/">Explore For Founders</a>
            </div>
          </aside>
        </div>
      </section>
<section class="section dark-section footer"><div class="container section-inner"><div class="footer-grid"><div><img src="/logo.png" alt="StratSchool" style="height: 38px; width: auto;"><p class="footer-copy">Sharper startup education, execution systems, and partnership models for founders, institutions, and government programs.</p></div><div><h4>Programs</h4><div class="footer-links"><a href="/bootcamp/">For Founders</a><a href="/institutions/">For Institutions</a><a href="/edii-tn-ai/">For Governments</a><a href="/resources/">Resources</a></div></div><div><h4>Company</h4><div class="footer-links"><a href="/about/">About Us</a><a href="https://www.stratschool.org/" target="_blank" rel="noreferrer">Main Website</a><a href="https://www.instagram.com/strat.school/" target="_blank" rel="noreferrer">Instagram</a><a href="mailto:hello@stratschool.org">hello@stratschool.org</a></div></div><div><h4>Partners</h4><div class="footer-links"><a href="/institutions/">Institutional Partners</a><a href="https://www.nebulaa.ai/" target="_blank" rel="noreferrer">Nebulaa</a><a href="http://pragmr.com/" target="_blank" rel="noreferrer">Pragmr</a><a href="/edii-tn-ai/">EDII-TN</a></div></div></div><div class="footer-bottom"><span>© 2026 StratSchool | Noburo Business Services LLP</span><span>hello@stratschool.org</span></div></div></section>
    </main>
  </div>
  <script src="/site.js"></script>
</body>
</html>
`;
}

function cardHtml(a, i) {
  const delay = i === 0 ? "" : ` style="--delay: ${i * 60}ms;"`;
  return `            <article class="card resource-card blog-card reveal"${delay}>\n` +
    `              <div class="article-meta"><span class="article-tag">${esc(a.category || "Article")}</span><span>${esc(a.readTime || "")}</span></div>\n` +
    `              <h3 class="card-title">${esc(clean(a.title))}</h3>\n` +
    `              <p class="body-copy">${esc(a.excerpt || "")}</p>\n` +
    `              <div class="inline-actions"><a class="btn btn-secondary" href="/resources/${a.slug}/">Read article</a></div>\n` +
    `            </article>`;
}

const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, "");
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function prop(props, name) {
  const v = props[name]; if (!v) return "";
  if (v.title) return v.title.map(x => x.plain_text).join("");
  if (v.rich_text) return v.rich_text.map(x => x.plain_text).join("");
  if (v.select) return v.select?.name || "";
  if (typeof v.checkbox === "boolean") return v.checkbox;
  if (v.files) return v.files;
  return "";
}

(async () => {
  // query published, newest first
  const q = await notion(`/databases/${DB}/query`, {
    method: "POST",
    body: JSON.stringify({ filter: { property: "Published", checkbox: { equals: true } } }),
  });
  const articles = [];
  for (const page of q.results) {
    const p = page.properties;
    const title = clean(prop(p, "Title"));
    let slug = clean(prop(p, "Slug")) || slugify(title);
    slug = slugify(slug);
    const a = {
      id: page.id,
      title,
      slug,
      category: clean(prop(p, "Category")),
      readTime: clean(prop(p, "Read time")),
      excerpt: clean(prop(p, "Excerpt")),
      coverRel: null,
      cards: [],
    };
    // cover
    const files = prop(p, "Cover");
    if (Array.isArray(files) && files.length) {
      const u = fileUrl(files[0]);
      if (u) { const rel = `/assets/article-covers/${slug}${extFromUrl(u)}`; try { await download(u, path.join(ROOT, rel.slice(1))); a.coverRel = rel; } catch (e) { console.warn("cover dl failed", slug, e.message); } }
    }
    const blocks = await getBlocks(page.id);
    a.cards = await blocksToCards(blocks, slug);
    if (!a.cards.length) a.cards = [{ heading: null, html: `<p>${esc(a.excerpt)}</p>` }];
    articles.push(a);
    // write article page
    const dir = path.join(ROOT, "resources", slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), articleHtml(a), "utf8");
    console.log("generated /resources/" + slug + "/");
  }

  // inject cards into listing
  const listingPath = path.join(ROOT, "resources", "index.html");
  let listing = fs.readFileSync(listingPath, "utf8");
  const cards = articles.map((a, i) => cardHtml(a, i)).join("\n");
  listing = listing.replace(/<!--NOTION_CARDS_START-->[\s\S]*?<!--NOTION_CARDS_END-->/,
    `<!--NOTION_CARDS_START-->\n${cards}\n            <!--NOTION_CARDS_END-->`);
  fs.writeFileSync(listingPath, listing, "utf8");
  console.log(`\nDone. ${articles.length} Notion article(s) generated + listing updated.`);
})();
