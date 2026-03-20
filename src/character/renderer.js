/**
 * Neel2D Character Renderer
 * Draws and animates an image-based character on canvas
 * - Removes white background via pixel manipulation
 * - Smooth floating, breathing, talking and expression animations
 */

export class CharacterRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.expression = 'relaxed';
        this.isTalking = false;
        this.talkPhase = 0;
        this.breathPhase = 0;
        this.floatPhase = 0;
        this.swayPhase = 0;
        this.expressionPhase = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.cleanCanvas = null; // bg-removed offscreen canvas

        const img = new Image();
        img.src = '/neel.png';
        img.onload = () => {
            this.cleanCanvas = this._removeBackground(img);
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // Strip white/near-white background pixels, feather edges
    _removeBackground(img) {
        const oc = document.createElement('canvas');
        oc.width = img.width;
        oc.height = img.height;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);

        const imageData = octx.getImageData(0, 0, oc.width, oc.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            // Distance from white (255,255,255)
            const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
            if (dist < 80) {
                // Fully transparent for near-white, feather the edge
                d[i + 3] = Math.round((dist / 80) * d[i + 3]);
            }
        }

        octx.putImageData(imageData, 0, 0);
        return oc;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.w = rect.width;
        this.h = rect.height;
    }

    setExpression(expr) {
        this.expression = expr;
        this.expressionPhase = 0;
    }

    setTalking(val) {
        this.isTalking = val;
        if (val) this.talkPhase = 0;
    }

    update(dt) {
        this.time += dt;
        // Slow breath cycle ~4s
        this.breathPhase += dt * 0.00157;
        // Gentle float ~6s cycle
        this.floatPhase += dt * 0.00105;
        // Subtle sway ~8s cycle
        this.swayPhase += dt * 0.00078;
        // Expression transient
        this.expressionPhase += dt * 0.003;

        if (this.isTalking) {
            // Faster talk cycle
            this.talkPhase += dt * 0.008;
        }
    }

    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);
        if (!this.cleanCanvas) return;

        const src = this.cleanCanvas;

        // Position: left-centre leaving room for chat panel on right
        const cx = w * 0.42;
        const cy = h * 0.52;

        // --- Floating / idle ---
        const floatY = Math.sin(this.floatPhase) * 10;
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.018;
        const sway = Math.sin(this.swayPhase) * 3;

        // --- Talking ---
        let talkBob = 0, talkSway = 0, talkPulse = 1;
        if (this.isTalking) {
            talkBob = Math.sin(this.talkPhase * 4) * 7;
            talkSway = Math.sin(this.talkPhase * 3) * 4;
            talkPulse = 1 + Math.abs(Math.sin(this.talkPhase * 4)) * 0.025;
        }

        // --- Expression modifiers ---
        let exprY = 0, exprRotate = 0, exprScale = 1;
        const ep = this.expressionPhase;
        switch (this.expression) {
            case 'happy':
            case 'excited':
                // Energetic bounce
                exprY = Math.sin(ep * 3) * 8 * Math.exp(-ep * 0.4);
                exprScale = 1 + Math.abs(Math.sin(ep * 3)) * 0.03 * Math.exp(-ep * 0.4);
                break;
            case 'sad':
                // Slow droop
                exprY = Math.min(ep * 4, 12);
                exprRotate = Math.min(ep * 0.5, 3) * (Math.PI / 180);
                break;
            case 'surprised':
                // Quick jump back
                exprY = -Math.abs(Math.sin(ep * 2)) * 14 * Math.exp(-ep * 0.6);
                exprScale = 1 + Math.abs(Math.sin(ep * 2)) * 0.05 * Math.exp(-ep * 0.6);
                break;
            case 'thinking':
                // Slight tilt
                exprRotate = Math.sin(ep * 0.5) * 3 * Math.PI / 180;
                break;
        }

        const totalY = floatY + talkBob + exprY;
        const totalX = sway + talkSway;
        const totalScale = breathScale * talkPulse * exprScale;

        // Fit character: ~80% of viewport height, max 45% width
        const maxH = h * 0.80;
        const maxW = w * 0.45;
        const scale = Math.min(maxH / src.height, maxW / src.width) * totalScale;

        const drawW = src.width * scale;
        const drawH = src.height * scale;

        ctx.save();
        ctx.translate(cx + totalX, cy + totalY);
        if (exprRotate) ctx.rotate(exprRotate);

        // Drop shadow so character feels grounded in the scene
        ctx.shadowColor = 'rgba(124, 92, 252, 0.25)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        ctx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH);

        // Extra glow for excited/happy
        if (this.expression === 'excited' || this.expression === 'happy') {
            ctx.globalAlpha = 0.12 + Math.sin(ep * 4) * 0.06;
            ctx.shadowColor = 'rgba(232, 121, 249, 0.6)';
            ctx.shadowBlur = 60;
            ctx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.globalAlpha = 1;
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
