var camY = 0,
    velY = 0,
    delT = 11,
    thrust = -0.01,
    grav = 0.0007,
    maxVel = 0.9,
    restoreRate = 0.01,
    can, ctx, hero, joystick,  prevT;

// debug -- FIXME remove for final submission
function resetHero() {
    hero.pos.set(100, 700);
    hero.vel.set(0, 0);
    hero.acc.set(0, 0);
}

// util
function forEach(arr, f) {
    for (var i = 0; i < arr.length; i++) {
        f(arr[i]);
    }
}

// physics functions
function motion(b) {
    b.vel.fAdd(delT, b.acc);
    b.pos.fAdd(delT, b.vel);
}

function impulse(b, imp) {
    b.vel.add(imp);
}

// draw functions
function drawBG() {
    var num = 10,
        sep = can.height / num,
        i, y;
    for(i = 0; i < num; i++) {
        y = ~~(i * sep - (camY % sep));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(can.width, y);
        ctx.stroke();
        ctx.fillText("" + (y + camY), 10, y);
    }
}

function drawCircle(ctx, x, y, size, fill) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    if (fill === true) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawBox(ctx, x, y, size) {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

function drawCan(can, x, y, rotate) {
    if (rotate) {
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(can, -can.width / 2, -can.height / 2);
    }
    ctx.drawImage(can, x - can.width / 2, y - can.height / 2);
}

function preDraw(f) {
    var can = document.createElement('canvas'),
        ctx = can.getContext('2d');
    f(ctx, can);
    return can;
}

function V(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

V.fromEvent = function(ev) {
    return new V(ev.clientX, ev.clientY);
}

V.prototype = {
    add: function(o) {
        this.x += o.x;
        this.y += o.y;
    },

    fAdd: function(f, o) {
        this.x += f * o.x;
        this.y += f * o.y;
    },

    scale: function(f) {
        this.x *= f;
        this.y *= f;
    },

    sub: function(o) {
        this.x -= o.x;
        this.y -= o.y;
    },

    set: function(x, y) {
        this.x = x;
        this.y = y;
    },

    i: function() {
        return new V(this.x, this.y);
    },

    r: function() {
        return this.x * this.x + this.y * this.y;
    },

    // broken but better
    limit: function(rad) {
        var d = this.r(),
            rad2 = rad * rad,
            f;
        if (d > rad2) {
            f = rad / Math.sqrt(d);
            this.x *= f;
            this.y *= f;
        }
    }
}

function Hero() {
    this.size = 45;
    this.pos = new V();
    this.vel = new V();
    this.acc = new V();
    this._can = preDraw(this._drawChar.bind(this));
}

Hero.prototype = {
    _drawChar: function(ctx, can) {
        can.width = can.height = this.size;
        var path = new Path2D('M0 0 v ' + this.size + ' h ' + this.size + ' v ' + -this.size + ' Z');
        ctx.fill(path);
    },
    update: function() {
        // if out of viewport break
        if (this.pos.x < 0 || this.pos.x > can.width || this.pos.y < camY || this.pos.y > camY + can.height) {
            debugger;
            throw new Exception();
        }
        motion(this);
        this.vel.limit(maxVel);
        // update camY
        this._trackCam3();
    },
    draw: function() {
        drawCan(this._can, this.pos.x, this.pos.y - camY);
    },
    _trackCam1: function() {
        if (this.vel.y !== 0) {
            if (this.vel.y < 0) {
                // camY = Math.min(camY, this.pos.y - can.width / 2);
                velY = -Math.pow(-this.vel.y, 1.3) * (camY + can.height - this.pos.y) * 2 / can.height;
            } else {
                velY = Math.pow(this.vel.y, 2);
            }

        } 
        camY = ~~(camY + velY * delT);
    },
    _trackCam2: function() {
        camY = ~~Math.min(camY, this.pos.y - can.height / 2);
    },
    _trackCam3: function() {
        if (this.vel.y !== 0) {
            if (this.vel.y < 0) {
                velY = -Math.pow(-this.vel.y, 1.3) * (camY + can.height - this.pos.y) * 2 / can.height;
                camY = ~~(camY + velY * delT);
            }
        }
    }
}

const STICK_ENGAGED = 1,
    STICK_RESETTING = 2,
    STICK_FREE = 3;

const DIR_LEFT = 1,
    DIR_RIGHT = 2;
function Joystick() {
    this.pos = new V();
    this.dot = new V();
    this.wellSize = 90;
    this.dotSize = 40;
    this.resetInterval = 1;
    this._angle = 0;
    this.direction = DIR_LEFT;
    this._state = STICK_FREE;
    this._dotV = new V();
    this._initTouch = new V();
    this._id = null;
    this._dotR2 = this.dotSize * this.dotSize;
    this._dotCan = preDraw(this._drawDot.bind(this));
    this._wellCan = preDraw(this._drawWell.bind(this));
    // touch event listeners
    can.addEventListener('touchstart', this._touchStart.bind(this));
    can.addEventListener('touchmove', this._touchMove.bind(this));
    can.addEventListener('touchend', this._touchEnd.bind(this));
    can.addEventListener('touchcancel', this._touchEnd.bind(this));
    can.addEventListener('touchleave', this._touchEnd.bind(this));
}

Joystick.prototype = {
    update: function() {
        switch (this._state) {
        case STICK_RESETTING:
            this.dot.scale(this.resetFactor);
            if (this.dot.r() < 4) {
                this._state = STICK_FREE;
                this.dot.set(0, 0);
            }
            break;
        case STICK_RECHARGING:
            break;
        }
    },
    draw: function() {
        drawCan(this._wellCan, this.pos.x, this.pos.y, this._angle);
        drawCan(this._dotCan, this.pos.x + this.dot.x, this.pos.y + this.dot.y);
    },
    _touchStart: function(ev) {
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (self._state !== STICK_FREE) return;
            // check for collision with dot
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            self._initTouch.set(t.x, t.y);
            if (t.r() < self._dotR2) {
                self._state = STICK_ENGAGED;
                self._id = touch.identifier;
            }
        });
    },
    _touchMove: function(ev) {
        if (this._state !== STICK_ENGAGED) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            t.sub(self._initTouch);
            if (self.direction === DIR_LEFT) {
                self.dot.x = Math.min(0, self.dot.x);
            } else {
                self.dot.x = Math.max(0, self.dot.x);
            }
            self.dot.set(t.x, t.y);
            self.dot.limit(self.wellSize);
        });
    },
    _touchEnd: function(ev) {
        if (this._state !== STICK_ENGAGED) return;
        var self = this,
            t;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            self._state = STICK_RESETTING;
            t = self.dot.i();
            t.scale(thrust);
            hero.vel.set(t.x, t.y);
            hero.acc.y = grav;
            self._lf = 0;
            self.direction = (self.direction === DIR_LEFT) ? DIR_RIGHT : DIR_LEFT;
        });
    },
    _drawDot: function(ctx, can) {
        var r = this.dotSize, 
            d = 2 * r,
            blur = 8,
            width = 6,
            offset = blur + width;
        can.height = can.width = d + offset;
        ctx.fillStyle = '#55e';
        ctx.shadowBlur = blur;
        ctx.lineWidth = width;
        ctx.shadowColor = '#33a';
        var c = r + offset / 2;
        drawCircle(ctx, c, c, r, true);
    },
    _drawWell: function(ctx, can) {
        var r = this.wellSize, 
            d = 2 * r,
            blur = 10,
            width = 8,
            offset = blur + width;
        can.width = can.height = d + offset;
        ctx.strokeStyle = '#5e5';
        ctx.shadowBlur = blur;
        ctx.lineWidth = width;
        ctx.shadowColor = '#3a3';
        var c = this.wellSize + offset / 2;
        drawCircle(ctx, c, c, r);
    },
}

function tick(now) {
    /*
    if (prevT) {
        delT = now - prevT;
    }
    prevT = now;
    */
    // update things
    hero.update();
    joystick.update();
    // draw things
    ctx.clearRect(0, 0, can.width, can.height);
    drawBG();
    hero.draw();
    joystick.draw();
    requestAnimationFrame(tick);
}

window.onload = function() {
    // FIXME: WUT??
    document.body.addEventListener('touchstart', function(e){ e.preventDefault(); });
    can = document.getElementById('game-canvas');
    ctx = can.getContext('2d');
    can.width = 600;
    can.height = 800;
    hero = new Hero();
    resetHero();
    joystick = new Joystick();
    joystick.pos.set(480, 670);
    requestAnimationFrame(tick);
}
