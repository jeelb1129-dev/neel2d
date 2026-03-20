/**
 * Neel2D — Programmatic 2D Puppet Renderer
 * Draws Neel as canvas shapes (no image) with full animation:
 *   idle breathing, eye blink, walk cycle, talking mouth, expression reactions
 */

// ── Colour palette (matches neel.png style) ───────────────────────────────────
const C = {
    skin:       '#c8855a',
    skinShade:  '#a06848',
    skinDark:   '#8a5535',
    hair:       '#1a140e',
    hairHi:     '#2e2418',
    suit:       '#1c1c2e',
    suitHi:     '#2c2c48',
    shirt:      '#d4d4e0',
    shirtShade: '#a8a8c0',
    tie:        '#4d88cc',
    tieDark:    '#2a5a99',
    pants:      '#181828',
    pantsHi:    '#222238',
    shoe:       '#0d0d18',
    shoeHi:     '#1c1c2c',
    glassFrame: '#1a1a1a',
    glassLens:  'rgba(80, 110, 160, 0.30)',
};

export class CharacterRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = window.devicePixelRatio || 1;

        // ── animation state ──
        this.expression    = 'relaxed';
        this.isTalking     = false;

        this.idlePhase     = 0;
        this.breathPhase   = 0;
        this.walkPhase     = 0;
        this.talkPhase     = 0;
        this.exprPhase     = 0;

        this.mouthOpen     = 0;   // 0-1
        this.eyeOpen       = 1;   // 0-1
        this.blinkTimer    = 2000 + Math.random() * 3000;
        this.isWalking     = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
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

    setExpression(expr) {
        this.expression = expr;
        this.exprPhase  = 0;
        this.isWalking  = (expr === 'excited' || expr === 'happy');
    }

    setTalking(val) {
        this.isTalking = val;
        if (val) this.talkPhase = 0;
    }

    // ── update ────────────────────────────────────────────────────────────────
    update(dt) {
        this.idlePhase   += dt * 0.0008;
        this.breathPhase += dt * 0.0016;
        this.exprPhase   += dt * 0.003;

        // walk / talk arm-swing
        const walkSpeed = this.isWalking ? 0.006 : (this.isTalking ? 0.0035 : 0);
        if (walkSpeed > 0) {
            this.walkPhase += dt * walkSpeed;
        } else {
            this.walkPhase *= 0.92; // ease to rest
        }

        // mouth
        if (this.isTalking) {
            this.talkPhase += dt * 0.013;
            this.mouthOpen  = (Math.sin(this.talkPhase * 3.5) * 0.5 + 0.5) * 0.85;
        } else {
            this.mouthOpen += (0 - this.mouthOpen) * 0.18;
            this.talkPhase  = 0;
        }

        // blink
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.blinkTimer = 2500 + Math.random() * 4000;
            this.eyeOpen    = 0;
        }
        if (this.eyeOpen < 1) this.eyeOpen = Math.min(1, this.eyeOpen + dt * 0.018);
    }

    // ── master draw ───────────────────────────────────────────────────────────
    draw() {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);

        // feet baseline ~ 88% down, centre at ~42% across (leaves room for chat panel)
        const cx    = w * 0.40;
        const baseY = h * 0.88;

        // scale so character fills ~78% of viewport height; cap width to 42%
        const CHAR_H = 430;
        const CHAR_W = 110;
        const scale  = Math.min((h * 0.78) / CHAR_H, (w * 0.42) / CHAR_W);

        // ── idle body offsets ──
        const breathY = Math.sin(this.breathPhase) * 3;
        const sway    = Math.sin(this.idlePhase)   * 2.5;

        // walk bounce
        const walkBounce = this.isWalking
            ? -Math.abs(Math.sin(this.walkPhase * 2)) * 6
            : 0;

        // expression body mod
        let exprY = 0, exprScale = 1;
        const ep = this.exprPhase;
        switch (this.expression) {
            case 'happy':
            case 'excited':
                exprY     = -Math.abs(Math.sin(ep * 4)) * 14 * Math.exp(-ep * 0.25);
                exprScale =  1 + Math.abs(Math.sin(ep * 4)) * 0.04 * Math.exp(-ep * 0.25);
                break;
            case 'sad':
                exprY = Math.min(ep * 6, 10);
                break;
            case 'surprised':
                exprY = -Math.min(ep * 20, 18) * Math.exp(-ep * 0.9);
                break;
        }

        ctx.save();
        ctx.translate(cx + sway, baseY + breathY + walkBounce + exprY);
        ctx.scale(scale * exprScale, scale * exprScale);

        // talk bob
        if (this.isTalking) {
            const bob = Math.sin(this.talkPhase * 2) * 3;
            ctx.translate(Math.sin(this.talkPhase * 1.5) * 2, bob);
        }

        // ── walk angles ──
        const ws  = Math.sin(this.walkPhase);
        const lLA = ws  * 0.38;   // left leg angle
        const rLA = -ws * 0.38;   // right leg angle
        const lAA = -ws * 0.30;   // left arm angle
        const rAA = ws  * 0.30;   // right arm angle

        // ── draw order: back-leg → back-arm → torso → front-leg → front-arm → head ──
        this._drawGroundShadow(ctx);

        if (ws >= 0) {
            this._drawLeg(ctx,  1, rLA);   // right leg (back)
            this._drawArm(ctx, -1, lAA);   // left arm  (back)
        } else {
            this._drawLeg(ctx, -1, lLA);   // left leg  (back)
            this._drawArm(ctx,  1, rAA);   // right arm (back)
        }

        this._drawTorso(ctx);

        if (ws >= 0) {
            this._drawLeg(ctx, -1, lLA);   // left leg  (front)
            this._drawArm(ctx,  1, rAA);   // right arm (front)
        } else {
            this._drawLeg(ctx,  1, rLA);   // right leg (front)
            this._drawArm(ctx, -1, lAA);   // left arm  (back)
        }

        this._drawHead(ctx);

        ctx.restore();
    }

    // ── ground shadow ─────────────────────────────────────────────────────────
    _drawGroundShadow(ctx) {
        ctx.save();
        ctx.scale(1, 0.28);
        const g = ctx.createRadialGradient(0, 0, 5, 0, 0, 65);
        g.addColorStop(0, 'rgba(100, 80, 200, 0.38)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, 65, 65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── leg ───────────────────────────────────────────────────────────────────
    // side: -1 = character's left (viewer's right), 1 = character's right
    _drawLeg(ctx, side, angle) {
        const ox = side * 20;
        ctx.save();
        ctx.translate(ox, -100);
        ctx.rotate(angle);

        // upper leg
        this._rr(ctx, -13, 0, 26, 88, 10);
        ctx.fillStyle = C.pants;
        ctx.fill();

        // crease line
        ctx.beginPath();
        ctx.moveTo(0, 8); ctx.lineTo(0, 80);
        ctx.strokeStyle = C.pantsHi; ctx.lineWidth = 1.5; ctx.stroke();

        // lower leg (slight knee bend opposing hip angle)
        ctx.save();
        ctx.translate(0, 88);
        ctx.rotate(-angle * 0.25);

        this._rr(ctx, -11, 0, 22, 72, 7);
        ctx.fillStyle = C.pants;
        ctx.fill();

        // shoe
        ctx.save();
        ctx.translate(0, 72);

        ctx.beginPath();
        ctx.ellipse(0, 5, 12, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.shoe; ctx.fill();

        ctx.beginPath();
        ctx.ellipse(side * 9, 8, 20, 10, 0.12 * side, 0, Math.PI * 2);
        ctx.fillStyle = C.shoe; ctx.fill();

        ctx.beginPath();
        ctx.ellipse(side * 6, 3, 9, 5, 0.12 * side, 0, Math.PI);
        ctx.fillStyle = C.shoeHi; ctx.fill();

        ctx.restore();
        ctx.restore();
        ctx.restore();
    }

    // ── torso ─────────────────────────────────────────────────────────────────
    _drawTorso(ctx) {
        // belt
        this._rr(ctx, -24, -112, 48, 11, 3);
        ctx.fillStyle = '#111'; ctx.fill();
        ctx.beginPath();
        ctx.rect(-5, -113, 10, 9);
        ctx.fillStyle = '#999'; ctx.fill();

        // jacket body
        ctx.beginPath();
        ctx.moveTo(-48, -105);
        ctx.lineTo(-50, -255);
        ctx.bezierCurveTo(-50, -268, -38, -278, -16, -280);
        ctx.lineTo(0,  -272);
        ctx.lineTo(16, -280);
        ctx.bezierCurveTo(38, -278, 50, -268, 50, -255);
        ctx.lineTo(48, -105);
        ctx.closePath();
        ctx.fillStyle = C.suit; ctx.fill();

        // jacket highlight (left side)
        ctx.beginPath();
        ctx.moveTo(-48, -105);
        ctx.lineTo(-50, -255);
        ctx.lineTo(-35, -260);
        ctx.lineTo(-33, -108);
        ctx.closePath();
        ctx.fillStyle = C.suitHi; ctx.fill();

        // shirt front
        ctx.beginPath();
        ctx.moveTo(-14, -280);
        ctx.lineTo(-5,  -270);
        ctx.lineTo(0,   -190);
        ctx.lineTo(5,   -270);
        ctx.lineTo(14,  -280);
        ctx.closePath();
        ctx.fillStyle = C.shirt; ctx.fill();

        // left lapel
        ctx.beginPath();
        ctx.moveTo(-5,  -270);
        ctx.lineTo(-28, -245);
        ctx.lineTo(-18, -195);
        ctx.lineTo(0,   -190);
        ctx.closePath();
        ctx.fillStyle = C.suitHi; ctx.fill();

        // right lapel
        ctx.beginPath();
        ctx.moveTo(5,   -270);
        ctx.lineTo(28,  -245);
        ctx.lineTo(18,  -195);
        ctx.lineTo(0,   -190);
        ctx.closePath();
        ctx.fillStyle = C.suitHi; ctx.fill();

        // tie
        ctx.beginPath();
        ctx.moveTo(-5,  -270);
        ctx.lineTo(5,   -270);
        ctx.lineTo(7,   -230);
        ctx.lineTo(4,   -190);
        ctx.lineTo(0,   -182);
        ctx.lineTo(-4,  -190);
        ctx.lineTo(-7,  -230);
        ctx.closePath();
        ctx.fillStyle = C.tie; ctx.fill();

        // tie knot
        ctx.beginPath();
        ctx.moveTo(-5, -270);
        ctx.lineTo(5,  -270);
        ctx.lineTo(3,  -259);
        ctx.lineTo(0,  -255);
        ctx.lineTo(-3, -259);
        ctx.closePath();
        ctx.fillStyle = C.tieDark; ctx.fill();

        // pocket square
        ctx.beginPath();
        ctx.rect(-40, -242, 16, 11);
        ctx.fillStyle = C.shirt; ctx.fill();
        ctx.strokeStyle = C.shirtShade; ctx.lineWidth = 0.8; ctx.stroke();

        // buttons
        [-155, -173].forEach(by => {
            ctx.beginPath();
            ctx.arc(0, by, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = C.suitHi; ctx.fill();
        });
    }

    // ── arm ───────────────────────────────────────────────────────────────────
    // side: -1 = character left, 1 = character right
    _drawArm(ctx, side, angle) {
        const sx = side * 50;
        ctx.save();
        ctx.translate(sx, -258);
        ctx.rotate(angle);

        // upper arm
        const ax = side === -1 ? -24 : -2;
        this._rr(ctx, ax, 0, 26, 78, 10);
        ctx.fillStyle = C.suit; ctx.fill();

        // forearm pivot at elbow
        ctx.save();
        ctx.translate(side * 12, 78);
        ctx.rotate(angle * 0.45);

        this._rr(ctx, -11, 0, 22, 63, 7);
        ctx.fillStyle = C.suit; ctx.fill();

        // shirt cuff
        ctx.beginPath();
        ctx.rect(-11, 53, 22, 11);
        ctx.fillStyle = C.shirt; ctx.fill();

        // hand
        ctx.save();
        ctx.translate(0, 68);

        ctx.beginPath();
        ctx.ellipse(0, 8, 10, 13, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.skin; ctx.fill();

        // fingers (rounded top bump)
        ctx.beginPath();
        ctx.ellipse(0, 1, 9, 5, 0, Math.PI, Math.PI * 2);
        ctx.fillStyle = C.skin; ctx.fill();

        // thumb
        ctx.beginPath();
        ctx.ellipse(side * 9, 6, 5, 7, side * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = C.skin; ctx.fill();

        // knuckle lines
        [-4, 0, 4].forEach(kx => {
            ctx.beginPath();
            ctx.moveTo(kx, -2); ctx.lineTo(kx, 4);
            ctx.strokeStyle = C.skinShade; ctx.lineWidth = 0.8; ctx.stroke();
        });

        ctx.restore();
        ctx.restore();
        ctx.restore();
    }

    // ── head ──────────────────────────────────────────────────────────────────
    _drawHead(ctx) {
        const isSad = this.expression === 'sad';
        const isSurprised = this.expression === 'surprised';

        // neck
        ctx.beginPath();
        ctx.rect(-10, -318, 20, 38);
        ctx.fillStyle = C.skin; ctx.fill();

        // collar
        ctx.beginPath();
        ctx.moveTo(-17, -283); ctx.lineTo(-10, -315);
        ctx.lineTo(0, -308);   ctx.lineTo(10, -315);
        ctx.lineTo(17, -283);
        ctx.strokeStyle = C.shirt; ctx.lineWidth = 3; ctx.stroke();

        // head shape (slightly wider at jaw)
        ctx.beginPath();
        ctx.moveTo(-38, -320);
        ctx.bezierCurveTo(-52, -340, -54, -390, -42, -415);
        ctx.bezierCurveTo(-30, -435,  30, -435,  42, -415);
        ctx.bezierCurveTo( 54, -390,  52, -340,  38, -320);
        ctx.bezierCurveTo( 22, -305,  -22,-305, -38, -320);
        ctx.closePath();
        ctx.fillStyle = C.skin; ctx.fill();

        // face shading (cheeks)
        [-1, 1].forEach(s => {
            const g = ctx.createRadialGradient(s * 28, -345, 2, s * 28, -345, 20);
            g.addColorStop(0, 'rgba(200, 100, 80, 0.18)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(s * 28, -345, 20, 14, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── hair ──
        // sides and back
        ctx.beginPath();
        ctx.moveTo(-42, -415);
        ctx.bezierCurveTo(-55, -430, -52, -460, -28, -460);
        ctx.bezierCurveTo(-10, -462, 10, -462, 28, -460);
        ctx.bezierCurveTo(52, -460, 55, -430, 42, -415);
        ctx.bezierCurveTo(30, -435, -30, -435, -42, -415);
        ctx.fillStyle = C.hair; ctx.fill();

        // top swept hair
        ctx.beginPath();
        ctx.moveTo(-38, -415);
        ctx.bezierCurveTo(-42, -445, -20, -462, 0, -460);
        ctx.bezierCurveTo(20, -458, 40, -445, 38, -415);
        ctx.bezierCurveTo(20, -432, -20, -432, -38, -415);
        ctx.fillStyle = C.hair; ctx.fill();

        // hair highlight
        ctx.beginPath();
        ctx.moveTo(-12, -458); ctx.bezierCurveTo(-2, -465, 12, -460, 18, -450);
        ctx.strokeStyle = C.hairHi; ctx.lineWidth = 3; ctx.stroke();

        // ── ears ──
        [-1, 1].forEach(s => {
            ctx.beginPath();
            ctx.ellipse(s * 54, -368, 8, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = C.skin; ctx.fill();
            ctx.beginPath();
            ctx.ellipse(s * 54, -368, 4, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = C.skinShade; ctx.fill();
        });

        // ── eyebrows ──
        const browRaise = isSurprised ? -10 : (isSad ? 5 : 0);
        const browTilt  = isSad ? 4 : 0; // inner brow up for sad

        [-1, 1].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s * 30, -398 + browRaise + s * browTilt);
            ctx.quadraticCurveTo(s * 18, -403 + browRaise + s * browTilt - 5, s * 6, -398 + browRaise);
            ctx.strokeStyle = C.hair; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
        });

        // ── eyes ──
        const ey = -378;
        const eo = this.eyeOpen;

        [-1, 1].forEach(s => {
            const ex = s * 19;

            // white
            ctx.beginPath();
            ctx.ellipse(ex, ey, 12, 9 * eo, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill();

            if (eo > 0.1) {
                // iris
                ctx.beginPath();
                ctx.ellipse(ex, ey, 6.5, 7.5 * eo, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#3a2010'; ctx.fill();

                // pupil
                ctx.beginPath();
                ctx.ellipse(ex, ey, 3.5, 4.5 * eo, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#0e0a06'; ctx.fill();

                // shine
                ctx.beginPath();
                ctx.ellipse(ex + 3, ey - 3, 2.2, 2.2, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
            }

            // upper eyelid
            ctx.beginPath();
            ctx.ellipse(ex, ey - 7.5 * eo, 12, 5, 0, Math.PI, Math.PI * 2);
            ctx.fillStyle = C.skin; ctx.fill();

            // lashes
            ctx.beginPath();
            ctx.ellipse(ex, ey - 8 * eo, 12, 4.5, 0, Math.PI, Math.PI * 2);
            ctx.strokeStyle = C.hair; ctx.lineWidth = 2; ctx.stroke();
        });

        // ── nose ──
        ctx.beginPath();
        ctx.moveTo(0, -362);
        ctx.quadraticCurveTo(-8, -348, -7, -344);
        ctx.quadraticCurveTo(-3, -341, 0, -342);
        ctx.quadraticCurveTo(3, -341, 7, -344);
        ctx.quadraticCurveTo(8, -348, 0, -362);
        ctx.strokeStyle = C.skinShade; ctx.lineWidth = 1.8; ctx.stroke();

        // nostrils
        [-5, 5].forEach(nx => {
            ctx.beginPath();
            ctx.ellipse(nx, -343, 3, 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = C.skinDark; ctx.fill();
        });

        // ── mouth ──
        const my = -329;
        const mo = this.mouthOpen;

        // lip line / smile
        ctx.beginPath();
        ctx.moveTo(-14, my);
        ctx.quadraticCurveTo(0, my + 8 + mo * 3, 14, my);
        ctx.strokeStyle = C.skinDark; ctx.lineWidth = 2; ctx.stroke();

        if (mo > 0.04) {
            // open mouth
            ctx.beginPath();
            ctx.moveTo(-12, my + 2);
            ctx.bezierCurveTo(-12, my + 2 + mo * 18, 12, my + 2 + mo * 18, 12, my + 2);
            ctx.fillStyle = '#1a0805'; ctx.fill();

            // upper teeth
            ctx.beginPath();
            ctx.rect(-9, my + 2, 18, Math.min(mo * 10, 8));
            ctx.fillStyle = '#f0f0f0'; ctx.fill();

            // lower teeth
            if (mo > 0.35) {
                ctx.beginPath();
                ctx.rect(-7, my + 2 + mo * 18 - Math.min(mo * 8, 6), 14, Math.min(mo * 8, 6));
                ctx.fillStyle = '#e8e8e8'; ctx.fill();
            }

            // tongue peek
            if (mo > 0.6) {
                ctx.beginPath();
                ctx.ellipse(0, my + 2 + mo * 12, 6, 5, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#cc6655'; ctx.fill();
            }
        }

        // ── glasses ──
        [-1, 1].forEach(s => {
            const gx = s * 19;

            // lens tint
            ctx.beginPath();
            ctx.ellipse(gx, ey, 15, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = C.glassLens; ctx.fill();

            // lens highlight
            ctx.beginPath();
            ctx.ellipse(gx - s * 3, ey - 4, 5, 3, -0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200,220,255,0.18)'; ctx.fill();

            // frame
            ctx.beginPath();
            ctx.ellipse(gx, ey, 15, 12, 0, 0, Math.PI * 2);
            ctx.strokeStyle = C.glassFrame; ctx.lineWidth = 2.5; ctx.stroke();
        });

        // bridge
        ctx.beginPath();
        ctx.moveTo(-4, ey); ctx.lineTo(4, ey);
        ctx.strokeStyle = C.glassFrame; ctx.lineWidth = 2.2; ctx.stroke();

        // temples
        [-1, 1].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s * 34, ey); ctx.lineTo(s * 54, ey + 12);
            ctx.strokeStyle = C.glassFrame; ctx.lineWidth = 2; ctx.stroke();
        });
    }

    // ── rounded rect helper ───────────────────────────────────────────────────
    _rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x,     y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x,     y,     x + r, y);
        ctx.closePath();
    }

    // ── render ────────────────────────────────────────────────────────────────
    render(timestamp) {
        const dt = this._lastTime ? Math.min(timestamp - this._lastTime, 50) : 16;
        this._lastTime = timestamp;
        this.update(dt);
        this.draw();
    }
}
