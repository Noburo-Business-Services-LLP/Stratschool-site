// Nebulaa cosmic hero background — vanilla port of the "Horizon Hero" Three.js scene,
// gold-tinted to Nebulaa's brand. Stars + nebula + gold sun glow + bloom, with the
// Nebulaa logo materializing (glowing, bloom-blended) as you scroll through the hero.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.querySelector("[data-cosmos]");
const heroEl = document.querySelector(".cosmos-hero");
if (canvas && heroEl) init(canvas, heroEl);

function init(canvas, heroEl) {
  const scrim = document.querySelector(".cosmos-scrim");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.00028);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 18, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.82, 0.5, 0.42);
  composer.addPass(bloom);

  // ---- Starfield (gold-tinted) ----
  const stars = [];
  const starCount = 2600;
  for (let layer = 0; layer < 3; layer++) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    for (let j = 0; j < starCount; j++) {
      const radius = 220 + Math.random() * 820;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[j * 3 + 2] = radius * Math.cos(phi);
      const c = new THREE.Color();
      const pick = Math.random();
      if (pick < 0.55) c.setHSL(0, 0, 0.85 + Math.random() * 0.15);      // warm white
      else if (pick < 0.9) c.setHSL(0.13, 0.85, 0.62 + Math.random() * 0.15); // gold
      else c.setHSL(0.08, 0.9, 0.55);                                    // amber
      colors[j * 3] = c.r; colors[j * 3 + 1] = c.g; colors[j * 3 + 2] = c.b;
      sizes[j] = Math.random() * 2 + 0.5;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, depth: { value: layer } },
      vertexShader: `
        attribute float size; attribute vec3 color; varying vec3 vColor;
        uniform float time; uniform float depth;
        void main(){
          vColor = color; vec3 pos = position;
          float angle = time * 0.045 * (1.0 - depth * 0.3);
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          pos.xy = rot * pos.xy;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float o = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, o);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    stars.push(pts);
  }

  // ---- Nebula plane (gold/amber) ----
  const nebGeo = new THREE.PlaneGeometry(8000, 4000, 80, 80);
  const nebMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xfccc24) }, // Nebulaa gold
      color2: { value: new THREE.Color(0xff7a18) }, // warm amber
      opacity: { value: 0.34 }
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
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  });
  const nebula = new THREE.Mesh(nebGeo, nebMat);
  nebula.position.z = -1050;
  scene.add(nebula);

  // ---- Gold sun glow (radial sprite) ----
  const sunCanvas = document.createElement("canvas");
  sunCanvas.width = sunCanvas.height = 256;
  const sctx = sunCanvas.getContext("2d");
  const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,250,235,1)");
  grad.addColorStop(0.15, "rgba(255,224,140,0.92)");
  grad.addColorStop(0.42, "rgba(252,204,36,0.48)");
  grad.addColorStop(1, "rgba(252,204,36,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const sunTex = new THREE.CanvasTexture(sunCanvas);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sun.scale.set(360, 360, 1);
  sun.position.set(0, 78, -660);
  scene.add(sun);

  // ---- Nebulaa logo plane (fades/glows in on scroll, blended via bloom) ----
  let logo = null;
  new THREE.TextureLoader().load("/assets/logos/nebulaa-new.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = (tex.image && tex.image.width && tex.image.height) ? tex.image.width / tex.image.height : 1;
    const h = 64, w = h * aspect;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    logo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    logo.position.set(0, 14, 0);
    scene.add(logo);
  });

  // ---- Camera smoothing + scroll ----
  const smooth = { x: 0, y: 18, z: 100 };
  let target = { x: 0, y: 18, z: 100 };
  let scrollProgress = 0;

  function onScroll() {
    const rect = heroEl.getBoundingClientRect();
    const span = Math.max(rect.height * 0.85, 1);
    scrollProgress = clamp((-rect.top) / span, 0, 1);
    // very gentle drift only — avoid enlarging the logo as you scroll
    target = { x: 0, y: 18 + scrollProgress * 4, z: 100 - scrollProgress * 10 };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function animate() {
    const t = Date.now() * 0.001;
    stars.forEach((s) => { if (s.material.uniforms) s.material.uniforms.time.value = t; });
    if (nebula.material.uniforms) nebula.material.uniforms.time.value = t * 0.5;

    const k = reduceMotion ? 1 : 0.05;
    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    smooth.z += (target.z - smooth.z) * k;
    const fx = reduceMotion ? 0 : Math.sin(t * 0.1) * 2;
    const fy = reduceMotion ? 0 : Math.cos(t * 0.15) * 1;
    camera.position.set(smooth.x + fx, smooth.y + fy, smooth.z);
    camera.lookAt(0, 14, -600);

    // Logo reveal: glows in early-to-mid scroll, fully blended before the next section covers it.
    if (logo) {
      // fade in early, then ease back out before the next section so it never gets chopped
      const o = smoothstep(0.05, 0.3, scrollProgress) * (1 - smoothstep(0.62, 0.82, scrollProgress));
      logo.material.opacity = o * 0.95;
      logo.scale.setScalar(0.96 + o * 0.06);
    }

    // Fade the whole scene out near the hero bottom so the next (white) section
    // never guillotines a bright glow — the cosmos dissolves into black first.
    const fade = 1 - smoothstep(0.6, 0.92, scrollProgress);
    canvas.style.opacity = fade;
    if (scrim) scrim.style.opacity = fade;

    composer.render();
  }

  // Only render while the hero is on-screen.
  let running = false, rafId = null;
  function loop() { animate(); rafId = requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; loop(); } }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(heroEl);
  } else start();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}
