import * as THREE from "three";
import { gsap } from "gsap";
import planeVertex from "./shaders/plane.vert?raw";
import planeFragment from "./shaders/plane.frag?raw";
import pointsVertex from "./shaders/points.vert?raw";
import pointsFragment from "./shaders/points.frag?raw";

const BACKGROUND_URL = "https://letmeshock.ru/wp-content/uploads/2025/11/background.jpg";
const INTERACTIVE_INDICES = [1, 4, 7, 9, 12, 15, 19, 23, 27, 30, 34, 37];
const MAGNET_THRESHOLD = 80;
const MAGNET_PULL = 0.35;
const POINT_TOTAL = 40;

const baseProjects = [
  {
    slug: "project1",
    title: "Metaverse Concierge",
    description: "A cross-reality onboarding funnel aligning 3D, product, and brand surfaces.",
  },
  {
    slug: "project2",
    title: "AI Ops Cockpit",
    description: "Realtime observability with adaptive automation patterns for lean teams.",
  },
  {
    slug: "project3",
    title: "Fintech Origination",
    description: "Borrower journeys reimagined with trust micro-interactions and audit trails.",
  },
  {
    slug: "project4",
    title: "Mobility Cloud",
    description: "Fleet intelligence dashboard scaling from pilots to global deployments.",
  },
  {
    slug: "project5",
    title: "Healthcare OS",
    description: "Clinical workflows unified around signal-based care loops and metrics.",
  },
  {
    slug: "project6",
    title: "Immersive Retail",
    description: "Spatial storytelling bridging physical retail and digital loyalty.",
  },
];

const portfolioModules = import.meta.glob("@portfolio/*.{jpg,jpeg,png,mp4,webm}", {
  eager: true,
  import: "default",
});

const projects = buildProjects();

function getRandomProject() {
  if (!projects.length) return null;
  const index = Math.floor(Math.random() * projects.length);
  return projects[index];
}

if (!projects.length) {
  console.warn("No portfolio assets were resolved from @portfolio. Popups will be disabled.");
}

const zeroVector = new THREE.Vector3(0, 0, 0);
const tempVec2A = new THREE.Vector2();
const tempVec2B = new THREE.Vector2();
const tempVec3A = new THREE.Vector3();
const tempVec3B = new THREE.Vector3();
const tempVec3C = new THREE.Vector3();
const tempVec3D = new THREE.Vector3();
const tempVec3E = new THREE.Vector3();
const pointerRay = new THREE.Ray();
const pointerPlane = new THREE.Plane();

function buildProjects() {
  const baseMap = new Map(baseProjects.map((entry) => [entry.slug, entry]));
  const entries = Object.entries(portfolioModules);

  if (!entries.length) {
    return baseProjects.map((entry) => ({
      title: entry.title,
      description: entry.description,
      media: `assets/portfolio/${entry.slug}.jpg`,
      type: "image",
    }));
  }

  return entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([path, url]) => {
      const fileName = path.split("/").pop() ?? "";
      const [rawSlug = "project"] = fileName.split(".");
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
      const type = extension === "mp4" || extension === "webm" ? "video" : "image";
      const meta = baseMap.get(rawSlug) ?? {
        title: rawSlug
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        description: "Exploratory concept from the studio archive.",
      };

      return {
        title: meta.title,
        description: meta.description,
        media: url,
        type,
      };
    });
}

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
  positionArray: null,
  scaleArray: null,
  scaleTargets: null,
  colorArray: null,
  colorsDirty: false,
  hoveredIndex: -1,
  hoverPointWorld: null,
  pointerNDC: new THREE.Vector2(),
  pointerUv: new THREE.Vector2(0.5, 0.5),
  pointerScreen: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
  pointerActive: false,
  raycaster: new THREE.Raycaster(),
  clock: new THREE.Clock(),
  popupTimer: null,
  activePopup: null,
};

state.raycaster.params.Points = { threshold: 0.16 };

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

  const quickLeft = gsap.quickTo(authorFloat, "left", {
    duration: 0.38,
    ease: "expo.out",
  });
  const quickTop = gsap.quickTo(authorFloat, "top", {
    duration: 0.38,
    ease: "expo.out",
  });

  gsap.set(authorFloat, { autoAlpha: 0, scale: 0.85 });

  const updatePosition = (event) => {
    quickLeft(event.clientX);
    quickTop(event.clientY);
  };

  designLead.addEventListener("pointerenter", (event) => {
    updatePosition(event);
    gsap.to(authorFloat, {
      duration: 0.4,
      autoAlpha: 1,
      scale: 1,
      ease: "expo.out",
    });
  });

  designLead.addEventListener("pointermove", updatePosition);
  designLead.addEventListener("pointerleave", () => {
    gsap.to(authorFloat, {
      duration: 0.28,
      autoAlpha: 0,
      scale: 0.85,
      ease: "power2.out",
    });
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

  let projectCursor = 0;

  const accent = new THREE.Color("#EAFF01");
  const accentDim = accent.clone().multiplyScalar(0.68);
  const baseColor = new THREE.Color(0xffffff).multiplyScalar(0.75);

  state.pointData = [];
  state.positionArray = positions;
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
      offset: new THREE.Vector3(),
      interactive: isInteractive,
      highlightColor: accent.clone(),
      baseColor: base.clone(),
      baseScale,
      project:
        isInteractive && projects.length
          ? projects[(projectCursor++) % projects.length]
          : null,
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

  state.pointerActive = true;
  state.pointerScreen.set(x, y);

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
  state.pointerActive = false;
  state.pointerScreen.set(window.innerWidth / 2, window.innerHeight / 2);
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
  if (!data) return;

  event.preventDefault();

  const worldPosition = state.hoverPointWorld
    ? tempVec3A.copy(state.hoverPointWorld)
    : tempVec3A.copy(data.basePosition).add(data.offset);

  const screenPosition = projectToScreen(worldPosition, tempVec2B);
  const project = data.project ?? getRandomProject();
  if (!project) return;

  openPopup(project, screenPosition);
}

function projectToScreen(vector, target = new THREE.Vector2()) {
  tempVec3C.copy(vector).project(state.camera);
  target.set(
    (tempVec3C.x * 0.5 + 0.5) * window.innerWidth,
    (-tempVec3C.y * 0.5 + 0.5) * window.innerHeight
  );
  return target;
}

function screenToWorldAtZ(x, y, z, target = new THREE.Vector3()) {
  if (!state.camera) return null;

  tempVec3E.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5);
  pointerRay.origin.copy(state.camera.position);
  pointerRay.direction
    .copy(tempVec3E.unproject(state.camera))
    .sub(state.camera.position)
    .normalize();

  pointerPlane.set(new THREE.Vector3(0, 0, 1), -z);
  const intersection = pointerRay.intersectPlane(pointerPlane, target);
  return intersection ?? null;
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
  if (!state.points || !state.camera) return;

  const positionsAttr = state.points.geometry.attributes.position;
  const positions = state.positionArray;

  let needsPositionUpdate = false;
  const pointerActive = state.pointerActive;

  for (let i = 0; i < state.pointData.length; i += 1) {
    const data = state.pointData[i];
    if (!data) continue;

    const isInteractive = data.interactive;

    tempVec3D.copy(data.basePosition).add(data.offset);

    if (isInteractive) {
      if (pointerActive) {
        const screenPosition = projectToScreen(tempVec3D, tempVec2A);
        const distance = screenPosition.distanceTo(state.pointerScreen);

        if (distance < MAGNET_THRESHOLD) {
          const influence = 1 - distance / MAGNET_THRESHOLD;
          const targetWorld = screenToWorldAtZ(
            state.pointerScreen.x,
            state.pointerScreen.y,
            tempVec3D.z,
            tempVec3B
          );

          if (targetWorld) {
            tempVec3B.sub(data.basePosition);
            const strength = MAGNET_PULL * (0.6 + influence * 0.8);
            tempVec3B.multiplyScalar(strength);
            data.offset.lerp(tempVec3B, 0.18);
          } else if (data.offset.lengthSq() > 1e-6) {
            data.offset.lerp(zeroVector, 0.1);
          }
        } else if (data.offset.lengthSq() > 1e-6) {
          data.offset.lerp(zeroVector, 0.12);
        }
      } else if (data.offset.lengthSq() > 1e-6) {
        data.offset.lerp(zeroVector, 0.1);
      }
    } else if (data.offset.lengthSq() > 1e-6) {
      data.offset.lerp(zeroVector, 0.08);
    }

    tempVec3D.copy(data.basePosition).add(data.offset);

    const idx3 = i * 3;
    if (
      Math.abs(positions[idx3] - tempVec3D.x) > 1e-4 ||
      Math.abs(positions[idx3 + 1] - tempVec3D.y) > 1e-4 ||
      Math.abs(positions[idx3 + 2] - tempVec3D.z) > 1e-4
    ) {
      positions[idx3] = tempVec3D.x;
      positions[idx3 + 1] = tempVec3D.y;
      positions[idx3 + 2] = tempVec3D.z;
      needsPositionUpdate = true;
    }
  }

  if (needsPositionUpdate) {
    positionsAttr.needsUpdate = true;
  }

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

  if (!state.pointerActive) {
    state.pointerScreen.set(window.innerWidth / 2, window.innerHeight / 2);
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
  gsap.set(popup, {
    xPercent: -50,
    y: -24,
    scale: 0.88,
    autoAlpha: 0,
    transformOrigin: "50% 0%",
  });
  gsap.to(popup, {
    duration: 0.48,
    autoAlpha: 1,
    scale: 1,
    y: -12,
    ease: "expo.out",
  });

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
  state.activePopup = null;

  gsap.to(target, {
    duration: 0.32,
    autoAlpha: 0,
    scale: 0.84,
    y: -28,
    ease: "power2.inOut",
    onComplete: () => target.remove(),
  });

  popupLayer?.classList.remove("has-popup");
}
