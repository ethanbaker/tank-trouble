class Unit extends Phaser.GameObjects.Sprite {
    constructor(self, x, y, rotation, color, id) {
        self.physics.add.Sprite(x, y, 'tank').setOrigin(0.5, 0.5).setDisplaySize(25, 19).setTint(color)
        this.id = id
    }

    get position() {
        return {x: this.x, y: this.y, rotation: this.rotation}
    }

    get color() {
        return this.color
    }
}

class Player extends Unit {
    constructor(self, x, y, rotation, color) {
        super(self, x, y, rotation, color, id)
    }

    move(keyboard) {
        if (keyboard.up || keyboard.w) {
            this.player.setVelocityX(100*Math.cos(this.player.angle*Math.PI/180)) 
            this.player.setVelocityY(100*Math.sin(this.player.angle*Math.PI/180)) 
        } else if (keyboard.right || keyboard.left) {
            this.player.setVelocityX(100*Math.cos(this.player.angle*Math.PI/180)) 
            this.player.setVelocityY(100*Math.sin(this.player.angle*Math.PI/180))  
        }
    }
    
    rotate(keyboard) {
        if (keyboard.right || keyboard.d) {
            this.player.setAngularVelocity(150)
        } else if (keyboard.left || keyboard.a) {
            this.player.setAngularVelocity(-150)
        }
    }
}

class Enemy extends Unit {
    constructor(self, x, y, rotation, color) {
        super(self, x, y, rotation, color, id)
    }
}


class Scene extends Phaser.Scene {
    preload() {

    }

    create() {

    }

    update() {

    }
}

let config = {
    width: null,
    height: null,
    backgroundColor: '#FFFFFF',
    physics: {
        default: 'arcade',
        arcade: {
            //debug: true
        }
    },
    scene: [Scene],
}