// Liquid-metal CTA buttons — self-hosted @paper-design/shaders, vanilla port of the React component.
import { ShaderMount } from "/assets/vendor/paper-shaders/shader-mount.js";
import { liquidMetalFragmentShader } from "/assets/vendor/paper-shaders/shaders/liquid-metal.js";

(function () {
  var styleId = "lm-shader-style";
  if (!document.getElementById(styleId)) {
    var s = document.createElement("style");
    s.id = styleId;
    s.textContent =
      ".lm-shader canvas{width:100% !important;height:100% !important;display:block !important;position:absolute !important;top:0 !important;left:0 !important;border-radius:100px !important;}" +
      ".lm-wrap{position:relative;display:inline-block;vertical-align:middle;}" +
      "@keyframes lm-ripple{0%{transform:translate(-50%,-50%) scale(0);opacity:.6}100%{transform:translate(-50%,-50%) scale(4);opacity:0}}";
    document.head.appendChild(s);
  }

  function measureText(text) {
    var span = document.createElement("span");
    span.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;font-size:14px;font-weight:600;letter-spacing:0.01em;font-family:" +
      getComputedStyle(document.body).fontFamily;
    span.textContent = text;
    document.body.appendChild(span);
    var w = span.offsetWidth;
    span.remove();
    return w;
  }

  function build(anchor) {
    var label = anchor.textContent.trim();
    var href = anchor.getAttribute("href") || "#";
    var isRed = anchor.getAttribute("data-metal") === "red";
    var width = Math.round(measureText(label) + 56);
    var height = 46;
    var innerW = width - 4,
      innerH = height - 4;

    var wrap = document.createElement("div");
    wrap.className = "lm-wrap";
    var persp = document.createElement("div");
    persp.style.cssText = "perspective:1000px;perspective-origin:50% 50%;";
    var stage = document.createElement("div");
    stage.style.cssText =
      "position:relative;width:" + width + "px;height:" + height + "px;transform-style:preserve-3d;";

    var textLayer = document.createElement("div");
    textLayer.style.cssText =
      "position:absolute;top:0;left:0;width:" + width + "px;height:" + height +
      "px;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transform:translateZ(20px);z-index:30;pointer-events:none;";
    var span = document.createElement("span");
    span.textContent = label;
    span.style.cssText =
      "font-size:14px;color:" + (isRed ? "#ffffff" : "#d2d2d2") + ";font-weight:600;letter-spacing:0.01em;text-shadow:0px 1px 2px rgba(0,0,0,0.6);white-space:nowrap;";
    textLayer.appendChild(span);

    var innerLayer = document.createElement("div");
    innerLayer.style.cssText =
      "position:absolute;top:0;left:0;width:" + width + "px;height:" + height +
      "px;transform-style:preserve-3d;transform:translateZ(10px);z-index:20;transition:transform .15s cubic-bezier(.4,0,.2,1);";
    var innerPill = document.createElement("div");
    innerPill.style.cssText =
      "width:" + innerW + "px;height:" + innerH +
      "px;margin:2px;border-radius:100px;background:" +
      (isRed ? "linear-gradient(180deg,#ef4650 0%,#c01f27 100%)" : "linear-gradient(180deg,#202020 0%,#000 100%)") + ";";
    innerLayer.appendChild(innerPill);

    var shaderLayer = document.createElement("div");
    shaderLayer.style.cssText =
      "position:absolute;top:0;left:0;width:" + width + "px;height:" + height +
      "px;transform-style:preserve-3d;transform:translateZ(0px);z-index:10;transition:transform .15s cubic-bezier(.4,0,.2,1);";
    var shaderShadow = document.createElement("div");
    shaderShadow.style.cssText =
      "width:" + width + "px;height:" + height +
      "px;border-radius:100px;box-shadow:0 0 0 1px rgba(0,0,0,0.3),0 9px 9px rgba(0,0,0,0.12),0 2px 5px rgba(0,0,0,0.15);";
    var shaderEl = document.createElement("div");
    shaderEl.className = "lm-shader";
    shaderEl.style.cssText =
      "border-radius:100px;overflow:hidden;position:relative;width:" + width + "px;height:" + height + "px;";
    shaderShadow.appendChild(shaderEl);
    shaderLayer.appendChild(shaderShadow);

    var hit = document.createElement("a");
    hit.href = href;
    hit.setAttribute("aria-label", label);
    if (anchor.hasAttribute("download")) hit.setAttribute("download", anchor.getAttribute("download") || "");
    if (anchor.hasAttribute("target")) hit.setAttribute("target", anchor.getAttribute("target"));
    if (anchor.hasAttribute("rel")) hit.setAttribute("rel", anchor.getAttribute("rel"));
    if (anchor.hasAttribute("data-consult-open")) hit.setAttribute("data-consult-open", "");
    hit.style.cssText =
      "position:absolute;top:0;left:0;width:" + width + "px;height:" + height +
      "px;background:transparent;border:none;cursor:pointer;z-index:40;transform-style:preserve-3d;transform:translateZ(25px);overflow:hidden;border-radius:100px;display:block;";

    stage.appendChild(textLayer);
    stage.appendChild(innerLayer);
    stage.appendChild(shaderLayer);
    stage.appendChild(hit);
    persp.appendChild(stage);
    wrap.appendChild(persp);
    anchor.replaceWith(wrap);

    var mount = null;
    try {
      mount = new ShaderMount(
        shaderEl,
        liquidMetalFragmentShader,
        {
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1
        },
        undefined,
        0.6
      );
    } catch (e) {
      console.error("[liquid-metal] shader failed:", e);
    }

    var hovered = false;
    function setSpeed(v) { if (mount && mount.setSpeed) mount.setSpeed(v); }
    function press(p) {
      var t = p ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)";
      innerLayer.style.transform = "translateZ(10px) " + t;
      shaderLayer.style.transform = "translateZ(0px) " + t;
    }
    hit.addEventListener("mouseenter", function () { hovered = true; setSpeed(1); });
    hit.addEventListener("mouseleave", function () { hovered = false; press(false); setSpeed(0.6); });
    hit.addEventListener("mousedown", function () { press(true); });
    hit.addEventListener("mouseup", function () { press(false); });
    hit.addEventListener("click", function (e) {
      setSpeed(2.4);
      setTimeout(function () { setSpeed(hovered ? 1 : 0.6); }, 300);
      var rect = hit.getBoundingClientRect();
      var rp = document.createElement("span");
      rp.style.cssText =
        "position:absolute;left:" + (e.clientX - rect.left) + "px;top:" + (e.clientY - rect.top) +
        "px;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0) 70%);pointer-events:none;animation:lm-ripple .6s ease-out;";
      hit.appendChild(rp);
      setTimeout(function () { rp.remove(); }, 600);
      // navigation proceeds via the anchor href
    });
  }

  function init() {
    var btns = document.querySelectorAll("a[data-metal]");
    btns.forEach(build);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
