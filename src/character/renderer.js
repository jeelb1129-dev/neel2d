/**
 * Neel2D Character Renderer
 *
 * Background removal: flood-fill from edges (never touches internal white like the shirt).
 * Animations: subtle breathing scale, gentle float, eye-blink overlay, tiny talking bob.
 */

export class CharacterRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = window.devicePixelRatio || 1;

        this.expression  = 'relaxed';
        this.isTalking   = false;

        // animation phases
        this.breathPhase = 0;
        this.floatPhase  = 0;
        this.talkPhase   = 0;

        // eye blink
        this.blinkProgress = 0;        // 0 = open, 1 = fully closed
        this.blinkTimer    = 2500 + Math.random() * 3500;
        this.blinking      = false;

        this.cleanCanvas  = null;
        this.imgW = 0;
        this.imgH = 0;

        const img = new Image();
        img.src = '/neel.png';
        img.onload = () => {
            this.imgW = img.width;
            this.imgH = img.height;
            this.cleanCanvas = this._removeBackground(img);
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Flood-fill background removal.
     * Starts from all 4 edges and removes only pixels that are connected
     * to the border AND near-white — so internal white (shirt, etc.) is safe.
     */
    _removeBackground(img) {
        const W  = img.width, H = img.height;
        const oc = document.createElement('canvas');
        oc.width = W; oc.height = H;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);

        const id = octx.getImageData(0, 0, W, H);
        const d  = id.data;

        const THRESH = 55; // strict: only clearly-white background pixels
        const THRESH2 = THRESH * THRESH;

        const isNearWhite = (pi) => {
            const b = pi * 4;
            const dr = 255 - d[b], dg = 255 - d[b+1], db = 255 - d[b+2];
            return dr*dr + dg*dg + db*db < THRESH2;
        };

        const visited = new Uint8Array(W * H); // 1 = queued/removed

        const queue = new Int32Array(W * H);
        let qHead = 0, qTail = 0;

        const enqueue = (pi) => {
            if (pi >= 0 && pi < W * H && !visited[pi] && isNearWhite(pi)) {
                visited[pi] = 1;
                queue[qTail++] = pi;
            }
        };

        // Seed from all 4 edges
        for (let x = 0; x < W; x++) { enqueue(x); enqueue((H-1)*W + x); }
        for (let y = 1; y < H-1; y++) { enqueue(y*W); enqueue(y*W + W-1); }

        // BFS
        while (qHead < qTail) {
            const pi = queue[qHead++];
            d[pi*4 + 3] = 0; // transparent
            const x = pi % W, y = (pi / W) | 0;
            if (x > 0)   enqueue(pi - 1);
            if (x < W-1) enqueue(pi + 1);
            if (y > 0)   enqueue(pi - W);
            if (y < H-1) enqueue(pi + W);
        }

        // Feather: soften pixels that sit right next to removed background
        for (let pi = 0; pi < W * H; pi++) {
            if (visited[pi] || d[pi*4+3] === 0) continue;
            const x = pi % W, y = (pi / W) | 0;
            const borderBg =
                (x > 0   && visited[pi-1]) ||
                (x < W-1 && visited[pi+1]) ||
                (y > 0   && visited[pi-W]) ||
                (y < H-1 && visited[pi+W]);
            if (borderBg) {
                const b = pi * 4;
                const dr = 255-d[b], dg = 255-d[b+1], db = 255-d[b+2];
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                if (dist < 90) d[b+3] = Math.round((dist / 90) * d[b+3]);
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
        this.breathPhase += dt * 0.0013;  // ~5 s cycle
        this.floatPhase  += dt * 0.0009;  // ~7 s cycle
        if (this.isTalking) this.talkPhase += dt * 0.007;

        // Eye blink
        this.blinkTimer -= dt;
        if (!this.blinking && this.blinkTimer <= 0) {
            this.blinking   = true;
            this.blinkTimer = 2500 + Math.random() * 4000;
        }
        if (this.blinking) {
            this.blinkProgress += dt * 0.010; // close speed
            if (this.blinkProgress >= 1) {
                this.blinkProgress = 1;
                this.blinking      = false;    // start opening
            }
        } else if (this.blinkProgress > 0) {
            this.blinkProgress -= dt * 0.012; // open speed (slightly faster)
            if (this.blinkProgress < 0) this.blinkProgress = 0;
        }
    }

    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);
        if (!this.cleanCanvas) return;

        const src = this.cleanCanvas;

        // Fit to canvas
        const maxH  = h * 0.80;
        const maxW  = w * 0.44;
        const scale = Math.min(maxH / src.height, maxW / src.width);
        const drawW = src.width  * scale;
        const drawH = src.height * scale;

        // Position: slightly left of centre
        const cx = w * 0.41;
        const cy = h * 0.50;

        // ── subtle animations ──────────────────────────────────────────────
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.010; // ±1 %
        const floatY      = Math.sin(this.floatPhase) * 3.5;         // ±3.5 px
        const talkBob     = this.isTalking
            ? Math.sin(this.talkPhase * 3) * 2.5   // ±2.5 px while speaking
            : 0;

        const finalScale = breathScale;
        const finalY     = floatY + talkBob;

        // Top-left corner of the drawn image in canvas space (used for blink overlay)
        const imgX = cx - (drawW * finalScale) / 2;
        const imgY = cy + finalY - (drawH * finalScale) / 2;
        const iW   = drawW * finalScale;
        const iH   = drawH * finalScale;

        // ── draw character ─────────────────────────────────────────────────
        ctx.save();
        ctx.translate(cx, cy + finalY);
        ctx.scale(finalScale, finalScale);
        ctx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // ── eye blink overlay ──────────────────────────────────────────────
        // Eyelid position is estimated as fractions of the drawn image size.
        // Tuned for neel.png (full-body portrait, head in top ~30%).
        if (this.blinkProgress > 0.01) {
            this._drawBlink(ctx, imgX, imgY, iW, iH, this.blinkProgress);
        }
    }

    /**
     * Draw skin-coloured eyelid strips that descend to cover the eyes.
     * Eye positions are expressed as fractions of the drawn image dimensions.
     */
    _drawBlink(ctx, imgX, imgY, iW, iH, p) {
        // Approximate eye metrics for neel.png
        // Tweak fy/fw/fh if the eyelids land in the wrong place.
        const eyes = [
            { fx: 0.355, fy: 0.210 },  // left eye centre
            { fx: 0.560, fy: 0.210 },  // right eye centre
        ];
        const eyeW = iW * 0.105;  // eye ellipse width
        const eyeH = iH * 0.028;  // eye ellipse half-height (open)

        ctx.save();
        // Use the skin tone that matches neel.png's face
        ctx.fillStyle = '#c48055';

        for (const eye of eyes) {
            const ex = imgX + eye.fx * iW;
            const ey = imgY + eye.fy * iH;

            // Upper lid sweeps down; lower lid sweeps up — meet in the middle
            const lidH = eyeH * p;

            ctx.beginPath();
            // Upper lid: rectangle + rounded bottom
            ctx.ellipse(ex, ey - eyeH + lidH, eyeW / 2, lidH + 1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lower lid (smaller, just closes the bottom gap)
            ctx.beginPath();
            ctx.ellipse(ex, ey + eyeH - lidH * 0.4, eyeW / 2, lidH * 0.4 + 1, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    render(timestamp) {
        const dt = this._lastTime ? Math.min(timestamp - this._lastTime, 50) : 16;
        this._lastTime = timestamp;
        this.update(dt);
        this.draw();
    }
}
