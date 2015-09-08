var camY = 0,
    velY = 0,
    delT = 0,
    thrust = -0.008,
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
    var num = 12,
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

function drawCircle(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
}

function drawBox(ctx, x, y, size) {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

function drawCan(can, x, y) {
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
            f = rad2 / d;
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
}

Hero.prototype = {
    update: function() {
        // if out of viewport break
        if (this.pos.x < 0 || this.pos.x > 600 || this.pos.y < camY || this.pos.y > camY + 800) {
            debugger;
        }
        motion(this);
        // update camY
        if (this.vel.y == 0) {

        } else if (this.vel.y < 0) {
            // camY = Math.min(camY, this.pos.y - can.width / 2);
            velY = -Math.pow(-this.vel.y, 1.3);
        } else {
            velY = Math.pow(this.vel.y, 1.3);
        }
        camY = ~~(camY + velY * delT);
    },
    draw: function() {
        ctx.fillStyle = 'black';
        drawBox(ctx, ~~this.pos.x, ~~(this.pos.y - camY), this.size);
    }
}

function Joystick() {
    this.pos = new V();
    this.dot = new V();
    this.wellSize = 100;
    this.dotSize = 50;
    this._engaged = false;
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
    draw: function() {
        drawCan(this._wellCan, this.pos.x, this.pos.y);
        drawCan(this._dotCan, this.pos.x + this.dot.x, this.pos.y + this.dot.y, this.dotSize);
    },
    _touchStart: function(ev) {
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (self._engaged) return;
            // check for collision with dot
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            if (t.r() < self._dotR2) {
                self._engaged = true;
                self._id = touch.identifier;
            }
        });
    },
    _touchMove: function(ev) {
        if (!this._engaged) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            var t = V.fromEvent(touch);
            t.sub(self.pos);
            self.dot.set(t.x, t.y);
            self.dot.limit(self.wellSize);
        });
    },
    _touchEnd: function(ev) {
        if (!this._engaged) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            self._engaged = false;
            self.dot.scale(thrust);
            hero.vel.set(self.dot.x, self.dot.y);
            //hero.acc.y = 0.0003;
            self.dot.set(0, 0);
        });
    },
    _drawDot: function(ctx, can) {
        can.height = can.width = 2 * this.dotSize + 2;
        ctx.fillStyle = '#222'
        var c = this.dotSize + 1;
        drawCircle(ctx, c, c, this.dotSize);
    },
    _drawWell: function(ctx, can) {
        can.height = can.width = 2 * this.wellSize + 2;
        ctx.fillStyle = '#777';
        var c = this.wellSize + 1;
        drawCircle(ctx, c, c, this.wellSize);
    },
}

function tick(now) {
    if (prevT) {
        delT = now - prevT;
    }
    prevT = now;
    // update things
    hero.update();
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
