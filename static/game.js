import { WIDTH, HEIGHT, COLORS_NAMES, COLORS } from '/static/config/constants.js';

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: COLORS_NAMES.white,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: { y: 0 }
        }
    },
    scene: { preload, create, update }
}

var game = new Phaser.Game(config)

var hasRotate = false;

function preload() {
    this.load.image('player_sprite', 'static/assets/sword.png');
}

function create() {
    const self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();

    // Crear el jugador como el puntero del ratón
    this.player = this.physics.add.image(400, 300, 'player_sprite')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(50, 50)
        .setCollideWorldBounds(true)

    // Hacer que el puntero del ratón no sea visible
    this.input.setDefaultCursor('none');

    // Evento de clic del ratón
    this.input.on('pointerdown', function (pointer) {
        if (checkOutOfWorldBounds.call(this)) return;
    
        // Tween para realizar un giro completo (2 * Math.PI es una rotación completa)
        this.tweens.add({
            targets: this.player,
            angle: '+=360', 
            duration: 250,
            ease: 'Linear'
        });

        hasRotate = true;
    
    }, this);

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('newEnemies', function (enemiesInfo) {
        addEnemies(self, enemiesInfo);
    });

    this.socket.on('playerDisconnected', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.socket.on('playerRotated', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                self.tweens.add({
                    targets: otherPlayer,
                    angle: '+=360',
                    duration: 250,
                    ease: 'Linear'
                });
            }
        });
    });
}

function addPlayer(self, playerInfo) {
    self.player.setTint(playerInfo.color);
    self.player.setDrag(1000);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.image(playerInfo.x, playerInfo.y, 'player_sprite')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(50, 50)
        .setRotation(playerInfo.rotation);

    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.setTint(playerInfo.color);
    self.otherPlayers.add(otherPlayer);
}

function addEnemies(self, enemiesInfo) {
    var enemiesArray = Object.values(enemiesInfo);

    enemiesArray.forEach(function (enemyInfo) {
        createEnemy.call(self, enemyInfo.x, enemyInfo.y);
    });
}

function checkOutOfWorldBounds() {
    var pointer = this.input.activePointer;    

    if ((pointer.x + 10 >= WIDTH || pointer.x < 10) ||
        (pointer.y + 10 >= HEIGHT || pointer.y < 10))
    return true
    else return false
}

function update() {
    if (checkOutOfWorldBounds.call(this)) return;
    
    // Mover el jugador hacia la posición del ratón
    var pointer = this.input.activePointer;
    this.player.setPosition(pointer.x, pointer.y);

    // Emitir el movimiento del jugador al servidor
    var x = this.player.x;
    var y = this.player.y;
    this.socket.emit('playerMovement', { x, y });

    if (hasRotate) {
        hasRotate = false
        this.socket.emit('rotateSword');
    }
}

function createEnemy(x, y) {
    const enemy = this.add.rectangle(x, y, 50, 50, 0xFF0000);
    this.physics.world.enable(enemy);
    this.enemiesGroup.add(enemy);
}


