// Nebulaa cosmic hero background (revamped for cross-GPU safety).
// No gl_Points and no post-processing/bloom (both render inconsistently across GPU
// drivers and were causing a stray vertical streak). Only plane-meshes + sprites here;
// the starfield is done in CSS (.cosmos-stars). Gold-tinted to Nebulaa's brand.
import * as THREE from "three";

const canvas = document.querySelector("[data-cosmos]");
const heroEl = document.querySelector(".cosmos-hero");
if (canvas && heroEl) init(canvas, heroEl);

function init(canvas, heroEl) {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.set(0, 18, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  // Reusable soft radial glow texture (for the sun + logo halo).
  function glowTexture(stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach((s) => grad.addColorStop(s[0], s[1]));
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  // ---- Nebula plane (gold/amber) ----
  const nebGeo = new THREE.PlaneGeometry(8000, 4000, 60, 60);
  const nebMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xfccc24) },
      color2: { value: new THREE.Color(0xff7a18) },
      opacity: { value: 0.32 }
    },
    vertexShader: `
      varying vec2 vUv; varying float vEl; uniform float time;
      void main(){
        vUv = uv; vec3 pos = position;
        float el = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
        pos.z += el; vEl = el;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 color1; uniform vec3 color2; uniform float opacity; uniform float time;
      varying vec2 vUv; varying float vEl;
      void main(){
        float m = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
        vec3 col = mix(color1, color2, m * 0.5 + 0.5);
        float a = opacity * (1.0 - length(vUv - 0.5) * 2.0);
        a *= 1.0 + vEl * 0.01;
        gl_FragColor = vec4(col, max(a, 0.0));
      }`,
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  });
  const nebula = new THREE.Mesh(nebGeo, nebMat);
  nebula.position.z = -1050;
  scene.add(nebula);

  // ---- Gold sun glow (sprite) ----
  const sunTex = glowTexture([
    [0, "rgba(255,247,228,0.92)"],
    [0.18, "rgba(255,216,120,0.7)"],
    [0.45, "rgba(252,204,36,0.34)"],
    [1, "rgba(252,204,36,0)"]
  ]);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  sun.scale.set(300, 300, 1);
  sun.position.set(0, 52, -700);
  scene.add(sun);

  // ---- Nebulaa logo + soft halo (replaces the bloom glow) ----
  let logo = null, halo = null;
  const haloTex = glowTexture([
    [0, "rgba(255,236,150,0.55)"],
    [0.4, "rgba(252,204,36,0.3)"],
    [1, "rgba(252,204,36,0)"]
  ]);
  new THREE.TextureLoader().load("/assets/logos/nebulaa-new.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = (tex.image && tex.image.width && tex.image.height) ? tex.image.width / tex.image.height : 1;
    const h = 64, w = h * aspect;
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(w * 2.1, h * 2.6, 1);
    halo.position.set(0, 14, -1);
    scene.add(halo);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    logo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    logo.position.set(0, 14, 0);
    scene.add(logo);
  });

  // ---- Camera smoothing + scroll ----
  const smooth = { x: 0, y: 18, z: 100 };
  let target = { x: 0, y: 18, z: 100 };
  let scrollProgress = 0;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function onScroll() {
    const rect = heroEl.getBoundingClientRect();
    const span = Math.max(rect.height * 0.85, 1);
    scrollProgress = clamp((-rect.top) / span, 0, 1);
    target = { x: 0, y: 18 + scrollProgress * 4, z: 100 - scrollProgress * 10 };
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function animate() {
    const t = Date.now() * 0.001;
    if (nebula.material.uniforms) nebula.material.uniforms.time.value = t * 0.5;

    const k = reduceMotion ? 1 : 0.05;
    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    smooth.z += (target.z - smooth.z) * k;
    const fx = reduceMotion ? 0 : Math.sin(t * 0.1) * 2;
    const fy = reduceMotion ? 0 : Math.cos(t * 0.15) * 1;
    camera.position.set(smooth.x + fx, smooth.y + fy, smooth.z);
    camera.lookAt(0, 14, -600);

    if (logo) {
      const o = smoothstep(0.04, 0.24, scrollProgress);
      logo.material.opacity = o * 0.96;
      logo.scale.setScalar(0.96 + o * 0.06);
      if (halo) halo.material.opacity = o * 0.7;
    }

    renderer.render(scene, camera);
  }

  let running = false, rafId = null;
  function loop() { animate(); rafId = requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; loop(); } }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  const watch = [heroEl, document.querySelector(".stack-section")].filter(Boolean);
  if ("IntersectionObserver" in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      visible.size ? start() : stop();
    }, { threshold: 0 });
    watch.forEach((el) => io.observe(el));
  } else start();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
