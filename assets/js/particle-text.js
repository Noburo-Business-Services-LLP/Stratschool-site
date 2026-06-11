// Particle Text Effect — vanilla JS port of the React/canvas component.
// Particles fly in to form each word, then scatter; colors use the Nebulaa gold palette.
// Usage: <canvas data-particle-text data-words="NEBULAA,EXECUTION,..."></canvas>
(function () {
  var canvas = document.querySelector("[data-particle-text]");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Internal render resolution (the canvas is displayed scaled via CSS).
  canvas.width = 1000;
  canvas.height = 500;

  var pixelSteps = 6;
  var drawAsPoints = true;

  // Nebulaa brand palette (gold/amber family).
  var PALETTE = [
    { r: 252, g: 204, b: 36 },  // #FCCC24 core gold
    { r: 255, g: 216, b: 77 },  // #FFD84D light gold
    { r: 245, g: 166, b: 35 },  // #F5A623 warm amber
    { r: 255, g: 232, b: 140 }, // #FFE88C pale gold
    { r: 240, g: 185, b: 20 }   // #F0B914 deep gold
  ];

  var words = (canvas.getAttribute("data-words") || "NEBULAA").split(",").map(function (w) { return w.trim(); });
  var paletteIndex = 0;

  var particles = [];
  var frameCount = 0;
  var wordIndex = 0;
  var animationId = null;
  var mouse = { x: 0, y: 0, isPressed: false, isRightClick: false };

  function generateRandomPos(x, y, mag) {
    var randomX = Math.random() * 1000;
    var randomY = Math.random() * 500;
    var dx = randomX - x, dy = randomY - y;
    var m = Math.sqrt(dx * dx + dy * dy);
    if (m > 0) { dx = (dx / m) * mag; dy = (dy / m) * mag; }
    return { x: x + dx, y: y + dy };
  }

  function Particle() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.closeEnoughTarget = 100;
    this.maxSpeed = 1.0;
    this.maxForce = 0.1;
    this.particleSize = 10;
    this.isKilled = false;
    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.01;
  }

  Particle.prototype.move = function () {
    var proximityMult = 1;
    var distance = Math.sqrt(Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2));
    if (distance < this.closeEnoughTarget) proximityMult = distance / this.closeEnoughTarget;

    var tx = this.target.x - this.pos.x, ty = this.target.y - this.pos.y;
    var mag = Math.sqrt(tx * tx + ty * ty);
    if (mag > 0) { tx = (tx / mag) * this.maxSpeed * proximityMult; ty = (ty / mag) * this.maxSpeed * proximityMult; }

    var sx = tx - this.vel.x, sy = ty - this.vel.y;
    var sm = Math.sqrt(sx * sx + sy * sy);
    if (sm > 0) { sx = (sx / sm) * this.maxForce; sy = (sy / sm) * this.maxForce; }

    this.acc.x += sx; this.acc.y += sy;
    this.vel.x += this.acc.x; this.vel.y += this.acc.y;
    this.pos.x += this.vel.x; this.pos.y += this.vel.y;
    this.acc.x = 0; this.acc.y = 0;
  };

  Particle.prototype.draw = function (ctx, asPoints) {
    if (this.colorWeight < 1.0) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0);
    var c = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)
    };
    ctx.fillStyle = "rgb(" + c.r + "," + c.g + "," + c.b + ")";
    if (asPoints) {
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    } else {
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  Particle.prototype.kill = function (width, height) {
    if (!this.isKilled) {
      var rp = generateRandomPos(width / 2, height / 2, (width + height) / 2);
      this.target.x = rp.x; this.target.y = rp.y;
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight
      };
      this.targetColor = { r: 0, g: 0, b: 0 };
      this.colorWeight = 0;
      this.isKilled = true;
    }
  };

  function nextWord(word) {
    var off = document.createElement("canvas");
    off.width = canvas.width; off.height = canvas.height;
    var octx = off.getContext("2d");
    octx.fillStyle = "white";
    octx.font = "bold 120px Archivo, Arial, sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText(word, canvas.width / 2, canvas.height / 2);

    var pixels = octx.getImageData(0, 0, canvas.width, canvas.height).data;

    // New color for this word, pulled from the Nebulaa palette.
    var newColor = PALETTE[paletteIndex % PALETTE.length];
    paletteIndex++;

    var particleIndex = 0;
    var coords = [];
    for (var i = 0; i < pixels.length; i += pixelSteps * 4) coords.push(i);
    for (var k = coords.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var t = coords[k]; coords[k] = coords[j]; coords[j] = t;
    }

    for (var ci = 0; ci < coords.length; ci++) {
      var pixelIndex = coords[ci];
      if (pixels[pixelIndex + 3] > 0) {
        var x = (pixelIndex / 4) % canvas.width;
        var y = Math.floor(pixelIndex / 4 / canvas.width);
        var particle;
        if (particleIndex < particles.length) {
          particle = particles[particleIndex];
          particle.isKilled = false;
          particleIndex++;
        } else {
          particle = new Particle();
          var rp = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
          particle.pos.x = rp.x; particle.pos.y = rp.y;
          particle.maxSpeed = Math.random() * 6 + 4;
          particle.maxForce = particle.maxSpeed * 0.05;
          particle.particleSize = Math.random() * 6 + 6;
          particle.colorBlendRate = Math.random() * 0.0275 + 0.0025;
          particles.push(particle);
        }
        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight
        };
        particle.targetColor = newColor;
        particle.colorWeight = 0;
        particle.target.x = x;
        particle.target.y = y;
      }
    }
    for (var r = particleIndex; r < particles.length; r++) particles[r].kill(canvas.width, canvas.height);
  }

  function animate() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.move();
      p.draw(ctx, drawAsPoints);
      if (p.isKilled && (p.pos.x < 0 || p.pos.x > canvas.width || p.pos.y < 0 || p.pos.y > canvas.height)) {
        particles.splice(i, 1);
      }
    }

    if (mouse.isPressed && mouse.isRightClick) {
      particles.forEach(function (p) {
        var d = Math.sqrt(Math.pow(p.pos.x - mouse.x, 2) + Math.pow(p.pos.y - mouse.y, 2));
        if (d < 50) p.kill(canvas.width, canvas.height);
      });
    }

    frameCount++;
    if (frameCount % 240 === 0) {
      wordIndex = (wordIndex + 1) % words.length;
      nextWord(words[wordIndex]);
    }
    animationId = requestAnimationFrame(animate);
  }

  function scaledMouse(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  canvas.addEventListener("mousedown", function (e) { mouse.isPressed = true; mouse.isRightClick = e.button === 2; scaledMouse(e); });
  canvas.addEventListener("mouseup", function () { mouse.isPressed = false; mouse.isRightClick = false; });
  canvas.addEventListener("mousemove", scaledMouse);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // Only run the loop while the canvas is on-screen (saves CPU/battery).
  function start() { if (!animationId) animate(); }
  function stop() { if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
    }, { threshold: 0.05 }).observe(canvas);
  }

  nextWord(words[0]);
  start();
})();
