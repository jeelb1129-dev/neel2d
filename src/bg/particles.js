/**
 * Background floating particles effect
 */

export function initParticles(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let w, h;
    const particles = [];

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const count = Math.min(60, Math.floor((w * h) / 15000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 2.5 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.2 - 0.1,
            opacity: Math.random() * 0.4 + 0.1,
            hue: Math.random() > 0.5 ? 260 : 280, // purple tones
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.02 + 0.005,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Draw subtle gradient background
        const bgGrad = ctx.createRadialGradient(w * 0.4, h * 0.4, 0, w * 0.4, h * 0.4, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, 'rgba(30, 15, 60, 0.3)');
        bgGrad.addColorStop(0.5, 'rgba(15, 10, 35, 0.15)');
        bgGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        for (const p of particles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += p.pulseSpeed;

            // Wrap around
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;

            const pulsedOpacity = p.opacity * (0.6 + Math.sin(p.pulse) * 0.4);
            const pulsedSize = p.size * (0.8 + Math.sin(p.pulse) * 0.2);

            // Glow
            ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${pulsedOpacity * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulsedSize * 3, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${pulsedOpacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulsedSize, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    draw();
}
