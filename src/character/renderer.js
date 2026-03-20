/**
 * Neel2D Character Renderer
 *
 * - Flood-fill background removal (never eats into shirt/skin)
 * - Subtle breathing scale + gentle float (whole image, very calm)
 * - Eye blink overlay positioned precisely on neel.png's eye area
 * - Mouth open/close overlay when talking (no whole-image bobbing)
 */

// ── Measured from neel.png (fractions of image dimensions) ───────────────────

// Eye centres
const L_EYE = { fx: 0.375, fy: 0.163 };
const R_EYE = { fx: 0.555, fy: 0.163 };
const EYE_RX = 0.048;   // half-width  as fraction of image width
const EYE_RY = 0.014;   // half-height as fraction of image height
const SKIN   = '#c48558'; // face skin colour for eyelids

// Mouth centre
const MOUTH   = { fx: 0.468, fy: 0.234 };
const MOUTH_RX = 0.052;   // half-width  as fraction of image width
const MOUTH_RY = 0.018;   // max half-height when fully open

// ─────────────────────────────────────────────────────────────────────────────

export class CharacterRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = window.devicePixelRatio || 1;

        this.expression  = 'relaxed';
        this.isTalking   = false;

        // breathing / float
        this.breathPhase = 0;
        this.floatPhase  = 0;

        // mouth
        this.talkPhase  = 0;
        this.mouthOpen  = 0;  // 0–1

        // eye blink
        this.blinkProgress = 0;
        this.blinkClosing  = false;
        this.blinkTimer    = 2000 + Math.random() * 3000;

        this.cleanCanvas = null;

        const img = new Image();
        img.src = '/neel.png';
        img.onload = () => { this.cleanCanvas = this._removeBackground(img); };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /** Flood-fill background removal — safe for internal white areas. */
    _removeBackground(img) {
        const W = img.width, H = img.height;
        const oc = document.createElement('canvas');
        oc.width = W; oc.height = H;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);

        const id = octx.getImageData(0, 0, W, H);
        const d  = id.data;
        const T2 = 55 * 55;  // strict near-white threshold

        const isNearWhite = (pi) => {
            const b = pi * 4;
            const dr = 255-d[b], dg = 255-d[b+1], db = 255-d[b+2];
            return dr*dr + dg*dg + db*db < T2;
        };

        const visited = new Uint8Array(W * H);
        const queue   = new Int32Array(W * H);
        let qHead = 0, qTail = 0;

        const enqueue = (pi) => {
            if (pi >= 0 && pi < W*H && !visited[pi] && isNearWhite(pi)) {
                visited[pi] = 1;
                queue[qTail++] = pi;
            }
        };

        // Seed all 4 edges
        for (let x = 0; x < W; x++) { enqueue(x); enqueue((H-1)*W+x); }
        for (let y = 1; y < H-1; y++) { enqueue(y*W); enqueue(y*W+W-1); }

        // BFS
        while (qHead < qTail) {
            const pi = queue[qHead++];
            d[pi*4+3] = 0;
            const x = pi%W, y = (pi/W)|0;
            if (x>0)   enqueue(pi-1);
            if (x<W-1) enqueue(pi+1);
            if (y>0)   enqueue(pi-W);
            if (y<H-1) enqueue(pi+W);
        }

        // Feather pixels adjacent to removed background
        for (let pi = 0; pi < W*H; pi++) {
            if (visited[pi] || d[pi*4+3] === 0) continue;
            const x = pi%W, y = (pi/W)|0;
            if ((x>0 && visited[pi-1]) || (x<W-1 && visited[pi+1]) ||
                (y>0 && visited[pi-W]) || (y<H-1 && visited[pi+W])) {
                const b  = pi*4;
                const dr = 255-d[b], dg = 255-d[b+1], db = 255-d[b+2];
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                if (dist < 85) d[b+3] = Math.round((dist/85) * d[b+3]);
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
        // Slow, calm breathing + float — no talking bob on whole image
        this.breathPhase += dt * 0.0013;   // ~5 s cycle
        this.floatPhase  += dt * 0.0009;   // ~7 s cycle

        // Mouth open/close (smooth, only amplitude changes)
        if (this.isTalking) {
            this.talkPhase += dt * 0.008;
            const target = (Math.sin(this.talkPhase * 3) * 0.5 + 0.5) * 0.85;
            this.mouthOpen += (target - this.mouthOpen) * 0.25;
        } else {
            this.mouthOpen += (0 - this.mouthOpen) * 0.20;
            this.talkPhase  = 0;
        }

        // Eye blink
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0 && !this.blinkClosing && this.blinkProgress === 0) {
            this.blinkClosing = true;
            this.blinkTimer   = 2500 + Math.random() * 4000;
        }
        if (this.blinkClosing) {
            this.blinkProgress += dt * 0.009;
            if (this.blinkProgress >= 1) { this.blinkProgress = 1; this.blinkClosing = false; }
        } else if (this.blinkProgress > 0) {
            this.blinkProgress -= dt * 0.011;
            if (this.blinkProgress < 0) this.blinkProgress = 0;
        }
    }

    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);
        if (!this.cleanCanvas) return;

        const src = this.cleanCanvas;

        // Scale to fit — leave room for chat panel on the right
        const maxH  = h * 0.80;
        const maxW  = w * 0.44;
        const scale = Math.min(maxH / src.height, maxW / src.width);
        const drawW = src.width  * scale;
        const drawH = src.height * scale;

        const cx = w * 0.41;
        const cy = h * 0.50;

        // Gentle breathing (scale only) and float (translate Y)
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.010;
        const floatY      = Math.sin(this.floatPhase) * 3.5;

        // Final image size after breath scale
        const fW = drawW * breathScale;
        const fH = drawH * breathScale;
        // Top-left of drawn image in canvas coords (needed for overlays)
        const imgX = cx - fW / 2;
        const imgY = cy + floatY - fH / 2;

        // ── draw background-removed character ─────────────────────────────
        ctx.save();
        ctx.translate(cx, cy + floatY);
        ctx.scale(breathScale, breathScale);
        ctx.drawImage(src, -drawW/2, -drawH/2, drawW, drawH);
        ctx.restore();

        // ── mouth overlay ─────────────────────────────────────────────────
        if (this.mouthOpen > 0.01) {
            const mx  = imgX + MOUTH.fx * fW;
            const my  = imgY + MOUTH.fy * fH;
            const rx  = MOUTH_RX * fW;
            const ryO = MOUTH_RY * fH * this.mouthOpen; // open height

            // Dark interior
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(mx, my, rx, Math.max(ryO, 1), 0, 0, Math.PI * 2);
            ctx.fillStyle = '#2a0e06';
            ctx.fill();

            // Upper lip line (covers the original smile line)
            ctx.beginPath();
            ctx.ellipse(mx, my - ryO * 0.4, rx * 1.05, ryO * 0.35 + 1, 0, Math.PI, Math.PI * 2);
            ctx.fillStyle = '#8b4a2a';
            ctx.fill();

            // Lower lip
            ctx.beginPath();
            ctx.ellipse(mx, my + ryO * 0.5, rx * 0.95, ryO * 0.30 + 1, 0, 0, Math.PI);
            ctx.fillStyle = '#8b4a2a';
            ctx.fill();
            ctx.restore();
        }

        // ── eye blink overlay ─────────────────────────────────────────────
        if (this.blinkProgress > 0.01) {
            const p = this.blinkProgress;
            ctx.save();
            ctx.fillStyle = SKIN;

            for (const eye of [L_EYE, R_EYE]) {
                const ex  = imgX + eye.fx * fW;
                const ey  = imgY + eye.fy * fH;
                const rx  = EYE_RX * fW;
                const ryF = EYE_RY * fH;  // full open half-height

                // Upper lid sweeps down
                ctx.beginPath();
                ctx.ellipse(ex, ey - ryF + ryF * p, rx, ryF * p + 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Lower lid sweeps up
                ctx.beginPath();
                ctx.ellipse(ex, ey + ryF - ryF * p * 0.5, rx, ryF * p * 0.5 + 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    render(timestamp) {
        const dt = this._lastTime ? Math.min(timestamp - this._lastTime, 50) : 16;
        this._lastTime = timestamp;
        this.update(dt);
        this.draw();
    }
}
