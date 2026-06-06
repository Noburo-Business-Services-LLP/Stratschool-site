const initNav = () => {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");

  if (nav) {
    const updateNav = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
  }

  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("open");
      toggle.classList.remove("open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      document.body.classList.toggle("menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }
};

const initReveal = () => {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const markIfVisible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      element.classList.add("in-view");
      return true;
    }
    return false;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
  );

  items.forEach((item) => {
    if (!markIfVisible(item)) observer.observe(item);
  });
};

const initCounters = () => {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  const runCounter = (el) => {
    const target = Number(el.getAttribute("data-target") || "0");
    const duration = Number(el.getAttribute("data-duration") || "1600");
    const prefix = el.getAttribute("data-prefix") || "";
    const suffix = el.getAttribute("data-suffix") || "";
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach((counter) => observer.observe(counter));
};

const initFAQ = () => {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const button = item.querySelector(".faq-button");
    const panel = item.querySelector(".faq-panel");
    if (!button || !panel) return;
    button.addEventListener("click", () => {
      const isOpen = item.classList.toggle("open");
      panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : "0px";
    });
  });
};

const initSpotlights = () => {
  document.querySelectorAll(".spotlight-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    });
  });
};

const initSlideshows = () => {
  document.querySelectorAll("[data-slideshow]").forEach((slideshow) => {
    const slides = Array.from(slideshow.querySelectorAll(".team-slide"));
    const dots = Array.from(slideshow.querySelectorAll("[data-slide-dot]"));
    const prev = slideshow.querySelector("[data-slide-prev]");
    const next = slideshow.querySelector("[data-slide-next]");
    if (!slides.length) return;

    let active = 0;
    let intervalId = null;

    const render = (index) => {
      active = index;
      slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
      dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    };

    const step = (delta) => {
      render((active + delta + slides.length) % slides.length);
    };

    const restartAuto = () => {
      if (intervalId) window.clearInterval(intervalId);
      if (slides.length < 2) return;
      intervalId = window.setInterval(() => {
        step(1);
      }, 4200);
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        render(index);
        restartAuto();
      });
    });

    prev?.addEventListener("click", () => {
      step(-1);
      restartAuto();
    });

    next?.addEventListener("click", () => {
      step(1);
      restartAuto();
    });

    render(0);
    if (slides.length < 2) return;
    restartAuto();
  });
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderList = (items) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const normalizeItems = (value) =>
  String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const initTools = () => {
  const tools = document.querySelectorAll("[data-tool]");
  if (!tools.length) return;

  tools.forEach((tool) => {
    const form = tool.querySelector("form");
    const output = tool.querySelector("[data-tool-output]");
    if (!form || !output) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const type = tool.getAttribute("data-tool");
      let html = "";

      if (type === "problem-score") {
        const urgency = Number(data.get("urgency") || 0);
        const frequency = Number(data.get("frequency") || 0);
        const pain = Number(data.get("pain") || 0);
        const reach = Number(data.get("reach") || 0);
        const willingness = Number(data.get("willingness") || 0);
        const total = urgency * 1.15 + frequency + pain * 1.2 + reach * 0.8 + willingness * 0.85;
        const rounded = Math.round(total);
        let verdict = "Weak signal";
        if (rounded >= 21) verdict = "Strong founder-grade problem";
        else if (rounded >= 16) verdict = "Promising, but still needs evidence";
        const riskFlags = [];
        if (urgency <= 2) riskFlags.push("Urgency is low. Users may delay action.");
        if (frequency <= 2) riskFlags.push("The problem may not occur often enough to create habit or demand.");
        if (pain <= 2) riskFlags.push("The pain is not sharp enough yet.");
        if (reach <= 2) riskFlags.push("The audience definition is still too narrow or too vague to reach cleanly.");
        if (willingness <= 2) riskFlags.push("Commercial intent is weak. Test willingness to pay before building.");
        const nextStep = rounded >= 21
          ? "Run 10 interviews, capture exact user language, and test one landing page angle this week."
          : rounded >= 16
            ? "Narrow the audience and validate the pain with sharper interviews before building."
            : "Do not build yet. Rework the problem statement or pick a narrower, more painful use case.";
        html = `<strong>${verdict}</strong><p>Weighted score: ${rounded}/25</p>` +
          `<h4>What this means</h4><p>${escapeHtml(nextStep)}</p>` +
          `<h4>Risk flags</h4>${renderList(riskFlags.length ? riskFlags : ["No major red flags. Your next step is evidence collection, not ideation."])}`;
      }

      if (type === "interview-builder") {
        const audience = String(data.get("audience") || "").trim();
        const problem = String(data.get("problem") || "").trim();
        const outcome = String(data.get("outcome") || "").trim();
        html = `<strong>Interview plan for ${escapeHtml(audience || "your target audience")}</strong>` +
          `<h4>Warm-up questions</h4>` +
          renderList([
            `Tell me a bit about your role and what a normal week looks like.`,
            `Where does "${problem || "this issue"}" usually show up in your workflow?`
          ]) +
          `<h4>Core discovery questions</h4>` +
          renderList([
            `Walk me through the last time you faced "${problem || "this problem"}".`,
            `What triggered you to act, and what did you try first?`,
            `What is frustrating about your current workaround?`,
            `How often does this issue show up in a normal week or month?`,
            `What would a good outcome look like for you? ${outcome || "What gets measurably easier?"}`,
            `Who else is involved in deciding how this gets solved?`,
            `What would make you pay, switch, or adopt something new here?`
          ]) +
          `<h4>Do not do this</h4>${renderList([
            "Do not pitch your product too early.",
            "Do not ask leading questions such as 'Would you use this?'",
            "Do not confuse politeness with demand."
          ])}`;
      }

      if (type === "icp-builder") {
        const role = String(data.get("role") || "").trim();
        const segment = String(data.get("segment") || "").trim();
        const trigger = String(data.get("trigger") || "").trim();
        const goal = String(data.get("goal") || "").trim();
        html = `<strong>Ideal customer profile</strong>` +
          `<p><strong>Primary buyer:</strong> ${escapeHtml(role || "Founder / operator")}</p>` +
          `<p><strong>Segment:</strong> ${escapeHtml(segment || "Niche, reachable market")}</p>` +
          `<p><strong>Buying trigger:</strong> ${escapeHtml(trigger || "A pain point becomes too expensive to ignore")}</p>` +
          `<p><strong>Main goal:</strong> ${escapeHtml(goal || "Save time, improve outcomes, or reduce risk")}</p>` +
          `<h4>Use this ICP in</h4>${renderList([
            "Landing page headline and subtext",
            "Cold outreach lists and filters",
            "Founder interviews and user calls",
            "Early sales and pilot conversations"
          ])}`;
      }

      if (type === "value-prop") {
        const audience = String(data.get("audience") || "").trim();
        const action = String(data.get("action") || "").trim();
        const result = String(data.get("result") || "").trim();
        const difference = String(data.get("difference") || "").trim();
        const a = audience || "We help early-stage founders";
        const b = action || "move faster";
        const c = result || "reach a real business outcome";
        const d = difference || "the usual overhead and confusion";
        html = `<strong>Value proposition options</strong>` +
          `<h4>Option 1</h4><p>${escapeHtml(a)} ${escapeHtml(b)} so they can ${escapeHtml(c)} without ${escapeHtml(d)}.</p>` +
          `<h4>Option 2</h4><p>${escapeHtml(a)} use our system to ${escapeHtml(b)}, which helps them ${escapeHtml(c)}.</p>` +
          `<h4>Option 3</h4><p>Built for ${escapeHtml(a.toLowerCase())}, this makes it easier to ${escapeHtml(b)} and ${escapeHtml(c)}.</p>`;
      }

      if (type === "mvp-scope") {
        const must = normalizeItems(data.get("must"));
        const nice = normalizeItems(data.get("nice"));
        const proof = String(data.get("proof") || "").trim();
        html = `<strong>MVP scope plan</strong>` +
          `<h4>Build now</h4>${renderList(must.length ? must.slice(0, 5) : ["One core action", "One clear result", "One simple workflow"])}` +
          `<h4>Ship later</h4>${renderList(nice.length ? nice.slice(0, 5) : ["Dashboards", "Advanced settings", "Secondary features"])}` +
          `<h4>Proof target</h4><p>${escapeHtml(proof || "What is the smallest usable version that proves someone cares?")}</p>` +
          `<h4>Scope warning</h4><p>${must.length > 5 ? "Your version-one scope is getting heavy. Cut until the first build can be tested quickly." : "The current scope looks reasonably light for a first proof build."}</p>`;
      }

      if (type === "gtm-checklist") {
        const audience = String(data.get("audience") || "").trim();
        const offer = String(data.get("offer") || "").trim();
        const channel = String(data.get("channel") || "").trim();
        html = `<strong>30-day go-to-market checklist</strong>` +
          `<h4>Week 1: sharpen the message</h4>` +
          renderList([
            `Define a narrow audience: ${audience || "one reachable segment, not everyone"}.`,
            `State one offer clearly: ${offer || "what you help them do and why now"}.`,
            "Create one proof asset: short deck, one-pager, or demo screen."
          ]) +
          `<h4>Week 2-3: launch the first motion</h4>` +
          renderList([
            `Launch one repeatable channel first: ${channel || "email, WhatsApp, campus network, or founder outreach"}.`,
            "Track response rate, demos booked, and objections heard.",
            "Refine the script after every 10 conversations."
          ]) +
          `<h4>Week 4: review traction</h4>` +
          renderList([
            "Double down on the best-performing message.",
            "Drop channels that are noisy but not converting.",
            "Document the real objections for product and offer decisions."
          ]);
      }

      if (type === "tam-calc") {
        const marketSize = Number(data.get("marketSize") || 0);
        const averageRevenue = Number(data.get("averageRevenue") || 0);
        const reachable = Number(data.get("reachable") || 0) / 100;
        const capture = Number(data.get("capture") || 0) / 100;
        const tam = marketSize * averageRevenue;
        const sam = tam * reachable;
        const som = sam * capture;
        html = `<strong>Market sizing snapshot</strong>` +
          `<p><strong>TAM:</strong> ₹${Math.round(tam).toLocaleString("en-IN")}</p>` +
          `<p><strong>SAM:</strong> ₹${Math.round(sam).toLocaleString("en-IN")}</p>` +
          `<p><strong>SOM:</strong> ₹${Math.round(som).toLocaleString("en-IN")}</p>` +
          `<h4>Interpretation</h4><p>Use these numbers directionally. A smaller, reachable wedge with proof is more believable than a huge market with no evidence.</p>`;
      }

      if (type === "runway-calc") {
        const cash = Number(data.get("cash") || 0);
        const burn = Number(data.get("burn") || 0);
        const revenue = Number(data.get("revenue") || 0);
        const netBurn = Math.max(burn - revenue, 0);
        const runway = netBurn > 0 ? cash / netBurn : 999;
        const verdict = netBurn === 0 ? "You are at or above operating break-even." : `Estimated runway: ${runway.toFixed(1)} months.`;
        html = `<strong>Runway view</strong><p>${escapeHtml(verdict)}</p>` +
          `<p><strong>Cash in hand:</strong> ₹${cash.toLocaleString("en-IN")}</p>` +
          `<p><strong>Monthly burn:</strong> ₹${burn.toLocaleString("en-IN")}</p>` +
          `<p><strong>Monthly revenue:</strong> ₹${revenue.toLocaleString("en-IN")}</p>` +
          `<p><strong>Net burn:</strong> ₹${netBurn.toLocaleString("en-IN")}</p>` +
          `<h4>Priority</h4><p>${netBurn > 0 && runway < 6 ? "Either raise revenue, reduce burn, or extend the runway immediately." : "Keep weekly visibility on burn, revenue, and growth assumptions."}</p>`;
      }

      if (type === "outreach-generator") {
        const audience = String(data.get("audience") || "").trim();
        const problem = String(data.get("problem") || "").trim();
        const proof = String(data.get("proof") || "").trim();
        html = `<strong>Outreach kit</strong>` +
          `<h4>Message draft</h4><p>Hi ${escapeHtml(audience || "there")},</p><p>I’m reaching out because we’re working on a way to help ${escapeHtml(audience || "teams like yours")} handle ${escapeHtml(problem || "this problem")} with less friction.</p><p>We’ve been hearing that the biggest issue is speed, clarity, and follow-through. ${escapeHtml(proof || "Would you be open to a 15-minute conversation to see if this is relevant to your workflow?")}</p>` +
          `<h4>Follow-up line</h4><p>Just checking if this is relevant on your side. If not, even a quick reply on how you currently handle it would help.</p>` +
          `<h4>Tip</h4><p>Personalize the first sentence with one real observation. That matters more than adding more words.</p>`;
      }

      if (html) output.innerHTML = html;
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("js-ready");
  initNav();
  initReveal();
  initCounters();
  initFAQ();
  initSpotlights();
  initSlideshows();
  initTools();
});
