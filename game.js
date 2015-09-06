var can, ctx, hero;

// debug -- FIXME remove for final submission
function resetHero() {
    hero.pos.set(100, 700);
    hero.vel.set(0, 0);
}

// util
function forEach(arr, f) {
    for (var i = 0; i < arr.length; i++) {
        f(arr[i]);
    }
}

// physics functions
function motion(b) {
    b.vel.add(b.acc);
    b.pos.add(b.vel);
}

function impulse(b, imp) {
    console.log(imp);
    b.vel.add(imp);
}

// draw functions
function drawCircle(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
}

function drawBox(x, y, size) {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

function V(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

V.fromTouch = function(touch) {
    return new V(touch.clientX, touch.clientY);
}

V.prototype = {
    add: function(o) {
        this.x += o.x;
        this.y += o.y;
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
            rad2 = rad * rad, f;
        if (d > rad2) {
            f = rad2 / d;
            this.x *= f;
            this.y *= f;
        }
    }
}

function Hero() {
    this.size = 45;
    this.pos = new V(100, 700);
    this.vel = new V();
    this.acc = new V();
}

Hero.prototype = {
    update: function() {
        motion(this);
        // if out of viewport break
        if (this.pos.x < 0 || this.pos.x > 600 || this.pos.y < 0 || this.pos.y > 800) {
            debugger;
        }
    },
    draw: function() {
        ctx.fillStyle = 'black';
        drawBox(this.pos.x, this.pos.y, this.size);
    }
}

function Joystick() {
    this.pos = new V(480, 670);
    this.dot = new V();
    this.wellSize = 100;
    this.dotSize = 50;
    this._engaged = false;
    this._id = null;
    this._dotR2 = this.dotSize * this.dotSize;
    can.addEventListener('touchstart', this._touchStart.bind(this));
    can.addEventListener('touchmove', this._touchMove.bind(this));
    can.addEventListener('touchend', this._touchEnd.bind(this));
    can.addEventListener('touchcancel', this._touchEnd.bind(this));
    can.addEventListener('touchleave', this._touchEnd.bind(this));
}

Joystick.prototype = {
    draw: function() {
        ctx.fillStyle = 'green';
        drawCircle(this.pos.x, this.pos.y, this.wellSize);
        ctx.fillStyle = 'red';
        drawCircle(this.pos.x + this.dot.x, this.pos.y + this.dot.y, this.dotSize);
    },
    _touchStart: function(ev) {
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (self._engaged) return;
            // check for collision with dot
            var t = V.fromTouch(touch);
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
            var t = V.fromTouch(touch);
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
            self.dot.scale(-0.5);
            impulse(hero, self.dot);
            self.dot.set(0, 0);
        });
    }
}

function tick() {
    // update things
    hero.update();
    // draw things
    ctx.clearRect(0, 0, can.width, can.height);
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
    joystick = new Joystick();
    tick();
}
