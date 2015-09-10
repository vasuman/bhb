var delT = 9,
    thrust = -0.01,
    grav = 0.002,
    maxVel = 0.9,
    resetDelay = 0.5,
    boxVel = 0.1,
    camY, velY, running, can, ctx, hero, joystick, bg, prevT;

// util
function $(id) {
    return document.getElementById(id);
}

function hide(e) {
    e.style.display = 'none';
}

function show(e) {
    e.style.display = '';
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
function drawRuler() {
    var num = 10,
        sep = can.height / num,
        i, y;
    ctx.fillStyle = 'black';
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
    this._top = 0;
    this._left = 0;
    this.w = w;
    this.h = h;
}

Box.prototype = {
    update: function() {
        this.pos.y += boxVel * delT;
        this._top = this.pos.y - this.h / 2;
    },
    outOfView: function() {
        return (this._top) > camY + can.height;
    },
    checkCollide: function(top, left, w, h) {
        return (this._top + this.h > top && this._top < top + h) && (this._left + this.w > left && this._left < left + w);
    }
}

function Boxes() {
    var i;
    this._bs = [];
    this.numBoxes = 0;
    this.maxBoxes = 7;
    this.baseDelay = 1000;
    this.numChannels = 6;
    this._t = 0;
    this._chs = [];
    this._chSep = can.width / this.numChannels;
    for(i = 0; i < this.numChannels; i++) {
        this._chs[i] = [];
    }
}

Boxes.prototype = {
    collides: function(top, left, w, h) {
        var c1 = ~~( (left) / this._chSep),
            c2 = ~~( (left + w) / this._chSep);
        if (this._checkChannel(c1, top, left, w, h)) {
            return true;
        }
        if (c2 !== c1) {
            if (this._checkChannel(c2, top, left, w, h)) {
                return true;
            }
        }
        return false;
    },
    _checkChannel: function(i, top, left, w, h) {
        if (i < 0 || i >= this._chs.length) return false;
        var ch = this._chs[i],
            j, b;
        for(j = 0; j < ch.length; j++) {
            b = ch[j];
            if (b.checkCollide(top, left, w, h)) {
                return true;
            }
        }
        return false;
    },
    _spawnBox: function(c) {
        var b, w, h, sp;
        w = ~~randRange(this._chSep / 2, this._chSep * 3 / 4);
        h = ~~randRange(70, 140);
        b = new Box(w, h);
        sp = this._chSep - w;
        b.pos.x = this._chSep * c + randRange(0, sp - 2) + w / 2;
        b.pos.y = camY - h - randRange(30, 60);
        b._top = b.pos.y - h / 2;
        b._left = b.pos.x - w / 2;
        if (this._checkChannel(c, b._top, b._left, w, h)) {
            // retry
            this._trySpawn();
            return;
        }
        this._chs[c].push(b);
        this.numBoxes += 1;
    },
    update: function() {
        var i, j, b, ch;
        for(i = 0; i < this.numChannels; i++) {
            c = this._chs[i];
            for(j = c.length - 1; j >= 0; j--) {
                // update existing
                c[j].update();
                // clear boxes
                if (c[j].outOfView()) {
                    c.splice(j, 1);
                    this.numBoxes -= 1;
                }
            }
        }
        for(i = this._bs.length - 1; i >= 0; i--) {
            if(this._bs[i].outOfView()) {
            }
        }
        // check for collision
        // add more boxes
        this._t += delT;
        if (this._t > this.baseDelay) {
            this._t = 0;
            if (this.numBoxes > this.maxBoxes) {
                return;
            }
            this._trySpawn();
        }
    },
    draw: function() {
        var i, j, c, b;
        ctx.fillStyle = 'red';
        for(i = 0; i < this.numChannels; i++) {
            c = this._chs[i];
            for(j = c.length - 1; j >= 0; j--) {
                // update existing
                b = c[j];
                drawBox(ctx, b.pos.x, b.pos.y - camY, b.w, b.h);
            }
        }
    },
    _trySpawn: function() {
        var st = ~~randRange(0, 10),
            hc = ~~(hero.pos.x / this._chSep);
        // spawn strategies
        if (st < 2) {
            // same channel as player
            this._spawnBox(hc);
        } else if (st < 4) {
            // in two adjacent channels
            if (hc > 0) {
                this._spawnBox(hc - 1);
            }
            if (hc < this.numChannels - 1) {
                this._spawnBox(hc + 1);
            }
        } else {
            // randomly pick a channel
            this._spawnBox(~~randRange(0, this.numChannels - 1));
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
            endGame();
            return;
        }
        if (boxes.collides(this.pos.y - this.size / 2, this.pos.x - this.size / 2, this.size, this.size)) {
            endGame();
            return;
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
            self._release();
        });
    },
    _release: function() {
        this.state = STICK_RESETTING;
        t = this.dot.i();
        t.scale(thrust);
        hero.vel.set(t.x, t.y);
        hero.acc.y = grav;
        this._lf = 0;
        this.direction = (this.direction === DIR_LEFT) ? DIR_RIGHT : DIR_LEFT;
        bg.direction = this.direction;
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

function Background() {
    this.padding = 0;
    this.disp = 30;
    this.spotX = 18;
    this.spotY = 20;
    this.numSpots = 40;
    this.bgColor = '#555';
    this.spotColor = 'white';
    this.spotSize = 5;
    this.speed = 3;
    this.direction = DIR_LEFT;
    this.baseCan = preDraw(this._drawBase.bind(this));
    this.alpha = 0.7;
    this._i = 0;
    this._o = 0;
    this._buff = [];
    var i;
    for(i = 0; i < 2; i++) {
        this._buff.push(preDraw(this._drawBuff.bind(this)));
    }
}

Background.prototype = {
    _drawBuff: function(ctx, bCan) {
        bCan.width = can.width;
        bCan.height = can.height;
    },
    _drawBase: function(ctx, bCan) {
        bCan.width = can.width;
        bCan.height = can.height;
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, bCan.width, bCan.height);
        ctx.fillStyle = this.spotColor;
        var sepX = bCan.width / this.spotX,
            sepY = bCan.height / this.spotY,
            i, j, x, y;
        for(i = 0; i < this.spotX; i++) {
            for(j = 0; j < this.spotY; j++) {
                x = i * sepX + randRange(1, 2 * this.disp) - this.disp;
                y = j * sepY + randRange(1, 2 * this.disp) - this.disp;
                drawBox(ctx, x, y, this.spotSize, this.spotSize);
            }
        }
    },
    update: function() {
        if (this.direction === DIR_LEFT) {
            this._o += this.speed;
            this._o %= this.baseCan.width;
        } else {
            this._o -= this.speed;
            if (this._o < 0) {
                this._o += this.baseCan.width;
            }
        }
    },
    draw: function() {
        var nI = 1 - this._i,
            pC = this._buff[this._i],
            nC = this._buff[nI],
            // investigate: does this impair performance
            nX = nC.getContext('2d');
        this._i = nI; 
        nX.globalAlpha = 1;
        nX.clearRect(0, 0, nC.width, nC.height);
        nX.drawImage(this.baseCan, this._o, 0, this.baseCan.width - this._o, this.baseCan.height, 0, 0, this.baseCan.width - this._o, this.baseCan.height);
        nX.drawImage(this.baseCan, 0, 0, this._o, this.baseCan.height, this.baseCan.width - this._o, 0, this._o, this.baseCan.height)
        nX.globalAlpha = this.alpha;
        nX.drawImage(pC, 0, 0);
        ctx.drawImage(nC, 0, 0);
    }
}


function tick() {
    if (!running) return;
    // update things
    boxes.update();
    hero.update();
    joystick.update();
    bg.update();
    // draw things
    ctx.clearRect(0, 0, can.width, can.height);
    bg.draw();
    drawRuler();
    hero.draw();
    boxes.draw();
    joystick.draw();
    requestAnimationFrame(tick);
}

function initGame() {
    bg = new Background();
    hero = new Hero();
    boxes = new Boxes();
    joystick = new Joystick();
    joystick.pos.set(480, can.height * 0.95 - joystick.wellSize);
    hero.pos.x = 100;
    hero.acc.y = grav;
    camY = 0;
    running = true;
    tick();
}

function startGame() {
    hide($('start-screen'));
    show($('game-canvas'));
    initGame();
}

function endGame() {
    hide($('game-canvas'));
    show($('end-screen'));
    $('player-score').innerText = -camY;
    running = false;
}

function restartGame() {
    hide($('end-screen'));
    show($('game-canvas'));
    initGame();
}

window.onload = function() {
    hide($('game-canvas'));
    hide($('end-screen'));
    can = $('game-canvas');
    ctx = can.getContext('2d');
    can.width = 600;
    can.height = document.documentElement.clientHeight;
}
