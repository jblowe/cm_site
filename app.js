// Single-page browser for a tree of derivative thumbnails.
// Thumbnails are bundled alongside the site under thumbs/.
const IMG_BASE = "thumbs/";

function imgUrl(src) {
  // encode each path segment but keep the slashes
  return IMG_BASE + src.split("/").map(encodeURIComponent).join("/");
}

async function initApp(dataUrl) {
  const data = await (await fetch(dataUrl)).json();
  const groups = data.groups;
  document.querySelector("#title").textContent = data.title;
  document.title = data.title;

  const total = groups.reduce((s, g) => s + g.count, 0);
  const totalEl = document.querySelector("#total");
  if (totalEl) totalEl.textContent = `${groups.length} folders · ${total} images`;

  const nav = document.querySelector("#nav-list");
  const filter = document.querySelector("#filter");
  const main = document.querySelector("#stage");

  // mobile: the nav is an off-canvas drawer toggled by the hamburger button
  const app = document.querySelector(".app");
  const closeNav = () => app.classList.remove("nav-open");
  const menuBtn = document.querySelector("#menu");
  const backdrop = document.querySelector("#backdrop");
  if (menuBtn) menuBtn.onclick = () => app.classList.toggle("nav-open");
  if (backdrop) backdrop.onclick = closeNav;

  // build nav, inserting a header whenever the parent folder (sub) changes
  function renderNav(q = "") {
    nav.innerHTML = "";
    const ql = q.toLowerCase();
    let curGrp = null, list = null;
    groups.forEach((g, i) => {
      if (ql && !(g.title.toLowerCase().includes(ql) ||
                  (g.sub || "").toLowerCase().includes(ql))) return;
      const grp = g.sub || "";
      // start a new collapsible band whenever the parent path changes
      if (list === null || grp !== curGrp) {
        curGrp = grp;
        const band = document.createElement("div");
        band.className = "nav-band";
        band.innerHTML = `<span class="chev">▾</span>` +
          `<span class="lbl">${escapeHtml(grp || "top level")}</span>`;
        const items = document.createElement("div");
        items.className = "nav-items";
        band.onclick = () => {
          band.classList.toggle("collapsed");
          items.classList.toggle("collapsed");
        };
        nav.appendChild(band);
        nav.appendChild(items);
        list = items;
      }
      const el = document.createElement("div");
      el.className = "nav-item"; el.dataset.idx = i;
      el.innerHTML =
        `<span>${escapeHtml(g.title)}</span><span class="n">${g.count}</span>`;
      el.onclick = () => {
        location.hash = "#" + encodeURIComponent(g.id);
        closeNav();                      // dismiss the drawer on mobile
      };
      list.appendChild(el);
    });
  }

  function show(idx) {
    const g = groups[idx];
    document.querySelectorAll(".nav-item").forEach(n =>
      n.classList.toggle("active", +n.dataset.idx === idx));
    const subtitle = [g.sub, `${g.count} images`].filter(Boolean).join(" — ");
    main.innerHTML =
      `<h2>${escapeHtml(g.title)}</h2><div class="stage-sub">${escapeHtml(subtitle)}</div>`;
    const m = document.createElement("div");
    m.className = "masonry";
    g.photos.forEach(p => {
      const fig = document.createElement("figure");
      fig.innerHTML =
        `<img loading="lazy" src="${imgUrl(p.src)}" alt="${escapeHtml(p.cap)}">` +
        `<figcaption>${escapeHtml(p.cap)}</figcaption>`;
      fig.querySelector("img").onclick = () => lightbox(p);
      m.appendChild(fig);
    });
    main.appendChild(m);
    main.scrollTop = 0;
  }

  function route() {
    const id = decodeURIComponent((location.hash || "").slice(1));
    const idx = id ? groups.findIndex(g => String(g.id) === id) : -1;
    if (idx >= 0) show(idx);
    else main.innerHTML =
      `<p class="placeholder">Select a folder on the left (${groups.length} available).</p>`;
  }

  filter.oninput = () => renderNav(filter.value);
  window.addEventListener("hashchange", route);
  renderNav();
  route();
}

function lightbox(p) {
  const lb = document.querySelector("#lb");
  lb.querySelector("img").src = imgUrl(p.src);
  lb.querySelector(".cap").textContent = p.cap;
  lb.classList.add("open");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

document.querySelector("#lb").onclick = () =>
  document.querySelector("#lb").classList.remove("open");
