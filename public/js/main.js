/* ============================================================
   ROOT — Client JavaScript
   Ocean canvas background + interactions
   ============================================================ */

// ── Ocean Canvas Background ──────────────────────────────────
function initOceanCanvas() {
  const canvas = document.getElementById('ocean-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, t = 0;
  const layers = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Generate wave layers
  function buildLayers() {
    layers.length = 0;
    for (let i = 0; i < 6; i++) {
      layers.push({
        amplitude: 20 + Math.random() * 40,
        frequency: 0.003 + Math.random() * 0.005,
        speed:     0.0003 + Math.random() * 0.0005,
        offset:    Math.random() * Math.PI * 2,
        y:         0.45 + (i * 0.08),
        alpha:     0.015 + (i * 0.008),
        color:     i < 3 ? [0, 212, 255] : [26, 111, 255],
      });
    }
  }

  // Bioluminescent particles
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 0.5 + Math.random() * 1.5,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -(0.05 + Math.random() * 0.15),
    life: Math.random(),
    decay: 0.001 + Math.random() * 0.003,
    color: Math.random() > 0.5 ? [0, 212, 255] : [26, 111, 255],
  }));

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Deep ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   'rgba(0,0,0,1)');
    grad.addColorStop(0.4, 'rgba(4,8,16,1)');
    grad.addColorStop(0.7, 'rgba(6,14,28,1)');
    grad.addColorStop(1,   'rgba(2,6,16,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Wave layers
    layers.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(0, H);
      const baseY = H * l.y;
      for (let x = 0; x <= W; x += 4) {
        const y = baseY +
          Math.sin(x * l.frequency + t * l.speed + l.offset) * l.amplitude +
          Math.sin(x * l.frequency * 2.3 + t * l.speed * 1.7) * (l.amplitude * 0.3);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();

      const wGrad = ctx.createLinearGradient(0, baseY - l.amplitude, 0, H);
      wGrad.addColorStop(0, `rgba(${l.color.join(',')},${l.alpha})`);
      wGrad.addColorStop(1, `rgba(${l.color.join(',')},0)`);
      ctx.fillStyle = wGrad;
      ctx.fill();
    });

    // Particles
    particles.forEach(p => {
      p.x += p.vx + Math.sin(t * 0.001 + p.y * 0.01) * 0.1;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.y < -10) {
        p.x = Math.random() * W;
        p.y = H + 10;
        p.life = 0.3 + Math.random() * 0.7;
        p.r = 0.5 + Math.random() * 1.5;
      }

      const alpha = Math.sin(p.life * Math.PI) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.join(',')},${alpha})`;
      ctx.fill();

      // Glow
      const gGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      gGrad.addColorStop(0, `rgba(${p.color.join(',')},${alpha * 0.3})`);
      gGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = gGrad;
      ctx.fill();
    });

    t++;
    requestAnimationFrame(drawFrame);
  }

  resize();
  buildLayers();
  window.addEventListener('resize', () => { resize(); buildLayers(); });
  drawFrame();
}

// ── Nav scroll behavior ──────────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 20
      ? 'rgba(0,0,0,0.85)'
      : 'rgba(0,0,0,0.6)';
  }, { passive: true });
}

// ── Tool card hover ripple ───────────────────────────────────
function initToolCards() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.setProperty('--mx', `${x}%`);
      card.style.setProperty('--my', `${y}%`);
    });
  });
}

// ── Clock ─────────────────────────────────────────────────────
function initClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ── Logout confirmation ───────────────────────────────────────
function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Sign out of ROOT?')) {
        document.getElementById('logout-form').submit();
      }
    });
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initOceanCanvas();
  initNav();
  initToolCards();
  initClock();
  initLogout();
});
