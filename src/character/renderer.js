/**
 * Neel2D Character Renderer
 * Uses neel.png with white background removed.
 * Animations are intentionally subtle: gentle breath, soft float, light talking bob.
 */

export class CharacterRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = window.devicePixelRatio || 1;

        this.expression  = 'relaxed';
        this.isTalking   = false;
        this.breathPhase = 0;
        this.floatPhase  = 0;
        this.talkPhase   = 0;
        this.cleanCanvas = null;

        const img = new Image();
        img.src = '/neel.png';
        img.onload = () => { this.cleanCanvas = this._removeBackground(img); };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /** Remove white/near-white background, feather edges. */
    _removeBackground(img) {
        const oc   = document.createElement('canvas');
        oc.width   = img.width;
        oc.height  = img.height;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);

        const id = octx.getImageData(0, 0, oc.width, oc.height);
        const d  = id.data;

        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            // Euclidean distance from white (255,255,255)
            const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
            if (dist < 60) {
                // Feather: pixels very close to white become fully transparent;
                // edge pixels fade proportionally
                d[i + 3] = Math.round((dist / 60) * d[i + 3]);
            }
        }

        octx.putImageData(id, 0, 0);
        return oc;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width  = rect.width  * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width  = rect.width  + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.w = rect.width;
        this.h = rect.height;
    }

    setExpression(name) { this.expression = name; }
    setTalking(val)      { this.isTalking  = val; }

    update(dt) {
        // Very slow cycles so movement feels calm, not jittery
        this.breathPhase += dt * 0.0012;   // ~5 s cycle
        this.floatPhase  += dt * 0.0008;   // ~8 s cycle
        if (this.isTalking) this.talkPhase += dt * 0.006; // gentle talk bob
    }

    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);
        if (!this.cleanCanvas) return;

        const src = this.cleanCanvas;

        // Fit character: up to 80 % of viewport height, max 45 % width
        const maxH  = h * 0.80;
        const maxW  = w * 0.45;
        const scale = Math.min(maxH / src.height, maxW / src.width);

        const drawW = src.width  * scale;
        const drawH = src.height * scale;

        // Centre slightly left to leave room for the chat panel
        const cx = w * 0.42;
        const cy = h * 0.50;

        // ── subtle animations ──────────────────────────────────────────────
        // Breathing: very slight scale pulse (±1.2 %)
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.012;

        // Float: slow vertical drift (±4 px)
        const floatY = Math.sin(this.floatPhase) * 4;

        // Talking: tiny vertical bob (±3 px), only while speaking
        const talkBob = this.isTalking
            ? Math.sin(this.talkPhase * 3) * 3
            : 0;

        const totalScale = breathScale;
        const totalY     = floatY + talkBob;

        // ── draw ───────────────────────────────────────────────────────────
        ctx.save();
        ctx.translate(cx, cy + totalY);
        ctx.scale(totalScale, totalScale);

        // Soft purple drop-shadow so the figure blends into the dark background
        ctx.shadowColor   = 'rgba(100, 80, 180, 0.20)';
        ctx.shadowBlur    = 30;
        ctx.shadowOffsetY = 14;

        ctx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH);

        ctx.restore();
    }

    render(timestamp) {
        const dt = this._lastTime ? Math.min(timestamp - this._lastTime, 50) : 16;
        this._lastTime = timestamp;
        this.update(dt);
        this.draw();
    }
}
