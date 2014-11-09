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

        this.tankActive = false;
        // create the bodies array when constructor called.
        this.bodies = createInvaders(this).concat(new Player(this, gameSize));
        // get this reference
        var self = this;

        var tick = function () {
            self.update(self, gameSize);
            self.draw(screen, gameSize);
            requestAnimationFrame(tick);

        };
        tick();

    };
    Game.prototype = {
        update: function (game, gameSize) {

            var bodies = this.bodies;
            var notCollidingWithAnything = function (b1) {
                return bodies.filter(function (b2) {
                    return colliding(b1, b2);
                }).length === 0;
            };

            this.bodies = this.bodies.filter(notCollidingWithAnything);

            var tankFound = false;
            for (var i = 0; i < this.bodies.length; i++) {
                this.bodies[i].update();

                //check if a tank is in the table to determine whether to add another.
                if (!tankFound) {
                    this.tankActive = tankFound = (this.bodies[i] instanceof Tank ? true : false);
                }
            }

            //randomly add tanks.
            if (!this.tankActive && (Math.random() > 0.994)) {
                // randomise start position
                game.addBody(new Tank(game, { x: (Math.random() < 0.5 ? 0 : gameSize.x), y: gameSize.y - 12 }, gameSize));
                this.tankActive = true;
            }

        },
        draw: function (screen, gameSize) {
            //screen.fillRect(30, 30, 40, 40);
            screen.clearRect(0, 0, gameSize.x, gameSize.y);
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
        // this is gravity.
        this.GRAVITY = 0.6
        // record starting y as this is 'ground' level
        this.startY = this.center.y;
        // use this to count bullets and stop endless stream.
        this.BULLET_SPEED = -6;
        this.BULLET_RESET = 1;
        this.bulletCtr = 0;
        this.lastDirection = -3;

        this.keyboarder = new Keyboarder();
        this.bodyType = "goodGuy";
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
                this.lastDirection = -3;
            }

            if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
                this.center.x += 2;
                this.lastDirection = 3;
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
                    },// add reference so we know who to attack
                        this);

                    this.game.addBody(bullet);
                    // increment bullet Counter
                    this.bulletCtr++;

                    //if jumping, fire a bullet
                    if (this.center.y < this.startY) {
                        var downBullet = new Bullet({
                            x: this.center.x,
                            y: this.center.y + this.size.x / 2
                        }, {
                            x: this.lastDirection,
                            y: 2.5
                        },// add reference so we know who to attack
                            this);
                        this.game.addBody(downBullet);
                    }
                }

                // only call the sound the first time.
                if (this.bulletCtr < 2) {
                    document.getElementById('sound').load();
                    document.getElementById('sound').play();
                }

            }
            // if space bar not down, reset the counter
            if (!this.keyboarder.isDown(this.keyboarder.KEYS.SPACE) && this.bulletCtr > 0) {
                //reset the bullet counter
                this.bulletCtr = 0;
            }
        }
    };

    var Bullet = function (center, velocity, owner) {
        this.size = {
            x: 3,
            y: 3
        };
        this.center = center;
        this.velocity = velocity;
        this.bodyType = owner.bodyType;

    };

    Bullet.prototype = {
        update: function () {
            this.center.x += this.velocity.x;
            this.center.y += this.velocity.y;
        }
    };

    var Invader = function (game, center) {
        this.game = game;
        this.size = {
            x: 15,
            y: 15
        };
        this.center = center;
        this.patrolX = 0;
        this.speedX = 0.3;
        this.bodyType = "badGuy";
    };

    Invader.prototype = {
        update: function () {
            if (this.patrolX < 0 || this.patrolX > 40) {
                this.speedX = -this.speedX;
            }
            this.center.x += this.speedX;
            this.patrolX += this.speedX;

            if (Math.random() > 0.995 && !this.game.invadersBelow(this)) {
                //if (Math.random() > 0.995) {

                var bullet = new Bullet({
                    x: this.center.x,
                    y: this.center.y + this.size.x / 2
                }, {
                    x: Math.random() - 0.5,
                    y: 2
                },
                    this);
                this.game.addBody(bullet);
            }
        }
    };

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

    var Tank = function (game, center, gameSize) {
        this.game = game;
        this.center = center;
        this.gameSize = gameSize;
        this.size = {
            x: 25,
            y: 12
        };

        this.tankDir;
        if (center.x > this.gameSize.x / 2) {
            this.tankDir = 1;
        } else {
            this.tankDir = -1;
        }
        this.speedX = 0.3;
        this.bodyType = "badGuy";
    };

    Tank.prototype = {
        update: function () {
            if (this.center.x < 0 || this.center.x > this.gameSize.x) {
                this.tankDir = -this.tankDir;
            }

            this.center.x += this.speedX * this.tankDir;
            // 
            if (Math.random() > 0.9975) {
                var bullet = new Bullet({
                    x: this.center.x + this.size.y / 2,
                    y: this.center.y
                }, {
                    x: 0.75 * this.tankDir,
                    y: 0
                },
                    this);
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
        return (b1.bodyType != b2.bodyType) && !(b1 === b2 || b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 || b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 || b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 || b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2);
        //return (b1.bodyType != b2.bodyType) && !(b1 === b2 || b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 || b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.x / 2 || b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 || b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.x / 2);
    };

    new Game("screen");
};