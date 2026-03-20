/**
 * Neel2D Character Renderer
 * Draws and animates an image-based character on canvas
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
        this.dpr = window.devicePixelRatio || 1;
        this.image = new Image();
        this.imageLoaded = false;

        // Load the custom neel.png image
        this.image.src = '/neel.png';
        this.image.onload = () => {
            this.imageLoaded = true;
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
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

    setExpression(name) {
        this.expression = name;
    }

    setTalking(val) {
        this.isTalking = val;
    }

    update(dt) {
        this.time += dt;
        this.breathPhase += dt * 0.002;

        if (this.isTalking) {
            this.talkPhase += dt * 0.012;
        }
    }

    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);

        if (!this.imageLoaded) return;

        // Center the image with room for the chat panel
        const cx = w * 0.45;
        const cy = h * 0.5;

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Idle breathing animation (slight vertical scale stretch and Y shift)
        const breathY = Math.sin(this.breathPhase) * 4;
        const breathScale = 1 + (Math.sin(this.breathPhase) * 0.015);

        // 2. Speaking animation (bounce effect + slight horizontal scale)
        let talkBob = 0;
        let talkStretchX = 1;
        let talkStretchY = 1;

        if (this.isTalking) {
            // Rapid bobbing
            talkBob = Math.sin(this.talkPhase) * 2;
            // Slight squish effect
            talkStretchX = 1 + (Math.sin(this.talkPhase * 2) * 0.01);
            talkStretchY = 1 + (Math.cos(this.talkPhase * 2) * 0.01);
        }

        // Combine transformations
        ctx.translate(0, breathY + talkBob);

        // Scale image to fit the container reasonably
        const maxImgHeight = h * 0.8;
        const maxImgWidth = w * 0.5;

        const scaleFactor = Math.min(
            maxImgHeight / this.image.height,
            maxImgWidth / this.image.width
        );

        // Apply scaling (base + breath + talking)
        ctx.scale(
            scaleFactor * talkStretchX,
            scaleFactor * breathScale * talkStretchY
        );

        // Draw image centered
        ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2
        );

        ctx.restore();
    }

    render(timestamp) {
        const dt = this._lastTime ? timestamp - this._lastTime : 16;
        this._lastTime = timestamp;

        this.update(dt);
        this.draw();
    }
}
