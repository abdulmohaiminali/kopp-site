/* Slide to order: plain-JavaScript port of the SlideCommit component.
   No React or motion library needed. Used by the bag to send the WhatsApp order. */
(function () {
  const PAD = 4, SQUASH_MAX = 0.08, SQUASH_DIV = 110, SWELL = 1.03, MIN_PENDING = 300;
  const SHAKE_FRAMES = [0, -5, 5, -3, 3, -1, 0];
  const ARROW_D = "M5 12h14M13 6l6 6-6 6";
  const TICK_D = "M5 12.5l4.5 4.5L19 7.5";

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (size, sw, d) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const SPINNER = size => `<svg class="slide-commit__spinner" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-opacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const onColor = hex => {
    const raw = String(hex).replace("#", "");
    const full = raw.length === 3 ? [...raw].map(c => c + c).join("") : raw.slice(0, 6);
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return "#ffffff";
    const yiq = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return yiq >= 128 ? "#111111" : "#ffffff";
  };
  const velocityOf = hist => {
    if (hist.length < 2) return 0;
    const [t0, x0] = hist[0], [t1, x1] = hist[hist.length - 1];
    return ((x1 - x0) / Math.max(1, t1 - t0)) * 1000;
  };
  const finePointer = () => !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /* A single animated number: spring, tween or keyframes */
  class Value {
    constructor(initial, onChange) { this.v = initial; this.vel = 0; this.raf = 0; this.onChange = onChange; }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    set(v) { this.stop(); this.v = v; this.vel = 0; this.onChange(v); }
    spring(to, o, done) {
      this.stop();
      this.vel = o.vel || 0;
      let last = performance.now();
      const step = now => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
        for (let i = 0; i < n; i++) {
          this.vel += ((-o.k * (this.v - to) - o.c * this.vel) / o.m) * h;
          this.v += this.vel * h;
        }
        if (Math.abs(this.v - to) < 0.01 && Math.abs(this.vel) < 0.01) {
          this.v = to; this.vel = 0; this.raf = 0; this.onChange(to);
          if (done) done();
          return;
        }
        this.onChange(this.v);
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
    tween(to, duration, delay = 0) {
      this.stop();
      const from = this.v;
      let start = null;
      const step = now => {
        if (start === null) start = now + delay * 1000;
        if (now < start) { this.raf = requestAnimationFrame(step); return; }
        const t = clamp((now - start) / (duration * 1000), 0, 1);
        this.v = from + (to - from) * (1 - Math.pow(1 - t, 3));
        this.onChange(this.v);
        this.raf = t < 1 ? requestAnimationFrame(step) : 0;
      };
      this.raf = requestAnimationFrame(step);
    }
    frames(values, times, duration, delay = 0) {
      this.stop();
      const n = values.length, at = times || values.map((_, i) => i / (n - 1));
      let start = null;
      const step = now => {
        if (start === null) start = now + delay * 1000;
        if (now < start) { this.raf = requestAnimationFrame(step); return; }
        const t = clamp((now - start) / (duration * 1000), 0, 1);
        let i = 0;
        while (i < n - 2 && t > at[i + 1]) i++;
        const span = at[i + 1] - at[i] || 1;
        this.v = values[i] + (values[i + 1] - values[i]) * clamp((t - at[i]) / span, 0, 1);
        this.onChange(this.v);
        this.raf = t < 1 ? requestAnimationFrame(step) : 0;
      };
      this.raf = requestAnimationFrame(step);
    }
  }

  function mount(host, cfg) {
    const o = Object.assign({
      label: "Slide to confirm", doneLabel: "Done", errorLabel: "Try again",
      onConfirm: null, onDone: null, onError: null,
      trackColor: "#262626", handleColor: "#f5f5f5", successColor: "#22c55e", dangerColor: "#e5484d",
      height: 56, radius: 28, speed: 50, returnBounce: 0.38, landingDip: 0.026, holdMs: 1500, disabled: false
    }, cfg);
    const reduce = reduceMotion();
    const H = o.height;
    const r = clamp(o.radius, 0, H / 2), gripR = Math.max(0, r - PAD);
    const GRIP = H - PAD * 2;
    const k = 260 + (clamp(o.speed, 0, 100) / 100) * 640, mass = 0.9, critical = 2 * Math.sqrt(k * mass);
    const commitSpring = { k, c: critical, m: mass };
    const homeSpring = { k, c: critical * (1 - clamp(o.returnBounce, 0, 0.5)), m: mass };
    const settleSpring = { k: 440, c: 2 * Math.sqrt(440), m: 1 };
    const fontSize = clamp(Math.round(H * 0.25), 13, 17);
    const iconSize = Math.round(GRIP * 0.42);

    /* Build the DOM */
    const root = document.createElement("div");
    root.className = "slide-commit";
    root.style.width = "100%";
    root.style.height = `${H}px`;
    root.style.setProperty("--sc-track", o.trackColor);
    root.style.setProperty("--sc-ink", o.handleColor);
    root.style.setProperty("--sc-ok", o.successColor);
    root.style.setProperty("--sc-no", o.dangerColor);
    root.style.setProperty("--sc-on-ink", onColor(o.handleColor));
    root.style.setProperty("--sc-on-ok", onColor(o.successColor));
    root.style.setProperty("--sc-on-no", onColor(o.dangerColor));
    root.style.setProperty("--sc-radius", `${r}px`);
    root.style.setProperty("--sc-grip-r", `${gripR}px`);
    root.style.setProperty("--sc-pad", `${PAD}px`);
    root.style.setProperty("--sc-font", `${fontSize}px`);
    root.innerHTML = `
      <div class="slide-commit__track">
        <span class="slide-commit__label" aria-hidden="true">
          <span class="slide-commit__text slide-commit__text--plain">${esc(o.label)}</span>
          <span class="slide-commit__text slide-commit__text--error"></span>
        </span>
        <div class="slide-commit__capsule" role="slider" tabindex="0" aria-label="${esc(o.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="slide-commit__content">
            <span class="slide-commit__arrow" aria-hidden="true">${icon(iconSize, 2, ARROW_D)}</span>
            <span class="slide-commit__spin" aria-hidden="true">${SPINNER(iconSize)}</span>
            <span class="slide-commit__done" aria-hidden="true">${icon(Math.round(GRIP * 0.38), 2.5, TICK_D)}${esc(o.doneLabel)}</span>
          </div>
        </div>
        <span class="slide-commit__sr" aria-live="polite"></span>
      </div>`;
    host.appendChild(root);

    const track = root.querySelector(".slide-commit__track");
    const capsule = root.querySelector(".slide-commit__capsule");
    const content = root.querySelector(".slide-commit__content");
    const arrowEl = root.querySelector(".slide-commit__arrow");
    const spinEl = root.querySelector(".slide-commit__spin");
    const doneEl = root.querySelector(".slide-commit__done");
    const sayEl = root.querySelector(".slide-commit__label");
    const errText = root.querySelector(".slide-commit__text--error");
    const srEl = root.querySelector(".slide-commit__sr");

    /* Geometry follows the real width, so the slider fits any bag size */
    let W = 280, INNER = 272, TRAVEL = 1;
    const layout = () => {
      W = root.clientWidth || 280;
      INNER = W - PAD * 2;
      TRAVEL = Math.max(1, INNER - GRIP);
    };

    /* State and animated values */
    let phase = "idle", held = false, hot = false, disabled = !!o.disabled;
    let grip = null, timer = 0, homeTimer = 0, run = 0, unwatch = null, lastPercent = -1;
    const X = new Value(0, () => render());
    const A = new Value(0, () => render());
    const SHOWN = new Value(1, () => render());
    const SPIN = new Value(0, () => render());
    const SHAKE = new Value(0, () => renderTrack());
    const PULSE = new Value(1, () => renderTrack());

    function render() {
      const v = clamp(X.v, 0, TRAVEL);
      const edge = v + GRIP + clamp(A.v - v, 0, TRAVEL);
      capsule.style.clipPath = `inset(0 ${INNER - edge}px 0 0 round ${gripR}px)`;
      content.style.transform = `translateX(${(v + edge) / 2 - INNER / 2}px)`;
      const swell = hot && !held && phase === "idle" && !reduce ? SWELL : 1;
      const q = 1 - Math.min(SQUASH_MAX, Math.max(0, -X.v) / SQUASH_DIV);
      capsule.style.transform = `scale(${q * swell}, ${swell / q})`;
      capsule.style.transformOrigin = `${v}px 50%`;
      sayEl.style.opacity = clamp(1 - v / (TRAVEL * 0.55), 0, 1);
      arrowEl.style.opacity = SHOWN.v * clamp(1 - (v - TRAVEL * 0.55) / (TRAVEL * 0.4), 0, 1);
      spinEl.style.opacity = SPIN.v;
      const percent = Math.round((v / TRAVEL) * 100);
      if (percent !== lastPercent) {
        lastPercent = percent;
        capsule.setAttribute("aria-valuenow", String(percent));
        capsule.setAttribute("aria-valuetext", `${o.label}, ${percent}%`);
      }
    }
    function renderTrack() {
      track.style.transform = `translateX(${SHAKE.v}px) scale(${PULSE.v})`;
    }
    function renderPhase() {
      root.dataset.phase = phase;
      if (held) root.dataset.held = ""; else delete root.dataset.held;
      if (disabled) root.dataset.disabled = ""; else delete root.dataset.disabled;
      const isDone = phase === "done";
      doneEl.style.opacity = isDone ? 1 : 0;
      doneEl.style.transform = isDone || reduce ? "scale(1)" : "scale(0.95)";
      capsule.tabIndex = disabled ? -1 : 0;
      if (disabled) capsule.setAttribute("aria-disabled", "true"); else capsule.removeAttribute("aria-disabled");
      if (phase === "pending") capsule.setAttribute("aria-busy", "true"); else capsule.removeAttribute("aria-busy");
      srEl.textContent = phase === "pending" ? "Working" : phase === "done" ? o.doneLabel : phase === "error" ? errText.textContent : "";
      render();
    }
    const setPhase = p => { phase = p; renderPhase(); };

    function goHome(vel) {
      if (reduce) X.tween(0, 0.2);
      else X.spring(0, { ...homeSpring, vel: Math.min(0, vel) });
    }
    function settle() {
      setPhase("idle");
      SHOWN.tween(1, 0.2, 0.12);
      if (reduce) A.set(0); else A.spring(0, settleSpring);
    }
    function resolve(viaKey) {
      setPhase("done");
      A.set(X.v);
      SPIN.tween(0, 0.12);
      if (reduce) X.set(0);
      else {
        X.spring(0, commitSpring);
        if (!viaKey && o.landingDip > 0) PULSE.frames([1, 1 - o.landingDip, 1], [0, 0.62, 1], 0.46, 0.1);
      }
      if (o.onDone) o.onDone();
      if (o.holdMs > 0) timer = setTimeout(settle, o.holdMs);
    }
    function reject(reason) {
      errText.textContent = (reason && reason.message) || o.errorLabel;
      setPhase("error");
      if (o.onError) o.onError(reason);
      SPIN.tween(0, 0.12);
      SHOWN.tween(1, 0.2, 0.12);
      if (reduce) goHome(0);
      else {
        SHAKE.frames(SHAKE_FRAMES, null, 0.45);
        homeTimer = setTimeout(() => { if (!grip) goHome(0); }, 300);
      }
      timer = setTimeout(() => setPhase("idle"), Math.max(o.holdMs, 1500));
    }
    function commit(viaKey) {
      clearTimeout(timer);
      const id = ++run;
      X.set(TRAVEL);
      let out;
      try {
        out = o.onConfirm ? o.onConfirm() : undefined;
      } catch (reason) {
        reject(reason);
        return;
      }
      const pending = out && typeof out.then === "function" ? out : null;
      if (!pending) {
        SHOWN.tween(0, 0.12);
        resolve(viaKey);
        return;
      }
      setPhase("pending");
      SHOWN.tween(0, 0.2);
      SPIN.tween(1, 0.2);
      const t0 = performance.now();
      const later = fn => setTimeout(() => { if (id === run) fn(); }, Math.max(0, MIN_PENDING - (performance.now() - t0)));
      pending.then(() => later(() => resolve(viaKey)), reason => later(() => reject(reason)));
    }

    /* Pointer and keyboard */
    const local = clientX => {
      const rect = track.getBoundingClientRect();
      return rect.width ? (clientX - rect.left) / (rect.width / W) : 0;
    };
    function move(e) {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      const at = local(e.clientX);
      if (g.grab === null) { g.grab = at - X.v; return; }
      const next = clamp(at - g.grab, 0, TRAVEL);
      if (Math.abs(next - X.v) > 0.5) g.moved = true;
      g.hist.push([e.timeStamp, next]);
      if (g.hist.length > 4) g.hist.shift();
      X.set(next);
    }
    function up(e) {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      grip = null;
      if (unwatch) unwatch();
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
      held = false;
      renderPhase();
      if (X.v >= TRAVEL) commit(false);
      else if (g.moved) goHome(velocityOf(g.hist));
    }
    function down(e) {
      if (disabled || grip || phase === "pending" || phase === "done" || e.button !== 0) return;
      X.stop();
      grip = { id: e.pointerId, grab: null, moved: false, hist: [] };
      held = true;
      renderPhase();
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
      if (unwatch) unwatch();
      const onMove = ev => { if (ev.isTrusted) move(ev); };
      const onUp = ev => { if (ev.isTrusted) up(ev); };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      unwatch = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        unwatch = null;
      };
    }
    track.addEventListener("pointerdown", down);
    capsule.addEventListener("pointerenter", e => {
      if (e.pointerType === "mouse" && finePointer()) { hot = true; render(); }
    });
    capsule.addEventListener("pointerleave", () => { hot = false; render(); });
    capsule.addEventListener("keydown", e => {
      if (disabled || phase === "pending" || phase === "done") return;
      const step = TRAVEL / 10;
      if (e.key === "End") {
        e.preventDefault();
        commit(true);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.min(TRAVEL, X.v + step);
        X.set(next);
        if (next >= TRAVEL) commit(true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        X.set(Math.max(0, X.v - step));
      } else if (e.key === "Home" || e.key === "Escape") {
        e.preventDefault();
        if (grip) up({ pointerId: grip.id }); else X.set(0);
      }
    });

    /* Start */
    layout();
    new ResizeObserver(() => { layout(); render(); }).observe(root);
    renderTrack();
    renderPhase();

    return {
      el: root,
      setDisabled(v) { disabled = !!v; renderPhase(); }
    };
  }

  window.SlideCommit = { mount };
})();
