/* Profile card: plain-JavaScript version of the ProfileCard component.
   Keeps the tilt, glare, holo shine, intro sweep and mobile tilt. Cream theme. */
(function () {
  const CREAM = {
    '--pc-frame': 'rgba(244, 239, 230, 0.86)',
    '--pc-frame-edge': 'rgba(21, 24, 58, 0.14)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.9)',
    '--pc-frame-shadow': '0 22px 44px -22px rgba(21, 24, 58, 0.35), 0 6px 16px -10px rgba(21, 24, 58, 0.2)',
    '--pc-tile': 'linear-gradient(180deg, #FBF8F2 0%, #E9E2D3 100%)',
    '--pc-tile-edge': 'rgba(21, 24, 58, 0.1)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--pc-tile-shadow': '0 4px 10px -5px rgba(21, 24, 58, 0.3)',
    '--pc-ink': '#15183A',
    '--pc-muted': 'rgba(21, 24, 58, 0.6)',
    '--pc-hover': 'brightness(0.97)',
    '--pc-press': 'brightness(0.92)',
    '--pc-shade': 'rgba(21, 24, 58, 0.14)'
  };
  const LIGHT_FOIL = {
    '--pc-blend': 'multiply',
    '--pc-holo-filter': 'invert(1) hue-rotate(180deg)',
    '--pc-sheen': 'rgba(255, 255, 255, 0)'
  };
  const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
  )}")`;
  const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function mount(host, cfg) {
    const o = Object.assign({
      name: "", title: "", handle: "", status: "Online", contactText: "Contact", contactUrl: "",
      avatarUrl: "", iconUrl: "", holo: 0.8, glare: 0.5, tiltStrength: 12, parallax: 8, radius: 16,
      enableTilt: true, intro: true, enableMobileTilt: true, mobileTiltSensitivity: 5
    }, cfg);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = document.createElement("div");
    root.className = "profile-card" + (o.avatarUrl ? "" : " profile-card--plain");
    const linkAttrs = o.contactUrl ? ' target="_blank" rel="noopener"' : "";
    root.innerHTML = `
      <div class="profile-card__body">
        <div class="profile-card__tile">
          <span class="profile-card__sheen"></span>
          <span class="profile-card__holo"><span class="profile-card__holo-glow"></span><span class="profile-card__holo-shift"></span></span>
          ${o.avatarUrl ? `<img class="profile-card__photo" src="${esc(o.avatarUrl)}" alt="${esc(o.name)}" loading="lazy" draggable="false">` : ""}
          <span class="profile-card__scrim"></span>
          <div class="profile-card__info">
            ${o.name ? `<h3 class="profile-card__name">${esc(o.name)}</h3>` : ""}
            ${o.title ? `<p class="profile-card__title">${esc(o.title)}</p>` : ""}
          </div>
          <span class="profile-card__tile-rim"></span>
        </div>
        <div class="profile-card__footer">
          <div class="profile-card__meta">
            ${o.handle ? `<span class="profile-card__handle">@${esc(o.handle)}</span>` : ""}
            ${o.status ? `<span class="profile-card__status">${esc(o.status)}</span>` : ""}
          </div>
          ${o.contactText ? `<a class="profile-card__contact" href="${esc(o.contactUrl || "#")}"${linkAttrs} aria-label="${esc(o.contactText + " " + o.name)}">${ICON}${esc(o.contactText)}</a>` : ""}
        </div>
        <span class="profile-card__glare"></span>
        <span class="profile-card__shade"></span>
        <span class="profile-card__rim"></span>
      </div>`;

    const vars = Object.assign({}, CREAM, LIGHT_FOIL, {
      '--pc-radius': `${Math.max(0, o.radius)}px`,
      '--pc-backdrop': 'var(--pc-tile)',
      '--pc-holo': clamp(o.holo, 0, 1),
      '--pc-glare': clamp(o.glare, 0, 1),
      '--pc-parallax': `${Math.max(0, o.parallax)}px`,
      '--pc-status': o.statusColor || '#22c55e',
      '--pc-grain': GRAIN,
      '--pc-pattern': o.iconUrl ? `url("${o.iconUrl}")` : 'linear-gradient(#000, #000)',
      '--pc-pattern-size': o.iconUrl ? '180% auto' : '100% 100%',
      '--pc-holo-gain': o.iconUrl ? 1.25 : 0.75,
      '--pc-holo-detail': 0
    });
    for (const key in vars) root.style.setProperty(key, vars[key]);
    host.appendChild(root);

    /* ----- Motion engine (same maths as the React version) ----- */
    const size = { width: root.offsetWidth, height: root.offsetHeight };
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };
    const angle = o.enableTilt && !reduced ? o.tiltStrength : 0;
    const depth = reduced ? 0 : o.parallax;
    let raf = 0, last = 0, slowUntil = 0, touchId = null;

    const write = () => {
      const s = root.style;
      const tilt = Math.min(1, Math.hypot(x.p, y.p));
      s.setProperty('--pc-light-x', `${((x.p + 1) * 0.5 * size.width).toFixed(1)}px`);
      s.setProperty('--pc-light-y', `${((y.p + 1) * 0.5 * size.height).toFixed(1)}px`);
      s.setProperty('--pc-pointer-x', `${((x.p + 1) * 50).toFixed(2)}%`);
      s.setProperty('--pc-pointer-y', `${((y.p + 1) * 50).toFixed(2)}%`);
      s.setProperty('--pc-band-x', `${(50 + x.p * 15).toFixed(2)}%`);
      s.setProperty('--pc-band-y', `${(50 + y.p * 15).toFixed(2)}%`);
      s.setProperty('--pc-rotate-x', `${(y.p * angle).toFixed(3)}deg`);
      s.setProperty('--pc-rotate-y', `${(-x.p * angle).toFixed(3)}deg`);
      s.setProperty('--pc-shift-x', `${(x.p * depth).toFixed(2)}px`);
      s.setProperty('--pc-shift-y', `${(y.p * depth).toFixed(2)}px`);
      s.setProperty('--pc-reach', tilt.toFixed(4));
      s.setProperty('--pc-tilt', (tilt * light.p).toFixed(4));
      s.setProperty('--pc-active', light.p.toFixed(4));
    };

    const frame = now => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const slow = now < slowUntil;
      const stiffness = slow ? 24 : 120;
      const damping = slow ? 9 : 16;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }
      const tau = light.target > light.p ? 0.18 : slow ? 0.9 : 0.45;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
      write();
      const moving =
        Math.abs(x.target - x.p) > 0.0005 || Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 || Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002;
      if (moving) {
        raf = requestAnimationFrame(frame);
      } else {
        x.p = x.target; y.p = y.target; light.p = light.target;
        write();
      }
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const aim = (nx, ny, on = true) => {
      x.target = clamp(nx, -1, 1);
      y.target = clamp(ny, -1, 1);
      light.target = on ? 1 : 0;
      slowUntil = 0;
      wake();
    };

    const aimAt = event => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      aim(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const release = () => aim(0, 0, false);

    root.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') aimAt(e); });
    root.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.pointerId === touchId) aimAt(e); });
    root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') release(); });
    root.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      touchId = e.pointerId;
      aimAt(e);
    });
    const onUp = e => {
      if (e.pointerId !== touchId) return;
      touchId = null;
      release();
    };
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(() => {
      size.width = root.offsetWidth;
      size.height = root.offsetHeight;
      write();
    });
    ro.observe(root);

    if (o.enableMobileTilt) {
      let listening = false;
      const onOrientation = e => {
        if (e.beta == null || e.gamma == null) return;
        aim((e.gamma * o.mobileTiltSensitivity) / 150, ((e.beta - 20) * o.mobileTiltSensitivity) / 150);
      };
      const listen = () => {
        if (listening) return;
        listening = true;
        window.addEventListener('deviceorientation', onOrientation);
      };
      root.addEventListener('click', () => {
        const M = window.DeviceOrientationEvent;
        if (M && typeof M.requestPermission === 'function') {
          M.requestPermission().then(s => { if (s === 'granted') listen(); }).catch(() => {});
        } else {
          listen();
        }
      });
    }

    if (o.intro && !reduced) {
      x.p = 0.62; y.p = -0.55; light.p = 1;
      slowUntil = performance.now() + 1400;
      write();
      wake();
    } else {
      write();
    }
    return root;
  }

  window.ProfileCard = { mount };
})();
