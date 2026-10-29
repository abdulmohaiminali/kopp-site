/* KOPP storefront logic. Settings and products live in products.js. */
const K = window.KOPP, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => `${K.currency} ${n.toLocaleString("en-PK")}`;
const page = document.body.dataset.page;
let bag = []; try { bag = JSON.parse(localStorage.getItem("kopp-bag")) || []; } catch {}
const save = () => { try { localStorage.setItem("kopp-bag", JSON.stringify(bag)); } catch {} };

/* ---------- Shared header, footer and bag (edit once, shows on every page) ---------- */
const live = K.products.filter(p => !p.sold).length;
const nav = [["index.html", "Home", "home"], ["index.html#shop", `Shop ${live} Pairs`, ""], ["about.html", "About", "about"]];
$("#hd").innerHTML = `<a class="logo" href="index.html" aria-label="Kopp home"><img src="img/logo.png" alt="Kopp."></a>
<nav>${nav.map(([h, t, p]) => `<a href="${h}"${p && p === page ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
<div class="r"><a href="index.html?q#shop" id="srch">Search</a><button id="open-bag">Bag (<span id="n">0</span>)</button></div>`;
$("#ft").innerHTML = `<div><img src="img/logo-cream.png" alt="Kopp."><small>${K.shipping}</small></div>
<div><a href="returns.html">Returns</a><a href="shipping.html">Shipping</a><a href="privacy.html">Privacy</a><a href="https://wa.me/${K.whatsapp}">WhatsApp</a>${K.instagram ? `<a href="https://instagram.com/${K.instagram}">Instagram</a>` : ""}</div>`;
document.body.insertAdjacentHTML("beforeend", `<div class="veil" id="veil"></div>
<aside class="bag" id="bag" aria-label="Your bag"><div class="top"><b>Your bag</b><button id="close-bag">Close</button></div>
<ul id="items"></ul><p id="total"></p>
<input id="nm" placeholder="Your name" autocomplete="name" aria-label="Your name">
<textarea id="ad" rows="3" placeholder="Delivery address and city" aria-label="Delivery address"></textarea>
<div id="slide"></div><small>We confirm payment and delivery with you on WhatsApp.</small></aside>
<button class="bagbar" id="barbag" type="button" hidden><span>Bag (<span id="bar-n">0</span>)</span><b id="bar-t"></b><span>View bag</span></button>`);

/* ---------- Bag ---------- */
const items = () => bag.map(r => K.products.find(p => p.ref === r)).filter(p => p && !p.sold);
const total = () => items().reduce((s, p) => s + p.price, 0);
const openBag = o => { $("#bag").classList.toggle("open", o); $("#veil").classList.toggle("open", o); };
function drawBag() {
  const it = items(); $("#n").textContent = it.length;
  $("#items").innerHTML = it.length ? it.map(p => `<li><span>${p.name}<small>Size ${p.size}, grade ${p.grade}</small></span><span>${money(p.price)}<button data-rm="${p.ref}"><small>Remove</small></button></span></li>`).join("") : "<li>Your bag is empty. Pairs are one of one, so add yours before it goes.</li>";
  $("#total").textContent = `Total ${money(total())}`; if (slider) slider.setDisabled(!it.length);
  const bar = $("#barbag"); bar.hidden = !it.length;
  $("#bar-n").textContent = it.length; $("#bar-t").textContent = money(total());
  document.body.classList.toggle("has-bar", it.length > 0);
  $$(".add[data-ref]").forEach(b => b.textContent = bag.includes(b.dataset.ref) ? "In your bag" : "Add to bag");
}
document.addEventListener("click", e => {
  const t = e.target, add = t.closest(".add[data-ref]"), rm = t.closest("[data-rm]");
  if (add) { const r = add.dataset.ref; bag = bag.includes(r) ? bag.filter(x => x !== r) : [...bag, r]; save(); drawBag(); if (bag.includes(r)) openBag(true); }
  else if (rm) { bag = bag.filter(x => x !== rm.dataset.rm); save(); drawBag(); }
  else if (t.closest("#open-bag, .bagbar")) openBag(true);
  else if (t.closest("#close-bag, #veil")) openBag(false);
});
/* ---------- Order on WhatsApp: the slide button in the bag ---------- */
const orderOnWhatsApp = () => {
  const nm = $("#nm"), ad = $("#ad");
  if (!nm.value.trim()) { nm.focus(); throw new Error("Add your name"); }
  if (!ad.value.trim()) { ad.focus(); throw new Error("Add your address"); }
  const msg = ["Hi Kopp, I would like to order:", ...items().map(p => `- ${p.name}, size ${p.size} (Ref ${p.ref}): ${money(p.price)}`), `Total: ${money(total())}`, `Name: ${nm.value}`, `Address: ${ad.value}`].join("\n");
  window.open(`https://wa.me/${K.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
};
let slider = null;
(() => {   // loads the slider styles and script on every page, so no HTML page needs editing
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "slide-commit.css";
  document.head.appendChild(css);
  const js = document.createElement("script");
  js.src = "slide-commit.js";
  js.onload = () => {
    slider = SlideCommit.mount($("#slide"), {
      label: "Slide to order on WhatsApp", doneLabel: "Opening WhatsApp", errorLabel: "Add your name and address",
      onConfirm: orderOnWhatsApp,
      trackColor: "#15183A", handleColor: "#F4EFE6", successColor: "#15183A", dangerColor: "#C8553D",
      height: 56, radius: 28, speed: 50, returnBounce: 0.38, landingDip: 0.026, holdMs: 1500
    });
    slider.setDisabled(!items().length);
  };
  document.body.appendChild(js);
})();

/* ---------- Motion: tweak speed and easing in styles.css (:root). Add data-reveal to any element to fade it in. ---------- */
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: .1 });
const reveal = () => $$("[data-reveal]:not(.in)").forEach(el => io.observe(el));
/* "/" and "/index.html" are the same page, so links to the current page scroll instead of reloading it */
const plain = p => p.replace(/index\.html$/, "") || "/";
document.addEventListener("click", e => {   // soft fade between pages
  const a = e.target.closest("a[href]");
  if (!a || a.target || a.origin !== location.origin || e.metaKey || e.ctrlKey) return;
  if (plain(a.pathname) === plain(location.pathname)) {   // same page: scroll, don't reload
    e.preventDefault();
    const target = a.hash && document.querySelector(a.hash);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    else if (!a.hash) scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", a.hash || location.pathname);
    return;
  }
  e.preventDefault(); document.body.classList.add("leaving"); setTimeout(() => location.href = a.href, 250);
});
addEventListener("pageshow", () => document.body.classList.remove("leaving"));

/* ---------- Shop grid, filters and search (home page only) ---------- */
if ($("#grid")) {
  const P = K.products, S = { sort: "new", size: "", grade: "", avail: "", q: "" };
  const shoe = c => `<svg viewBox="0 0 200 100" role="img" aria-label="Photo coming soon"><path d="M14 72C14 54 18 42 28 40L52 34C60 41 70 43 80 39L96 31C112 30 128 38 146 47C166 53 188 57 190 69V74H14Z" fill="${c}"/><path d="M10 74H192V82Q192 90 184 90H18Q10 90 10 82Z" fill="#E7DFCF"/><path d="M62 46l8 8M76 42l8 8M90 38l8 8" stroke="#F4EFE6" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const askLink = p => `https://wa.me/${K.whatsapp}?text=${encodeURIComponent(`Send the original pictures of:\n${p.name}, size ${p.size}, Ref ${p.ref}`)}`;
  const card = (p, i) => `<article class="card${p.sold ? " sold" : ""}" data-reveal style="--i:${i % 4}">
<div class="meta"><span>Grade ${p.grade}</span><h3>${p.name}<small>Size ${p.size}, ${p.cat}</small></h3><span>${money(p.price)}</span></div>
<div class="pic">${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy">` : shoe(p.color)}</div>
${p.sold ? '<button class="add" disabled>Sold.</button>' : `<button class="add" data-ref="${p.ref}">Add to bag</button>`}
<a class="ask" href="${askLink(p)}" target="_blank" rel="noopener">Ask for original pictures</a></article>`;
const uniq = k => [...new Set(P.map(p => p[k]))].sort();
  const group = (title, key, opts) => `<h4>${title}</h4>${opts.map(([v, l]) => `<button data-k="${key}" data-v="${v}">${l}</button>`).join("")}`;
  $("#flt").innerHTML = `<button class="ftog" aria-expanded="false">Filter &amp; search</button><div class="fbody"><input id="q" type="search" placeholder="Search" aria-label="Search pairs">`
    + group("Sort", "sort", [["new", "Newest"], ["lo", "Price (Low to High)"], ["hi", "Price (High to Low)"]])
    + group("Size", "size", [["", "All sizes"], ...uniq("size").map(v => [v, v])])
    + group("Grade", "grade", [["", "All grades"], ...uniq("grade").map(v => [v, v])])
    + group("Availability", "avail", [["", "All pairs"], ["1", "Available now"]]) + "</div>";
  const draw = () => {
    const L = P.filter(p => (!S.size || p.size == S.size) && (!S.grade || p.grade === S.grade) && (!S.avail || !p.sold) && (p.name + p.cat).toLowerCase().includes(S.q));
    if (S.sort !== "new") L.sort((a, b) => S.sort === "lo" ? a.price - b.price : b.price - a.price);
    $("#grid").innerHTML = L.map(card).join("") || '<p class="none">No pairs match yet. Clear a filter to see everything.</p>';
    $$("[data-k]").forEach(b => b.setAttribute("aria-pressed", String(S[b.dataset.k] == b.dataset.v)));
    reveal(); drawBag();
  };
  $("#flt").onclick = e => {
    const t = e.target.closest(".ftog");
    if (t) { t.setAttribute("aria-expanded", String($("#flt").classList.toggle("open"))); return; }
    const b = e.target.closest("[data-k]"); if (b) { S[b.dataset.k] = b.dataset.v; draw(); }
  };
  $("#q").oninput = e => { S.q = e.target.value.toLowerCase(); draw(); };
  $("#srch").onclick = e => { e.preventDefault(); $("#flt").classList.add("open"); $("#q").focus(); $("#q").scrollIntoView({ block: "center" }); };
  draw(); if (location.search.includes("q")) { $("#flt").classList.add("open"); $("#q").focus(); }
}
drawBag(); reveal();
