const headline = document.querySelector(".headline");
if (headline) {
  const text = headline.textContent.replace(/\s+/g, " ").trim();
  headline.setAttribute("data-text", text);
}

const designLead = document.querySelector(".design-lead");
const authorFloat = document.getElementById("author-float");
if (designLead && authorFloat) {
  const img = authorFloat.querySelector("img");
  if (img && designLead.dataset.photo) {
    img.src = designLead.dataset.photo;
  }

  const updatePosition = (event) => {
    authorFloat.style.left = `${event.clientX}px`;
    authorFloat.style.top = `${event.clientY}px`;
  };

  designLead.addEventListener("pointerenter", (event) => {
    updatePosition(event);
    authorFloat.classList.add("is-visible");
  });

  designLead.addEventListener("pointermove", updatePosition);
  designLead.addEventListener("pointerleave", () => {
    authorFloat.classList.remove("is-visible");
  });
}

const canvas = document.getElementById("points");
const popupLayer = document.getElementById("popup-layer");

const projects = [
  {
    title: "Metaverse Concierge",
    description: "A cross-reality onboarding funnel aligning 3D, product, and brand surfaces.",
    media: "assets/portfolio/project1.jpg",
    type: "image",
  },
  {
    title: "AI Ops Cockpit",
    description: "Realtime observability with adaptive automation patterns for lean teams.",
    media: "assets/portfolio/project2.jpg",
    type: "image",
  },
  {
    title: "Fintech Origination",
    description: "Borrower journeys reimagined with trust micro-interactions and audit trails.",
    media: "assets/portfolio/project3.jpg",
    type: "image",
  },
  {
    title: "Mobility Cloud",
    description: "Fleet intelligence dashboard scaling from pilots to global deployments.",
    media: "assets/portfolio/project4.jpg",
    type: "image",
  },
  {
    title: "Healthcare OS",
    description: "Clinical workflows unified around signal-based care loops and metrics.",
    media: "assets/portfolio/project5.jpg",
    type: "image",
  },
  {
    title: "Immersive Retail",
    description: "Spatial storytelling bridging physical retail and digital loyalty.",
    media: "assets/portfolio/project6.jpg",
    type: "image",
  },
];

const state = {
  ctx: null,
  width: 0,
  height: 0,
  points: [],
  hoveredPoint: null,
  activePopup: null,
  popupTimer: null,
  pointer: { x: 0, y: 0, active: false },
};

const POINT_COUNT = 40;
const INTERACTIVE_INDICES = [1, 8, 15, 22, 29, 36];

function resizeCanvas() {
  if (!canvas) return;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * window.devicePixelRatio;
  canvas.height = state.height * window.devicePixelRatio;
  state.ctx = canvas.getContext("2d");
  state.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function createPoints() {
  state.points = [];
  const centerX = state.width / 2;
  const centerY = state.height / 2;
  const baseRadius = Math.min(state.width, state.height) * 0.32;

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const angle = (i / POINT_COUNT) * Math.PI * 2;
    const orbitRadius = baseRadius * (0.6 + Math.random() * 0.4);
    const variance = Math.random() * 40;
    const x = centerX + Math.cos(angle) * (orbitRadius + variance);
    const y = centerY + Math.sin(angle * 1.2) * (orbitRadius * 0.6 + variance);

    state.points.push({
      index: i,
      x,
      y,
      orbitRadius,
      angle,
      variance,
      noiseOffset: Math.random() * 1000,
      baseSize: INTERACTIVE_INDICES.includes(i) ? 6 : 3 + Math.random() * 2,
      interactive: INTERACTIVE_INDICES.includes(i),
      metadata: INTERACTIVE_INDICES.includes(i)
        ? projects[INTERACTIVE_INDICES.indexOf(i)]
        : null,
    });
  }
}

function drawPoints(time) {
  if (!state.ctx) return;
  state.ctx.clearRect(0, 0, state.width, state.height);

  const centerX = state.width / 2;
  const centerY = state.height / 2;
  const t = time * 0.00045;

  const gradient = state.ctx.createLinearGradient(0, 0, state.width, state.height);
  gradient.addColorStop(0, "rgba(234, 255, 1, 0.12)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");

  state.ctx.lineWidth = 1.1;
  state.ctx.strokeStyle = gradient;
  state.ctx.beginPath();

  state.points.forEach((point, index) => {
    const wobble = Math.sin(t * 4 + point.noiseOffset) * 18;
    const layer = 1 + Math.sin(t * 6 + point.noiseOffset * 0.5) * 0.08;
    const targetX =
      centerX +
      Math.cos(point.angle + t * 3 * 0.1) * (point.orbitRadius + wobble) +
      Math.sin(t * 2 + point.noiseOffset) * 28;
    const targetY =
      centerY +
      Math.sin(point.angle * 1.4 + t * 3 * 0.12) * (point.orbitRadius * 0.6 + wobble) +
      Math.cos(t * 1.6 + point.noiseOffset) * 24;

    point.x += (targetX - point.x) * 0.075 * layer;
    point.y += (targetY - point.y) * 0.075 * layer;

    if (index === 0) {
      state.ctx.moveTo(point.x, point.y);
    } else {
      state.ctx.lineTo(point.x, point.y);
    }
  });

  state.ctx.closePath();
  state.ctx.stroke();

  let hovered = null;

  state.points.forEach((point) => {
    const distance = Math.hypot(point.x - state.pointer.x, point.y - state.pointer.y);
    const isHover = state.pointer.active && point.interactive && distance < 26;
    if (isHover) hovered = point;

    const radius = point.baseSize + Math.sin(t * 16 + point.noiseOffset) * 0.6;
    const targetRadius = isHover ? radius * 2.2 : radius;
    const color = point.interactive ? "rgba(234, 255, 1, 0.9)" : "rgba(255,255,255,0.65)";

    state.ctx.beginPath();
    state.ctx.fillStyle = color;
    state.ctx.globalAlpha = point.interactive ? 0.92 : 0.65;
    state.ctx.shadowColor = point.interactive ? "rgba(234,255,1,0.4)" : "rgba(0,0,0,0.15)";
    state.ctx.shadowBlur = point.interactive ? 16 : 6;
    state.ctx.arc(point.x, point.y, targetRadius, 0, Math.PI * 2);
    state.ctx.fill();
    state.ctx.shadowBlur = 0;
    state.ctx.globalAlpha = 1;
  });

  state.hoveredPoint = hovered;
  canvas.style.cursor = hovered ? "pointer" : "default";

  requestAnimationFrame(drawPoints);
}

function openPopup(point) {
  if (!popupLayer) return;
  closePopup();

  const popup = document.createElement("article");
  popup.className = "popup";

  const { title, description, media, type } = point.metadata;
  popup.innerHTML = `
    <button type="button" aria-label="Close project preview">close</button>
    <figure class="media"></figure>
    <h2>${title}</h2>
    <p>${description}</p>
  `;

  const figure = popup.querySelector("figure");
  if (type === "video") {
    const video = document.createElement("video");
    video.src = media;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    figure.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = media;
    img.alt = `${title} preview`;
    figure.appendChild(img);
  }

  const safeX = Math.min(Math.max(point.x, 160), window.innerWidth - 160);
  const safeY = Math.min(Math.max(point.y, 160), window.innerHeight - 160);
  popup.style.left = `${safeX}px`;
  popup.style.top = `${safeY}px`;

  popupLayer.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add("is-visible"));

  popup.querySelector("button").addEventListener("click", closePopup);

  state.activePopup = popup;
  popupLayer.classList.add("has-popup");
  state.popupTimer = window.setTimeout(() => {
    if (state.activePopup === popup) closePopup();
  }, 7000);
}

function closePopup() {
  if (state.popupTimer) {
    clearTimeout(state.popupTimer);
    state.popupTimer = null;
  }
  if (state.activePopup) {
    const popup = state.activePopup;
    popup.classList.remove("is-visible");
    setTimeout(() => popup.remove(), 220);
    state.activePopup = null;
    popupLayer?.classList.remove("has-popup");
  }
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.active = true;
}

function handlePointerLeave() {
  state.pointer.active = false;
  state.hoveredPoint = null;
  canvas.style.cursor = "default";
}

function handleClick(event) {
  if (state.hoveredPoint && state.hoveredPoint.metadata) {
    event.preventDefault();
    openPopup(state.hoveredPoint);
  }
}

if (canvas) {
  resizeCanvas();
  createPoints();
  requestAnimationFrame(drawPoints);

  window.addEventListener("resize", () => {
    resizeCanvas();
    createPoints();
  });

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("click", handleClick);
}

if (popupLayer) {
  document.addEventListener("pointerdown", (event) => {
    if (!state.activePopup) return;
    if (state.activePopup.contains(event.target)) return;
    closePopup();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopup();
  }
});
