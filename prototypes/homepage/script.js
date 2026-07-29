/* ============================================================
   DevStash — Homepage prototype interactions
   ============================================================ */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- 1. Current year in footer ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 2. Navbar opacity on scroll ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 3. Scroll reveal (fade in on view) ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 4. Pricing billing toggle ---------- */
  const billingSwitch = document.getElementById("billingSwitch");
  const proPrice = document.getElementById("proPrice");
  const proPer = document.getElementById("proPer");
  const proTagline = document.getElementById("proTagline");
  const opts = document.querySelectorAll(".billing-toggle__opt");

  const setBilling = (yearly) => {
    if (billingSwitch) billingSwitch.setAttribute("aria-checked", String(yearly));
    opts.forEach((opt) =>
      opt.classList.toggle(
        "is-active",
        opt.dataset.period === (yearly ? "yearly" : "monthly")
      )
    );
    if (proPrice) {
      proPrice.textContent = yearly
        ? proPrice.dataset.yearly
        : proPrice.dataset.monthly;
    }
    if (proPer) proPer.textContent = yearly ? "/mo, billed yearly" : "/month";
    if (proTagline) {
      proTagline.textContent = yearly
        ? "$72 billed annually. Save 25%."
        : "Billed monthly. Cancel anytime.";
    }
  };

  if (billingSwitch) {
    billingSwitch.addEventListener("click", () => {
      const yearly = billingSwitch.getAttribute("aria-checked") !== "true";
      setBilling(yearly);
    });
    opts.forEach((opt) => {
      opt.addEventListener("click", () =>
        setBilling(opt.dataset.period === "yearly")
      );
    });
  }

  /* ---------- 5. Chaos icons animation ---------- */
  const chaos = document.getElementById("chaos");
  if (chaos) buildChaos(chaos);

  function buildChaos(container) {
    // Each source of scattered developer knowledge.
    const sources = [
      { label: "Notion", svg: iconNotion() },
      { label: "GitHub", svg: iconGitHub() },
      { label: "Slack", svg: iconSlack() },
      { label: "VS Code", svg: iconCode() },
      { label: "Tabs", svg: iconTabs() },
      { label: "Terminal", svg: iconTerminal() },
      { label: "text.txt", svg: iconFile() },
      { label: "Bookmark", svg: iconBookmark() },
    ];

    const ICON = 52;
    const nodes = sources.map((src) => {
      const el = document.createElement("div");
      el.className = "chaos__icon";
      el.innerHTML = `${src.svg}<span>${src.label}</span>`;
      el.style.width = ICON + "px";
      el.style.height = "auto";
      el.style.minHeight = ICON + "px";
      container.appendChild(el);
      return {
        el,
        x: 0,
        y: 0,
        vx: (Math.random() * 2 - 1) * 0.5,
        vy: (Math.random() * 2 - 1) * 0.5,
        angle: Math.random() * 360,
        va: (Math.random() * 2 - 1) * 0.4,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // Track container geometry (width/height can change on resize).
    let bounds = container.getBoundingClientRect();
    const measure = () => {
      bounds = container.getBoundingClientRect();
    };
    window.addEventListener("resize", measure, { passive: true });

    // Seed positions spread across the box.
    const seed = () => {
      const cols = 4;
      nodes.forEach((n, i) => {
        const cw = bounds.width || 300;
        const ch = bounds.height || 320;
        const cellW = (cw - ICON) / (cols - 1 || 1);
        const cellH = (ch - ICON) / 1;
        n.x = Math.max(0, Math.min(cw - ICON, (i % cols) * cellW));
        n.y = Math.max(0, Math.min(ch - ICON, Math.floor(i / cols) * cellH));
      });
    };
    measure();
    seed();

    // Mouse repel — track pointer in container-local coords.
    const mouse = { x: -999, y: -999, active: false };
    container.addEventListener("pointermove", (e) => {
      mouse.x = e.clientX - bounds.left;
      mouse.y = e.clientY - bounds.top;
      mouse.active = true;
    });
    container.addEventListener("pointerleave", () => {
      mouse.active = false;
    });

    if (prefersReducedMotion) {
      // Static placement, no rAF loop.
      nodes.forEach((n) => {
        n.el.style.transform = `translate(${n.x}px, ${n.y}px)`;
      });
      return;
    }

    const REPEL_RADIUS = 90;
    const MAX_SPEED = 1.6;

    const tick = () => {
      const w = bounds.width || 300;
      const h = bounds.height || 320;
      const t = performance.now() / 1000;

      nodes.forEach((n) => {
        // Mouse repel force
        if (mouse.active) {
          const cx = n.x + ICON / 2;
          const cy = n.y + ICON / 2;
          const dx = cx - mouse.x;
          const dy = cy - mouse.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < REPEL_RADIUS) {
            const force = (1 - dist / REPEL_RADIUS) * 0.9;
            n.vx += (dx / dist) * force;
            n.vy += (dy / dist) * force;
          }
        }

        // Gentle drift so they never fully settle
        n.vx += (Math.random() - 0.5) * 0.04;
        n.vy += (Math.random() - 0.5) * 0.04;

        // Clamp speed
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > MAX_SPEED) {
          n.vx = (n.vx / speed) * MAX_SPEED;
          n.vy = (n.vy / speed) * MAX_SPEED;
        }

        n.x += n.vx;
        n.y += n.vy;

        // Bounce off walls
        if (n.x <= 0) {
          n.x = 0;
          n.vx = Math.abs(n.vx);
        } else if (n.x >= w - ICON) {
          n.x = w - ICON;
          n.vx = -Math.abs(n.vx);
        }
        if (n.y <= 0) {
          n.y = 0;
          n.vy = Math.abs(n.vy);
        } else if (n.y >= h - ICON) {
          n.y = h - ICON;
          n.vy = -Math.abs(n.vy);
        }

        // Friction
        n.vx *= 0.99;
        n.vy *= 0.99;

        // Rotation + scale pulse
        n.angle += n.va;
        const scale = 1 + Math.sin(t * 1.5 + n.phase) * 0.06;
        const rot = Math.sin(t * 0.8 + n.phase) * 8 + n.angle * 0.05;

        n.el.style.transform = `translate(${n.x}px, ${n.y}px) rotate(${rot}deg) scale(${scale})`;
      });

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Inline SVG icon builders ---------- */
  function wrap(inner) {
    return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }
  function iconNotion() {
    return wrap('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8v8M9 8l6 8M15 8v8"/>');
  }
  function iconGitHub() {
    return wrap('<path d="M9 19c-4 1.5-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 2.3-.3 4.5-1.1 4.5-5a3.9 3.9 0 0 0-1-2.7 3.6 3.6 0 0 0-.1-2.7s-.9-.3-3 1a10.4 10.4 0 0 0-5 0c-2.1-1.3-3-1-3-1a3.6 3.6 0 0 0-.1 2.7A3.9 3.9 0 0 0 4 10c0 3.9 2.2 4.7 4.5 5-.6.6-.6 1.2-.5 2V21"/>');
  }
  function iconSlack() {
    return wrap('<rect x="10" y="3" width="4" height="10" rx="2"/><rect x="3" y="10" width="10" height="4" rx="2"/><rect x="11" y="11" width="4" height="10" rx="2"/><rect x="11" y="10" width="10" height="4" rx="2"/>');
  }
  function iconCode() {
    return wrap('<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>');
  }
  function iconTabs() {
    return wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v4"/>');
  }
  function iconTerminal() {
    return wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>');
  }
  function iconFile() {
    return wrap('<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8M8 17h5"/>');
  }
  function iconBookmark() {
    return wrap('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>');
  }
})();
