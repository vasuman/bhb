var scoreFactor = 40,
    thrust = -0.01,
    grav = 0.002,
    maxVel = 0.9,
    highscore = 0,
    baseDelta = 7,
    delT, currentScreen, tutorial, ents, score, camY, velY, running, can, ctx, hero, joystick, bg;

var TUT_INTRO = 0,
    TUT_GRAB = 1,
    TUT_RELEASE = 2,
    TUT_REVERSE = 3,
    TUT_AVOID = 4,
    TUT_OVER = 5,
    TUT_FAIL = 6;

function Tutorial() {
    this.fadeDelay = 10;
    this._state = TUT_INTRO;
    this._delTV = 0.04;
    this._t = 0;
    delT = 0;
    joystick.disabled = true;
}

Tutorial.prototype = {
    _changeState: function(nextState) {
        this._state = nextState;
        this._t = 0;
    },
    _retry: function() {
        this._sinceGrab = null;
        this._sinceRelease = null;
    },
    update: function() {
        this._t += 1;
        switch(this._state) {
            case TUT_INTRO:
                if (this._t >= 80) {
                    this._changeState(TUT_GRAB);
                    joystick.disabled = false;
                }
                break;
            case TUT_GRAB:
                if (delT < 3) {
                    delT += this._delTV;
                }
                if (this._sinceGrab) {
                    if (this._t >= this._sinceGrab + this.fadeDelay) {
                        this._changeState(TUT_RELEASE);
                    }
                }
                break;
            case TUT_RELEASE:
                if (delT > 0.7) {
                    delT -= this._delTV;
                }
                if (this._sinceRelease) {
                    delT += this._delTV;
                    if (this._t >= this._sinceRelease + this.fadeDelay) {
                        this._changeState(TUT_REVERSE);
                    }
                }
                break;
            case TUT_REVERSE:
                if (this._t >= 150) {
                    this._changeState(TUT_AVOID);
                }
                break;
            case TUT_AVOID:
                if (delT < 5) {
                    delT += this._delTV;
                }
                if (this._t >= 500) {
                    this._changeState(TUT_OVER);
                }
                break;
            case TUT_OVER:
                if (delT < baseDelta) {
                    delT += this._delTV;
                }
                break;
            case TUT_FAIL:
                if (this._t >= 80) {
                    transition($('start-screen'));
                    running = false;
                    tutorial = null;
                }
                break;
        }
    },
    _drawText: function(txt, x, y, color, alpha, bold) {
        ctx.save();
        ctx.font = (bold ? 'bold ' : '') + '32px Arial';
        ctx.fillStyle = color || 'black';
        ctx.shadowColor = color || 'black';
        ctx.shadowBlur = 7;
        ctx.globalAlpha = alpha;
        ctx.fillText(txt, x, y - camY);
        ctx.restore();
    },
    _ease: function(s, e) {
        if (this._t < s) {
            return 0;
        } else if (this._t < s + this.fadeDelay) {
            return (this._t - s) / this.fadeDelay;
        } else if (this._t > e - this.fadeDelay) {
            return (e - this._t) / this.fadeDelay;
        } else {
            return 1;
        }
    },
    draw: function() {
        var end = Math.Infinity,
            baseX, baseY;
        switch(this._state) {
            case TUT_INTRO:
                end = 80;
                this._drawText('this is you', 150, 100, 'black', this._ease(0, end));
                break;
            case TUT_GRAB:
                if (this._sinceGrab) {
                    end = this._sinceGrab + this.fadeDelay;
                }
                this._drawText('grab the', 180, 300, 'black', this._ease(30, end));
                this._drawText('blue dot', 305, 300, 'blue', this._ease(30, end));
                break;
            case TUT_RELEASE:
                if (this._sinceRelease) {
                    end = this._sinceRelease + this.fadeDelay;
                }
                baseX = 180;
                baseY = 400;
                this._drawText('blue dot', baseX, baseY, 'blue', this._ease(10, end));
                this._drawText('moves', baseX + 125, baseY, 'black', this._ease(10, end));
                this._drawText('only', baseX + 225, baseY, 'black', this._ease(10, end), true);
                this._drawText('in the', baseX, baseY + 40, 'black', this._ease(10, end));
                this._drawText('green semicircle', baseX + 85, baseY + 40, 'green', this._ease(10, end));
                this._drawText('pull and release to', baseX, baseY + 110, 'black', this._ease(50, end));
                this._drawText('thrust', baseX + 265, baseY + 110, 'black', this._ease(50, end), true);
                break;
            case TUT_REVERSE:
                end = 150;
                baseX = 250;
                baseY = joystick.pos.y - joystick.wellSize - 60;
                this._drawText('green region', baseX, baseY, 'green', this._ease(0, end));
                this._drawText('reverses', baseX + 185, baseY, 'black', this._ease(0, end), true);
                this._drawText('every time you thrust', baseX, baseY + 40, 'black', this._ease(10, end));
                break;
            case TUT_AVOID:
                end = 500;
                this._drawText('avoid the edges of the screen', 150, 300, 'black', this._ease(30, end));
                this._drawText('keep climbing', 100, 150, 'black', this._ease(170, end));
                this._drawText('dodge falling ', 150, 30, 'black', this._ease(270, end));
                this._drawText('red boxes', 345, 30, 'red', this._ease(270, end));
                break;
            case TUT_FAIL:
                end = 80;
                this._drawText('mediocre', 240, 50, 'black', this._ease(0, 80), true);
        }
    },
    touchDown: function() {
        this._sinceGrab = this._t;
    },
    touchUp: function() {
        this._sinceRelease = this._t;
    },
    end: function() {
        if (this._state === TUT_OVER) {
            tutorial = null;
            endGame();
            return;
        }
        // restart
        this._changeState(TUT_FAIL);
    }
}

// util
function $(id) {
    return document.getElementById(id);
}

function resetScreen(s) {
    hide(s);
}

function transition(nextScreen) {
    hide(currentScreen);
    show(nextScreen);
    currentScreen = nextScreen;
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

// draw functions
function drawCircle(ctx, x, y, size, fill) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    if (fill === true) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawText(txt, x, y) {
    ctx.textAlign = 'center';
    ctx.fillText(txt, x, y);
}

function drawBox(ctx, x, y, w, h) {
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
}

function drawCan(can, x, y, theta) {
    if (theta) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(theta);
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

V.fromTouch = function(ev) {
    return new V(ev.clientX, ev.clientY);
}

V.fromMouse = function(ev) {
    return new V(ev.offsetX, ev.offsetY);
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

    angle: function() {
        return Math.atan2(this.y, this.x);
    },

    rotate: function(angle) {
        var x = this.x,
            y = this.y;
        this.x = x * Math.cos(angle) - y * Math.sin(angle);
        this.y = x * Math.sin(angle) + y * Math.cos(angle);
    },

    i: function() {
        return new V(this.x, this.y);
    },

    r: function() {
        return this.x * this.x + this.y * this.y;
    },

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

var BOX_RED = 0,
    BOX_BLUE = 1,
    BOX_GREEN = 2;

var TYPE_PARAMS = {
    0: {
        speed: 1,
        fill: '#e55',
        stroke: '#d77'
    },
    1: {
        speed: 1.8,
        fill: '#55e',
        stroke: '#77d'
    },
    2: {
        speed: 2.4,
        fill: '#5e5',
        stroke: '#7d7'
    }
};

function Box(w, h) {
    this.pos = new V();
    this._top = 0;
    this._left = 0;
    this.w = w;
    this.h = h;
    this._type = this._getType();
    this.speed = TYPE_PARAMS[this._type].speed * boxes.speed;
    this.can = preDraw(this._drawBox.bind(this));
}

Box.prototype = {
    _getType: function() {
        var r = randRange(0, 10);
        if (r < 6) {
            return BOX_RED;
        } else if (r < 8) {
            return BOX_GREEN;
        } else {
            return BOX_BLUE;
        }
    },
    _drawBox: function(ctx, can) {
        var padX = 5,
            padY = 5;
        can.width = this.w + 2 * padX;
        can.height = this.h + 2 * padY;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = TYPE_PARAMS[this._type].fill;
        ctx.lineWidth = 5;
        ctx.strokeStyle = TYPE_PARAMS[this._type].stroke;
        ctx.beginPath();
        ctx.moveTo(padX, padY);
        ctx.lineTo(padX + this.w, padY);
        ctx.lineTo(padX + this.w, padY + this.h);
        ctx.lineTo(padX, padY + this.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },
    update: function() {
        this.pos.y += this.speed * delT;
        this._top = this.pos.y - this.h / 2;
    },
    outOfView: function() {
        return (this._top) > camY + can.height;
    },
    checkCollide: function(top, left, w, h) {
        return (this._top + this.h > top && this._top < top + h) && (this._left + this.w > left && this._left < left + w);
    },
}

function Boxes() {
    var i;
    this._lastInc = 0;
    this._bs = [];
    this.numBoxes = 0;
    this.maxBoxes = 7;
    this.baseDelay = 750;
    this.numChannels = 6;
    this.speed = 0.1;
    this.incAmt = 0.065;
    this.incInt = 1000;
    this.acc = 0.001;
    this._targetSpeed = 0.1;
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
        h = ~~randRange(40, 80);
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
        if (this.speed < this._targetSpeed) {
            this.speed += this.acc;
        }
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
        if (this._t > this.baseDelay && !hero._dead) {
            this._t = 0;
            if (this.numBoxes > this.maxBoxes) {
                return;
            }
            this._trySpawn();
        }
        // increase difficulty level
        if (-hero.pos.y > -this._lastInc + this.incInt) {
            this._targetSpeed += this.incAmt;
            this._lastInc = hero.pos.y;
        }
    },
    draw: function() {
        var i, j, c, b;
        for(i = 0; i < this.numChannels; i++) {
            c = this._chs[i];
            for(j = c.length - 1; j >= 0; j--) {
                // update existing
                b = c[j];
                drawCan(b.can, b.pos.x, b.pos.y - camY);
            }
        }
    },
    _trySpawn: function() {
        var st = ~~randRange(0, 10),
            hc = ~~(hero.pos.x / this._chSep);
        // spawn strategies
        if (st < 4) {
            // same channel as player
            this._spawnBox(hc);
        } else if (st < 6) {
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

function Fragment(pos, vec) {
    this.alpha = 1;
    this.size = 30;
    this.speed = 0.55;
    this.pos = pos;
    this.vec = vec;
    this.vec.limit(this.speed);
    this.can = preDraw(this._drawCan.bind(this));
    this._t = 0;
}

Fragment.prototype = {
    _drawCan: function(ctx, can) {
        can.width = can.height = this.size * 2;
        ctx.beginPath();
        ctx.arc(this.size, this.size, this.size, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    },
    update: function() {
        this._t += delT;
        this.alpha *= 0.87;
    },
    draw: function() {
        ctx.save();
        //ctx.globalAlpha = this.alpha;
        ctx.translate(this.pos.x + this.vec.x * this._t, this.pos.y + this.vec.y * this._t - camY);
        ctx.scale(this.alpha, this.alpha);
        ctx.drawImage(this.can, -this.can.width / 2, -this.can.height / 2)
        ctx.restore();
    }
}

function Hero() {
    this.size = 45;
    this.pos = new V();
    this.vel = new V();
    this.acc = new V();
    this.numFragments = 8;
    this.explodeTime = 40;
    this._can = preDraw(this._drawChar.bind(this));
    this._dead = false;
    this._fs = [];
}

Hero.prototype = {
    _drawChar: function(ctx, can) {
        var size = ~~(this.size * 1.2);
        can.width = can.height = size;
        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#333';
        ctx.shadowColor = '#444';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size, size / 2);
        ctx.lineTo(size / 2, size);
        ctx.lineTo(0, size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },
    update: function() {
        motion(this);
        this.vel.limit(maxVel);
        if (this._dead) {
            this.explodeTime -= 1;
            if (this.explodeTime === 0) {
                if (tutorial) {
                    tutorial.end();
                    return;
                }
                endGame();
                return;
            }
            this._fs.forEach(function(f) {
                f.update();
            });
            return;
        }
        // if out of viewport break
        var top = this.pos.y - this.size / 2,
            left = this.pos.x - this.size / 2;
        if (left < 0 || left + this.size > can.width || top < camY || top + this.size > camY + can.height) {
            this.explode();
            return;
        }
        if (boxes.collides(top, left, this.size, this.size)) {
            this.explode();
            return;
        }
        // update camY
        this._trackCam3();
    },
    draw: function() {
        if (this._dead) {
            this._fs.forEach(function(f) {
                f.draw();
            });
            return;
        }
        drawCan(this._can, this.pos.x, this.pos.y - camY, joystick._angle);
    },
    explode: function() {
        this._dead = true;
        var ang = new V(1, 0),
            angSep = 2 * Math.PI / this.numFragments,
            vec, i;
        for(i = 0; i < this.numFragments; i++) {
            vec = ang.i();
            ang.rotate(angSep);
            this._fs.push(new Fragment(this.pos.i(), vec, angSep, this.pos));
        }
    },
    impulse: function(vec) {
        vec.scale(thrust);
        hero.vel.set(vec.x, vec.y);
        hero.acc.y = grav;
        vec.scale(-1);
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

var STICK_ENGAGED = 1,
    STICK_RESETTING = 2,
    STICK_FREE = 3;

var DIR_LEFT = 1,
    DIR_RIGHT = 2;

function Joystick() {
    this.wellSize = 130;
    this.dotSize = 50;
    this.pos = new V();
    this.disabled = false;
    this.reset();
    this._dotR2 = this.dotSize * this.dotSize;
    this._dotCan = preDraw(this._drawDot.bind(this));
    this._wellCan = preDraw(this._drawWell.bind(this));
    if (isMobile()) {
        // touch event listeners
        can.addEventListener('touchstart', this._touchStart.bind(this));
        can.addEventListener('touchmove', this._touchMove.bind(this));
        can.addEventListener('touchend', this._touchEnd.bind(this));
        can.addEventListener('touchcancel', this._touchEnd.bind(this));
        can.addEventListener('touchleave', this._touchEnd.bind(this));
    } else {
        // mouse event listeners
        can.addEventListener('mouseout', this._mouseUp.bind(this));
        can.addEventListener('mouseup', this._mouseUp.bind(this));
        can.addEventListener('mousedown', this._mouseDown.bind(this));
        can.addEventListener('mousemove', this._mouseMove.bind(this));
    }
}

Joystick.prototype = {
    reset: function() {
        this.resetTime = 130;
        this.dot = new V();
        this.direction = DIR_LEFT;
        this.state = STICK_FREE;
        this._angle = 0;
        this._dotV = new V();
        this._initTouch = new V();
        this._id = null;
        this._t = 0;
    },
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
    _start: function(t) {
        t.sub(this.pos);
        if (t.r() < this._dotR2) {
            this._initTouch.set(t.x, t.y);
            this.state = STICK_ENGAGED;
            if (tutorial) {
                tutorial.touchDown();
            }
            return true;
        }
        return false;
    },
    _move: function(t) {
        t.sub(this.pos);
        t.sub(this._initTouch);
        this.dot.set(t.x, t.y);
        if (this.direction === DIR_LEFT) {
            this.dot.x = Math.min(0, this.dot.x);
        } else {
            this.dot.x = Math.max(0, this.dot.x);
        }
        this.dot.limit(this.wellSize);
    },
    _touchStart: function(ev) {
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (self.state !== STICK_FREE || self.disabled) return;
            if (self._start(V.fromTouch(touch))) {
                self._id = touch.identifier;
            }
        });
    },
    _touchMove: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            self._move(V.fromTouch(touch));
        });
    },
    _touchEnd: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        var self = this;
        forEach(ev.changedTouches, function(touch) {
            if (touch.identifier !== self._id) return;
            self._release();
        });
    },
    _mouseUp: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        if (this._id !== ev.button) return;
        this._id = null;
        this._release();
    },
    _mouseDown: function(ev) {
        // interesting story here. mouse events are fired on touch devices on long press because that action opens the contextmenu
        if (this.state !== STICK_FREE) return;
        if (this._start(V.fromMouse(ev))) {
            this._id = ev.button;
        }
    },
    _mouseMove: function(ev) {
        if (this.state !== STICK_ENGAGED) return;
        if (this._id !== ev.button) return;
        this._move(V.fromMouse(ev));
    },
    _release: function() {
        this.state = STICK_RESETTING;
        hero.impulse(this.dot.i());
        this._lf = 0;
        this.direction = (this.direction === DIR_LEFT) ? DIR_RIGHT : DIR_LEFT;
        if (tutorial) {
            tutorial.touchUp();
        }
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
    this.bgColor = '#fffacd';
    this.lineColor = '#eed8ae';
    this.numX = 22;
    this.numY = ~~(this.numX * can.height / can.width);
    this.sepX = ~~(can.width / this.numX);
    this.sepY = ~~(can.height / this.numY);
    this.subDiv = 5;
    this.rulerRes = this.sepY * this.subDiv;
    this.rulerWidth = this.sepX * 2;
    this.rulerStart = can.height - can.height % this.rulerRes;
    this.numR = ~~(can.height / this.rulerRes) + 1;
    this.gridCan= preDraw(this._drawGrid.bind(this));
}

Background.prototype = {
    _drawGrid: function(ctx, bCan) {
        bCan.width = can.width;
        bCan.height = can.height + this.sepY;
        var i, x, y;
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, bCan.width, bCan.height);
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1;
        for(i = 0; i < this.numX; i++) {
            x = i * this.sepX;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, bCan.height);
            ctx.closePath();
            ctx.stroke();
        }
        for(i = 0; i <= this.numY + 1; i++) {
            y = i * this.sepY;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(bCan.width, y);
            ctx.closePath();
            ctx.stroke();
        }
    },
    update: function() {},
    draw: function() {
        ctx.drawImage(this.gridCan, 0, -camY % this.sepY - this.sepY);
        ctx.fillStyle = 'black';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'start';
        var y, w;
        for(i = -this.subDiv; i <= this.numR * this.subDiv; i++) {
            y = ~~(i * this.rulerRes / this.subDiv - (camY % this.rulerRes));
            w = this.rulerWidth / 2;
            if (i % this.subDiv == 0) {
                ctx.fillText("" + (-y -camY + this.rulerStart), 5, y - 2);
                w = this.rulerWidth;
            }
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }
}

function updateScore(force) {
    score = ~~Math.max(score, -hero.pos.y / scoreFactor);
}

function tick() {
    if (!running) return;
    // update things
    if (tutorial) {
        tutorial.update();
    }
    boxes.update();
    hero.update();
    joystick.update();
    bg.update();
    updateScore();
    // draw things
    ctx.clearRect(0, 0, can.width, can.height);
    bg.draw();
    if (tutorial) {
        tutorial.draw();
    }
    hero.draw();
    boxes.draw();
    joystick.draw();
    var i;
    for(i = ents.length - 1; i >= 0; i--) {
        if (ents[i]._dead) {
            ents.splice(i, 1);
            continue;
        }
        ents[i].update();
        ents[i].draw();
    }
    requestAnimationFrame(tick);
}

function reset() {
    delT = 7;
    camY = 0;
    velY = 0;
    ents = [];
    score = 0;
    boxes = new Boxes();
    hero = new Hero();
    hero.pos.set(100, 100);
    hero.acc.y = grav;
    running = true;
    joystick.reset();
    tick();
}

function displayScore() {
    if (!highscore) {
        try {
            highscore = +localStorage.getItem('highscore');
        } catch (e) {
            highscore = 0;
        }
    }
    $('end-score').innerHTML = score;
    highscore = Math.max(score, highscore);
    $('end-highscore').innerHTML = highscore;
    try {
        localStorage.setItem('highscore', highscore);
    } catch (e) {}
}

function startGame(isTutorial) {
    transition($('game-canvas'));
    reset();
    if (isTutorial) {
        tutorial = new Tutorial();
    }
}

function endGame() {
    running = false;
    displayScore();
    transition($('end-screen'));
}

function backToMenu() {
    transition($('start-screen'));
}

function restartGame() {
    transition($('game-canvas'));
    reset();
}

function isMobile() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

window.onload = function() {
    currentScreen = $('start-screen');
    resetScreen($('end-screen'));
    resetScreen($('game-canvas'));
    can = $('game-canvas');
    ctx = can.getContext('2d');
    can.width = 600;
    can.height = document.documentElement.clientHeight;
    bg = new Background();
    joystick = new Joystick();
    var padding = 145;
    joystick.pos.set(can.width - padding, can.height - padding * 1.2);
}

window.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
}

document.ontouchmove = function(e){
    e.preventDefault();
    return false;
}
