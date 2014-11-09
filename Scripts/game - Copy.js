// run initialize once the html has loaded
document.addEventListener("DOMContentLoaded", initialize, false);

function initialize() {

    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        var screen = canvas.getContext("2d");
        var gameSize = {
            x: canvas.width,
            y: canvas.height
        };

        // create the bodies array when constructor called.
        this.bodies = createInvaders(this).concat(new Player(this, gameSize));
        // get this reference
        var self = this;

        var tick = function () {
            self.update();
            self.draw(screen, gameSize);
            requestAnimationFrame(tick);
        };
        tick();

    };
    Game.prototype = {
        update: function () {
            var bodies = this.bodies;
            var notCollidingWithAnything = function (b1) {
                return bodies.filter(function (b2) {
                    return colliding(b1, b2);
                }).length === 0;
            };

            this.bodies = this.bodies.filter(notCollidingWithAnything);
            //randomly add tanks.
            if (Math.random() > 0.998) {
                this.bodies.push(new Tank(game, {x: game.gameSize.x, y: 0}));
            }
            for (var i = 0; i < this.bodies.length; i++) {
                this.bodies[i].update();
            }       

        },
        draw: function (screen, gameSize) {
            //screen.fillRect(30, 30, 40, 40);
            screen.clearRect(0, 0, gameSize.x, gameSize.y);
            console.log(this.bodies.length);
            for (var i = 0; i < this.bodies.length; i++) {
                if (typeof this.bodies[i] != 'undefined') {
                    drawRect(screen, this.bodies[i]);
                    if (this.bodies[i].center.y < 0 || this.bodies[i].center.y > gameSize.y) {
                        this.bodies.splice(i, 1);
                    }
                }
            }
        },
        addBody: function (body) {
            this.bodies.push(body);
        },
        invadersBelow: function (invader) {
            return this.bodies.filter(function (b) {
                return b instanceof Invader && b.center.y > invader.center.y && b.center.x - invader.center.x < invader.size.x;
            }).length > 0;
        }
    };

    var Player = function (game, gameSize) {
        this.game = game;
        this.size = {
            x: 15,
            y: 15
        };
        this.center = {
            x: gameSize.x / 2,
            y: gameSize.y - this.size.x
        };
        //use this for jumping.
        this.velY = 0;
        // this is the inital jump velocity in pixels per frame
        this.JUMP_VELOCITY = -9;
        // this is the acceleration due to gravity.
        this.GRAVITY = 0.6
        // record starting y as this is 'ground' level
        this.startY = this.center.y;
        // use this to count bullets and stop endless stream.
        this.BULLET_SPEED = -6;
        this.BULLET_RESET = 1;
        this.bulletCtr = 0;

        this.keyboarder = new Keyboarder();
    };

    Player.prototype = {
        update: function () {
            // do the physics here.
            if (this.center.y != this.startY) {
                // update the current velocity
                this.velY += this.GRAVITY;
                // update the position, check whether it's gone too far and reset.
                this.center.y += this.velY;
                // limit y to the ground
                if (this.center.y > this.startY) {
                    this.center.y = this.startY;
                }
                if (this.center.y === this.startY) {
                    // ensure y velocity makes sense.
                    this.velY = 0;
                }
            }

            // adjusted these to be separate 'if' statements to allow jump while strafing.
            if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
                this.center.x -= 2;
            }

            if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
                this.center.x += 2;
            }

            if (this.keyboarder.isDown(this.keyboarder.KEYS.UP) && (this.center.y === this.startY)) {
                // this controls the jump.
                this.velY = this.JUMP_VELOCITY;
                this.center.y += this.velY;
            }

            if (this.keyboarder.isDown(this.keyboarder.KEYS.SPACE)) {
                //calculate bullet speed (relative to respect physics of jumping.
                var bulletVelocity = this.BULLET_SPEED + this.velY;

                if (bulletVelocity >= -3) {
                    bulletVelocity = -3
                }
                // Only allow this.BULLET_RESET volly size.
                if (this.bulletCtr < this.BULLET_RESET) {
                    var bullet = new Bullet({
                        x: this.center.x,
                        y: this.center.y - this.size.x / 2
                    }, {
                        x: 0,
                        // make bullet velocity relative
                        y: bulletVelocity
                    });
                    this.game.addBody(bullet);
                    // increment bullet Counter
                    this.bulletCtr++;
                }

                // only call the sound the first time.
                if (this.bulletCtr < 2) {
                    document.getElementById('sound').load();
                    document.getElementById('sound').play();
                }

                /*console.log(this.game);
               console.log(this.game.shootSound);
               this.game.shootSound.load();
               this.game.shootSound.play();*/
            }
            // if space bar not down, reset the counter
            if (!this.keyboarder.isDown(this.keyboarder.KEYS.SPACE) && this.bulletCtr > 0) {
                //reset the bullet counter
                this.bulletCtr = 0;
            }
        }

    };

    var Bullet = function (center, velocity) {
        this.size = {
            x: 3,
            y: 3
        };
        this.center = center;
        this.velocity = velocity;
    };

    Bullet.prototype = {
        update: function () {
            this.center.x += this.velocity.x;
            this.center.y += this.velocity.y;
        }
    };

    var Invader = function (game, center) {
   
        var createInvaders = function (game) {
            var invaders = [];
            for (var i = 0; i < 24; i++) {
                var x = 30 + (i % 8) * 30;
                var y = 30 + (i % 3) * 30;
                invaders.push(new Invader(game, {
                    x: x,
                    y: y
                }));
            }
            return invaders;
        };

        var Tank = function (game, center){
            this.game = game;
            this.size = {
                x: 25,
                y: 12
            };

            this.tankDir;
            if (center > game.gameSize.x / 2) {
                this.tankDir = -1;
            }else {
                this.tankDir = 1;
            }

            this.center = center;
            this.patrolX = 0;
            this.speedX = 0.3;
        };

        Tank.prototype = {
            update: function () {
                if (this.patrolX < 0 || this.patrolX > game.gameSize.x) {
                    this.tankDir = -this.tankDir;
                }
                this.center.x += this.speedX;
                this.patrolX += this.speedX;

                // 
                if (Math.random() > 0.998) {
                    var bullet = new Bullet({
                        x: this.center.x + this.size.y / 2,
                        y: this.center.y
                    }, {
                        x: 2 * this.tankDir,
                        y: 0
                    });
                    this.game.addBody(bullet);
                }
            }
        };

        var drawRect = function (screen, body) {
            screen.fillRect(body.center.x - body.size.x / 2,
            body.center.y - body.size.y / 2,
            body.size.x, body.size.y);
        }

        var Keyboarder = function () {
            var keyState = {};
            window.onkeydown = function (e) {
                keyState[e.keyCode] = true;
            };
            window.onkeyup = function (e) {
                keyState[e.keyCode] = false;
            };
            this.isDown = function (keyCode) {
                return keyState[keyCode] === true;
            };

            // catch the UP key for use with jumping.
            this.KEYS = {
                LEFT: 37,
                UP: 38,
                RIGHT: 39,
                SPACE: 32
            };
        };

        var colliding = function (b1, b2) {
            return !(b1 === b2 || b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 || b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.x / 2 || b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 || b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.x / 2);
        };

        /*var loadSound = function (url, callback) {
           console.log("ben");
           var loaded = function () {
               callback(sound);
               sound.removeEventListener('canplaythrough', loaded);
           }
           console.log(callback);
           console.log(loaded);
           var sound = new Audio(url);
           console.log(sound);
           sound.addEventListener('canplaythrough', loaded);
           sound.load();
       };*/

        new Game("screen");
    };