const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const PREVIEW = 200; // px for the preview canvas

// ── Icon drawing functions ──────────────────────────────────────────
const icons = [
  {
    name: "M-Data (Recommended)",
    desc: "Bold 'M' letterform on deep navy with indigo-to-purple gradient accent bars. Clean and professional — works at all sizes.",
    draw(ctx, s) {
      const r = s * 0.12;
      // BG gradient
      const bg = ctx.createLinearGradient(0, 0, s, s);
      bg.addColorStop(0, "#0d1017");
      bg.addColorStop(1, "#131824");
      roundRect(ctx, 0, 0, s, s, r, bg);
      // Accent bar at bottom
      const bar = ctx.createLinearGradient(0, 0, s, 0);
      bar.addColorStop(0, "#5b68ff");
      bar.addColorStop(1, "#a855f7");
      roundRect(ctx, s * 0.1, s * 0.82, s * 0.8, s * 0.06, s * 0.03, bar);
      // "M" letter
      ctx.fillStyle = "#e4e6f0";
      ctx.font = `800 ${s * 0.52}px "Inter", "Helvetica Neue", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", s / 2, s * 0.44);
      // Small "·blytic" text
      ctx.fillStyle = "#5b68ff";
      ctx.font = `700 ${s * 0.1}px "Inter", sans-serif`;
      ctx.fillText("blytic", s / 2, s * 0.73);
    },
  },

  {
    name: "Gradient Shield",
    desc: "Shield shape with the 'M' monogram inside a vivid indigo-purple gradient. Signals trust, analytics, and authority.",
    draw(ctx, s) {
      const bg = ctx.createLinearGradient(0, 0, s, s);
      bg.addColorStop(0, "#0d1017");
      bg.addColorStop(1, "#131824");
      roundRect(ctx, 0, 0, s, s, s * 0.12, bg);
      // Shield path
      const cx = s / 2,
        top = s * 0.1,
        bot = s * 0.88,
        wh = s * 0.38;
      const grad = ctx.createLinearGradient(cx - wh, top, cx + wh, bot);
      grad.addColorStop(0, "#5b68ff");
      grad.addColorStop(1, "#a855f7");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx + wh, top + s * 0.18);
      ctx.lineTo(cx + wh, top + s * 0.42);
      ctx.quadraticCurveTo(cx + wh, bot, cx, bot);
      ctx.quadraticCurveTo(cx - wh, bot, cx - wh, top + s * 0.42);
      ctx.lineTo(cx - wh, top + s * 0.18);
      ctx.closePath();
      ctx.fill();
      // "M" on shield
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${s * 0.38}px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", cx, s * 0.5);
    },
  },

  {
    name: "Neural Nodes",
    desc: "Letter 'M' built from connected neural network nodes on a dark background — perfect for an AI/ML analytics product.",
    draw(ctx, s) {
      const bg = ctx.createLinearGradient(0, 0, s, s);
      bg.addColorStop(0, "#0a0c12");
      bg.addColorStop(1, "#131824");
      roundRect(ctx, 0, 0, s, s, s * 0.12, bg);

      const nodes = [
        [0.22, 0.72],
        [0.22, 0.28],
        [0.5, 0.18],
        [0.78, 0.28],
        [0.78, 0.72],
        [0.5, 0.5],
      ].map(([x, y]) => [x * s, y * s]);

      // Connections
      const pairs = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [1, 5],
        [3, 5],
      ];
      const lineGrad = ctx.createLinearGradient(0, 0, s, s);
      lineGrad.addColorStop(0, "rgba(91,104,255,.5)");
      lineGrad.addColorStop(1, "rgba(168,85,247,.5)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = s * 0.018;
      pairs.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(...nodes[a]);
        ctx.lineTo(...nodes[b]);
        ctx.stroke();
      });

      // Node dots
      nodes.forEach(([x, y], i) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.055);
        g.addColorStop(0, i === 5 ? "#a855f7" : "#5b68ff");
        g.addColorStop(1, "rgba(91,104,255,.0)");
        ctx.beginPath();
        ctx.arc(x, y, s * 0.055, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });
    },
  },

  {
    name: "Pulse Chart",
    desc: "Bar chart columns with an EKG heartbeat line cutting through them — combines analytics and real-time data themes.",
    draw(ctx, s) {
      const bg = ctx.createLinearGradient(0, 0, s, s);
      bg.addColorStop(0, "#0d1017");
      bg.addColorStop(1, "#131824");
      roundRect(ctx, 0, 0, s, s, s * 0.12, bg);

      // Bars
      const bars = [0.4, 0.65, 0.5, 0.8, 0.55, 0.9, 0.7];
      const bw = s * 0.09,
        gap = s * 0.02;
      const totalW = bars.length * (bw + gap);
      const startX = (s - totalW) / 2;
      bars.forEach((h, i) => {
        const x = startX + i * (bw + gap);
        const bh = h * s * 0.5;
        const y = s * 0.78 - bh;
        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0, i === 5 ? "#a855f7" : "#5b68ff");
        grad.addColorStop(1, "rgba(91,104,255,.2)");
        roundRect(ctx, x, y, bw, bh, s * 0.015, grad);
      });

      // EKG pulse line
      const mid = s * 0.48;
      const pts = [
        0,
        mid,
        s * 0.12,
        mid,
        s * 0.2,
        mid - s * 0.08,
        s * 0.28,
        mid + s * 0.15,
        s * 0.36,
        mid - s * 0.22,
        s * 0.44,
        mid + s * 0.08,
        s * 0.52,
        mid,
        s,
        mid,
      ];
      const lineGrad = ctx.createLinearGradient(0, 0, s, 0);
      lineGrad.addColorStop(0, "rgba(34,197,94,0)");
      lineGrad.addColorStop(0.1, "#22c55e");
      lineGrad.addColorStop(0.9, "#22c55e");
      lineGrad.addColorStop(1, "rgba(34,197,94,0)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = s * 0.022;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        i === 0
          ? ctx.moveTo(pts[i], pts[i + 1])
          : ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.stroke();
    },
  },
];

// ── Utility: rounded rect fill ──────────────────────────────────────
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

// ── Render icons ────────────────────────────────────────────────────
function renderIcon(drawFn, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawFn(ctx, size);
  return canvas;
}

function downloadIcon(drawFn, size) {
  const canvas = renderIcon(drawFn, size);
  const link = document.createElement("a");
  link.download = `icon-${size}px.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Build grid ──────────────────────────────────────────────────────
const grid = document.getElementById("icon-grid");

icons.forEach((icon, idx) => {
  const card = document.createElement("div");
  card.className = "icon-card";

  const canvas = renderIcon(icon.draw, PREVIEW);
  canvas.title = "Click to select";
  canvas.addEventListener("click", () => {
    document
      .querySelectorAll(".icon-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });

  const btn = document.createElement("button");
  btn.className = "btn-dl";
  btn.textContent = "Download All Sizes";
  btn.addEventListener("click", () => {
    SIZES.forEach((size, i) => {
      setTimeout(() => downloadIcon(icon.draw, size), i * 200); // stagger downloads
    });
  });

  card.innerHTML = `<div class="icon-name">${idx + 1}. ${icon.name}</div><div class="icon-desc">${icon.desc}</div>`;
  card.insertBefore(canvas, card.firstChild);
  card.appendChild(btn);
  grid.appendChild(card);
});
