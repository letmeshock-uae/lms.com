import * as THREE from "three";
import planeVertex from "./shaders/plane.vert?raw";
import planeFragment from "./shaders/plane.frag?raw";
import pointsVertex from "./shaders/points.vert?raw";
import pointsFragment from "./shaders/points.frag?raw";

const BACKGROUND_URL = "https://letmeshock.ru/wp-content/uploads/2025/11/background.jpg";
const INTERACTIVE_INDICES = [2, 7, 13, 18, 26, 33];
const POINT_TOTAL = 40;

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

const designLead = document.querySelector(".design-lead");
const authorFloat = document.getElementById("author-float");
const popupLayer = document.getElementById("popup-layer");
const sceneRoot = document.getElementById("scene-container");

const state = {
  scene: null,
  camera: null,
  renderer: null,
  planeMaterial: null,
  pointsMaterial: null,
  points: null,
  pointData: [],
  scaleArray: null,
  scaleTargets: null,
  colorArray: null,
  colorsDirty: false,
  hoveredIndex: -1,
  hoverPointWorld: null,
  pointerNDC: new THREE.Vector2(),
  pointerUv: new THREE.Vector2(0.5, 0.5),
  raycaster: new THREE.Raycaster(),
  clock: new THREE.Clock(),
  popupTimer: null,
  activePopup: null,
};

state.raycaster.params.Points = { threshold: 0.12 };

init();

async function init() {
  initDesignLeadHover();

  await initScene();
  createPoints();
  handleInteractions();
  animate();
}

function initDesignLeadHover() {
  if (!designLead || !authorFloat) return;

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

async function initScene() {
  if (!sceneRoot) {
    throw new Error("Scene container element not found.");
  }

  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.domElement.style.position = "absolute";
  state.renderer.domElement.style.inset = "0";
  sceneRoot.appendChild(state.renderer.domElement);

  state.scene = new THREE.Scene();

  state.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  state.camera.position.set(0, 0, 3.6);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");
  const backgroundTexture = await new Promise((resolve, reject) => {
    textureLoader.load(BACKGROUND_URL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
      texture.anisotropy = state.renderer.capabilities.getMaxAnisotropy();
      resolve(texture);
    }, undefined, reject);
  });

  const planeGeometry = new THREE.PlaneGeometry(4.6, 4.6, 180, 180);
  state.planeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: state.pointerUv.clone() },
      uTexture: { value: backgroundTexture },
    },
    vertexShader: planeVertex,
    fragmentShader: planeFragment,
    depthWrite: false,
  });

  const plane = new THREE.Mesh(planeGeometry, state.planeMaterial);
  plane.position.z = -1.6;
  state.scene.add(plane);

  window.addEventListener("resize", onResize);
}

function createPoints() {
  const pointCount = POINT_TOTAL;

  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const scales = new Float32Array(pointCount);
  const seeds = new Float32Array(pointCount);
  const phases = new Float32Array(pointCount);

  const accent = new THREE.Color("#EAFF01");
  const accentDim = accent.clone().multiplyScalar(0.68);
  const baseColor = new THREE.Color(0xffffff).multiplyScalar(0.75);

  state.pointData = [];
  state.scaleArray = scales;
  state.scaleTargets = new Float32Array(pointCount);
  state.colorArray = colors;

  const spread = 0.85;

  for (let i = 0; i < pointCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.4 + Math.random() * spread;
    const height = (Math.random() - 0.5) * 0.9;

    const x = Math.cos(angle) * radius * 0.7;
    const y = height * 0.6;
    const z = Math.sin(angle) * radius;

    const idx3 = i * 3;
    positions[idx3] = x;
    positions[idx3 + 1] = y;
    positions[idx3 + 2] = z;

    const interactiveIndex = INTERACTIVE_INDICES.indexOf(i);
    const isInteractive = interactiveIndex !== -1;

    const base = isInteractive ? accentDim : baseColor;
    colors[idx3] = base.r;
    colors[idx3 + 1] = base.g;
    colors[idx3 + 2] = base.b;

    const baseScale = isInteractive ? 44 : 28 + Math.random() * 8;
    scales[i] = baseScale;
    state.scaleTargets[i] = baseScale;
    seeds[i] = Math.random() * 10.0;
    phases[i] = Math.random() * Math.PI * 2;

    state.pointData.push({
      index: i,
      basePosition: new THREE.Vector3(x, y, z),
      interactive: isInteractive,
      highlightColor: accent.clone(),
      baseColor: base.clone(),
      baseScale,
      project: isInteractive ? projects[interactiveIndex] : null,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.computeBoundingSphere();

  state.pointsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  state.points = new THREE.Points(geometry, state.pointsMaterial);
  state.points.frustumCulled = false;
  state.points.renderOrder = 3;
  state.scene.add(state.points);
}

function handleInteractions() {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("click", onClick);

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
}

function onPointerMove(event) {
  const x = event.clientX;
  const y = event.clientY;

  state.pointerNDC.x = (x / window.innerWidth) * 2 - 1;
  state.pointerNDC.y = -(y / window.innerHeight) * 2 + 1;

  state.pointerUv.set(x / window.innerWidth, 1 - y / window.innerHeight);
  if (state.planeMaterial) {
    state.planeMaterial.uniforms.uPointer.value.copy(state.pointerUv);
  }

  if (!state.points || !state.camera) return;

  state.raycaster.setFromCamera(state.pointerNDC, state.camera);
  const intersects = state.raycaster.intersectObject(state.points);

  let hoveredIndex = -1;
  let worldPoint = null;
  if (intersects.length) {
    const hit = intersects.find((item) => state.pointData[item.index]?.interactive);
    if (hit && typeof hit.index === "number") {
      hoveredIndex = hit.index;
      worldPoint = hit.point.clone();
    }
  }

  updateHoverState(hoveredIndex, worldPoint);
}

function onPointerLeave() {
  state.pointerUv.set(0.5, 0.5);
  if (state.planeMaterial) {
    state.planeMaterial.uniforms.uPointer.value.copy(state.pointerUv);
  }
  updateHoverState(-1, null);
}

function updateHoverState(index, worldPoint) {
  if (index === state.hoveredIndex) {
    if (worldPoint) {
      state.hoverPointWorld = worldPoint;
    }
    return;
  }

  const previous = state.hoveredIndex;
  state.hoveredIndex = index;
  state.hoverPointWorld = worldPoint;

  if (previous !== -1) {
    resetPointVisual(previous);
  }

  if (index !== -1) {
    amplifyPointVisual(index);
  }

  if (sceneRoot) {
    sceneRoot.style.cursor = index !== -1 ? "pointer" : "";
  }
}

function amplifyPointVisual(index) {
  const data = state.pointData[index];
  if (!data) return;

  state.scaleTargets[index] = data.baseScale * 1.6;
  applyColor(index, data.highlightColor);
}

function resetPointVisual(index) {
  const data = state.pointData[index];
  if (!data) return;

  state.scaleTargets[index] = data.baseScale;
  applyColor(index, data.baseColor);
}

function applyColor(index, color) {
  const idx3 = index * 3;
  state.colorArray[idx3] = color.r;
  state.colorArray[idx3 + 1] = color.g;
  state.colorArray[idx3 + 2] = color.b;
  state.colorsDirty = true;
}

function onClick(event) {
  if (event.defaultPrevented) return;
  if (state.hoveredIndex === -1) return;

  const data = state.pointData[state.hoveredIndex];
  if (!data || !data.project) return;

  event.preventDefault();

  const worldPosition = state.hoverPointWorld
    ? state.hoverPointWorld.clone()
    : data.basePosition.clone();

  const screenPosition = projectToScreen(worldPosition);
  openPopup(data.project, screenPosition);
}

function projectToScreen(vector) {
  const projected = vector.clone().project(state.camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  return { x, y };
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = state.clock.getElapsedTime();

  if (state.planeMaterial) {
    state.planeMaterial.uniforms.uTime.value = elapsed;
  }

  if (state.pointsMaterial) {
    state.pointsMaterial.uniforms.uTime.value = elapsed;
  }

  updatePointAttributes();

  if (state.scene && state.camera && state.renderer) {
    state.renderer.render(state.scene, state.camera);
  }
}

function updatePointAttributes() {
  if (!state.points) return;

  let needsScaleUpdate = false;
  for (let i = 0; i < state.scaleArray.length; i += 1) {
    const current = state.scaleArray[i];
    const target = state.scaleTargets[i];
    const next = THREE.MathUtils.lerp(current, target, 0.1);
    if (Math.abs(next - current) > 0.01) {
      state.scaleArray[i] = next;
      needsScaleUpdate = true;
    }
  }

  if (needsScaleUpdate) {
    state.points.geometry.attributes.aScale.needsUpdate = true;
  }

  if (state.colorsDirty) {
    state.points.geometry.attributes.color.needsUpdate = true;
    state.colorsDirty = false;
  }
}

function onResize() {
  if (!state.renderer || !state.camera) return;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();

  state.renderer.setPixelRatio(pixelRatio);
  state.renderer.setSize(window.innerWidth, window.innerHeight);

  if (state.pointsMaterial) {
    state.pointsMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }
}

function openPopup(project, position) {
  if (!popupLayer) return;
  closePopup();

  const popup = document.createElement("article");
  popup.className = "popup";

  popup.innerHTML = `
    <button type="button" aria-label="Close project preview">close</button>
    <figure class="media"></figure>
    <h2>${project.title}</h2>
    <p>${project.description}</p>
  `;

  const figure = popup.querySelector("figure");
  if (project.type === "video") {
    const video = document.createElement("video");
    video.src = project.media;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    figure?.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = project.media;
    img.alt = `${project.title} preview`;
    figure?.appendChild(img);
  }

  const safeX = Math.min(Math.max(position.x, 160), window.innerWidth - 160);
  const safeY = Math.min(Math.max(position.y, 160), window.innerHeight - 160);
  popup.style.left = `${safeX}px`;
  popup.style.top = `${safeY}px`;

  popupLayer.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add("is-visible"));

  popup.querySelector("button")?.addEventListener("click", closePopup);

  state.activePopup = popup;
  popupLayer.classList.add("has-popup");

  state.popupTimer = window.setTimeout(() => {
    if (state.activePopup === popup) {
      closePopup();
    }
  }, 7000);
}

function closePopup() {
  if (state.popupTimer) {
    clearTimeout(state.popupTimer);
    state.popupTimer = null;
  }

  if (!state.activePopup) return;

  const target = state.activePopup;
  target.classList.remove("is-visible");
  setTimeout(() => target.remove(), 250);

  state.activePopup = null;
  popupLayer?.classList.remove("has-popup");
}
