var camY = 0,
    velY = 0,
    delT = 12,
    thrust = -0.01,
    grav = 0.002,
    maxVel = 0.9,
    resetDelay = 0.5,
    can, ctx, hero, joystick,  prevT;

// util
function $(id) {
    return document.getElementById(id);
}

function forEach(arr, f) {
    for (var i = 0; i < arr.length; i++) {
        f(arr[i]);
    }
}

function randRange(start, end) {
    return Math.random() * (end - start) + start;
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

function drawBox(ctx, x, y, w, h) {
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
}

function drawCan(can, x, y, angle) {
    if (angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(can, -can.width / 2, -can.height / 2);
        ctx.restore();
    } else {
        ctx.drawImage(can, x - can.width / 2, y - can.height / 2);
    }
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

function Box(w, h) {
    this.pos = new V();
    this.velY = 0;
    this.w = w;
    this.h = h;
}

Box.prototype = {
    outOfView: function() {
        return (this.pos.y - this.h / 2) > camY + can.height;
    }
}

function Boxes() {
    this._bs = [];
    this.numBoxes = 5;
    this.numChannels = 6;
    this._chs = [];
    this._chSep = can.width / this.numChannels;
}

Boxes.prototype = {
    collides: function(pos, w, h) {
        var c1 = ~~( (pos.x - w / 2) / this._chSep),
            c2 = ~~( (pos.x + w / 2) / this._chSep),
            t = this._checkChannel(c1, pos, h);
        if (t) {
            return true;
        }
        if (c2 !== c1) {
        }
    },
    _checkChannel: function(i, pos, h) {
        var ch = ch[i];
    },
    update: function() {
        var i, b, x, y, w, h;
        // clear boxes
        for(i = this._bs.length - 1; i >= 0; i--) {
            if(this._bs[i].outOfView()) {
                this._bs.splice(i, 1);
            }
        }
        // add more boxes
        for(i = this._bs.length; i < this.numBoxes; i++) {
            w = randRange(40, 75);
            h = randRange(60, 85);
            b = new Box(w, h);
            this._bs.push(b);
            // TODO padding
            x = randRange(w / 2, can.width - w / 2);
            y = camY - h / 2 - randRange(50, 200);
            b.pos.set(x, y);
            b.velY = randRange(0.05, 0.1);
        }
        // update existing
        for(i = 0; i < this._bs.length; i++) {
            b = this._bs[i];
            b.pos.y += b.velY * delT;
            // TODO collision
        }
    },
    draw: function() {
        this._bs.forEach(function(b) {
            drawBox(ctx, b.pos.x, b.pos.y - camY, b.w, b.h);
        });
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
    this.resetTime = 200;
    this.direction = DIR_LEFT;
    this.state = STICK_FREE;
    this._angle = 0;
    this._dotV = new V();
    this._initTouch = new V();
    this._id = null;
    this._t = 0;
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
        var f;
        switch (this.state) {
        case STICK_RESETTING:
            this._t += delT;
            f = this._t / this.resetTime;
            this.dot.scale(1 - f);
            this._angle = ((this.direction === DIR_RIGHT) ? -f : (1 - f)) * Math.PI;
            if (this._t > this.resetTime) {
                this.state = STICK_FREE;
                this.dot.set(0, 0);
                this._t = 0;
                this._angle = (this.direction === DIR_RIGHT) ? Math.PI : 0;
            }
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
            if (self.state !== STICK_FREE) return;
            // check for collision with dot
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            self._initTouch.set(t.x, t.y);
            if (t.r() < self._dotR2) {
                self.state = STICK_ENGAGED;
                self._id = touch.identifier;
            }
        });
    },
    _touchMove: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            t.sub(self._initTouch);
            self.dot.set(t.x, t.y);
            if (self.direction === DIR_LEFT) {
                self.dot.x = Math.min(0, self.dot.x);
            } else {
                self.dot.x = Math.max(0, self.dot.x);
            }
            self.dot.limit(self.wellSize);
        });
    },
    _touchEnd: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        var self = this,
            t;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            self.state = STICK_RESETTING;
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
        ctx.beginPath();
        ctx.arc(c, c, r, 0, 2 * Math.PI);
        ctx.fill();
    },
    _drawWell: function(ctx, can) {
        var r = this.wellSize,
            d = 2 * r,
            blur = 10,
            width = 8,
            offset = blur + width;
        can.width = can.height = d + offset;
        ctx.fillStyle = '#7f7';
        ctx.strokeStyle = '#5e5';
        ctx.shadowBlur = blur;
        ctx.lineWidth = width;
        ctx.shadowColor = '#3a3';
        var c = this.wellSize + offset / 2;
        ctx.beginPath();
        ctx.arc(c, c, r, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 0.7;
        ctx.fill();
    },
}

function tick() {
    // update things
    boxes.update();
    hero.update();
    joystick.update();
    // draw things
    ctx.clearRect(0, 0, can.width, can.height);
    drawBG();
    hero.draw();
    boxes.draw();
    joystick.draw();
    requestAnimationFrame(tick);
}

function startGame() {
    $('start-screen').style.display = 'none';
    hero.acc.y = grav;
    tick();
}

window.onload = function() {
    can = $('game-canvas');
    ctx = can.getContext('2d');
    ctx.font = '14px monospace';
    can.width = 600;
    can.height = window.innerHeight;
    hero = new Hero();
    boxes = new Boxes();
    joystick = new Joystick();
    joystick.pos.set(480, can.height * 0.95 - joystick.wellSize);
    hero.pos.x = 100;
}
