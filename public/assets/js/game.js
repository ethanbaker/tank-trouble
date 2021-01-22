let keyboard //create the keyboard variable to use for movement
let keys = "UP,LEFT,DOWN,RIGHT,SPACE,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z"

let roomId = ""

let playerSpeed = 125
let canFire = true
let bullets = 0
let bulletDecay = 7000
let bulletSpeed = 190
let fireTime = 200
let maxBullets = 5
let specialBullets = {
  frag: {},
  fragDestroy: false,
  fragTimer: false,
  lazer: {},
  lazerLength: 0,
  lazerFired: false,
  ray: {},
  rayLength: 0,
  rayFired: false,
}


let powerup = "bullet"

let scoreTexts = []

let nameLength = 0

let globalSettings
let localSettings = {
  mouse: false,
  customControls: {
    left: "LEFT",
    right: "RIGHT",
    up: "UP",
    down: "DOWN",
    shoot: "SPACE"
  },
}

class Scene extends Phaser.Scene {
  preload() {
    this.load.image("tile_x", "./assets/images/tile_x.png") 
    this.load.image("tile_y", "./assets/images/tile_y.png") 

    this.load.image("tank", "./assets/images/tank.png") 

    this.load.image("bullet", "./assets/images/bullet.png") 
    this.load.image("gatling", "./assets/images/bullet.png") 
    this.load.image("frag", "./assets/images/bullet.png") 
    this.load.image("ray", "./assets/images/ray-bullet.png")
    this.load.image("lazer", "./assets/images/lazer-bullet.png")

    this.load.image("gatling-icon", "./assets/images/gatling.png")
    this.load.image("booby-icon", "./assets/images/booby.png")
    this.load.image("lazer-icon", "./assets/images/lazer.png")
    this.load.image("ray-icon", "./assets/images/ray.png")
    this.load.image("rc-missile-icon", "./assets/images/rc-missile.png")
    this.load.image("homing-missile-icon", "./assets/images/homing-missile.png")
    this.load.image("frag-icon", "./assets/images/frag.png")

    /*
    this.load.image("settingsButton", "./assets/images/settings.png") 
    this.load.image("settingsBackground", "./assets/images/settingsWindow.png") 
    */
  }

  create() {
    keyboard = this.input.keyboard.addKeys(keys) 

    this.cameras.main.setBackgroundColor("#FFFFFF") 

    this.tiles = this.physics.add.staticGroup() 
    this.lines = this.physics.add.staticGroup()
    this.bullets = this.physics.add.group() 
    this.powerups = this.physics.add.group()
    this.otherPlayers = this.physics.add.group() 

    this.player1 = this.add.text(750, 20, "Player 1: 0", {fontSize: "20px", fill: "#000000"})
    this.player2 = this.add.text(750, 120, "Player 2: 0", {fontSize: "20px", fill: "#000000"})
    this.player3 = this.add.text(750, 220, "Player 3: 0", {fontSize: "20px", fill: "#000000"})
    this.player4 = this.add.text(750, 320, "Player 4: 0", {fontSize: "20px", fill: "#000000"})
    this.player5 = this.add.text(750, 420, "Player 5: 0", {fontSize: "20px", fill: "#000000"})

    scoreTexts = [this.player1, this.player2, this.player3, this.player4, this.player5]

    //socket.io logic
    let self = this 

    this.socket = io() 

    // Determine whether the user is joining a game or creating a new one
    if (name && id) { 
      this.socket.emit("joinGame", {name: name, id: id}) 
    } else if (name && !id) { 
      this.socket.emit("newGame", {name: name}) 
    }

    // If the room Id is invalid
    this.socket.on("invalidRoomId", id => {
      this.invalidId = this.add.text(30, 300, `Sorry, the id (${id}) is invalid`, { fontSize: "30px", fill: "#000000" })
    })

    // Draw parts of the game
    this.socket.on("drawBoard", board => {
      createBoard(self, board)
    })

    this.socket.on("drawRoomId", id => {
      self.roomId = this.add.text(650, 725, `Room id: ${id}`, { fontSize: "20px", fill: "#000000"})
      this.roomId.setInteractive()
      this.roomId.on("pointerdown", () => {
        navigator.clipboard.writeText(this.roomId._text.split(" ")[2]).then(() => {}, err => {
          console.error('Async: Could not copy text: ', err);
        })
      })
    })

    this.socket.on("drawPlayers", players => {
      for (let player of players) {
        if (player._id === self.socket.id) { // Fix to getter function
          nameLength = player._name.length*3.5
          roomId = player._roomId
          addPlayer(self, player) 
          self.player.alive = true
        } else { 
          addOtherPlayer(self, player) 
        }

        scoreTexts[players.indexOf(player)].setText(`${player._name}: ${player._score}`)
      }
    })

    // A new player joined
    this.socket.on("newPlayer", data => { 
      addOtherPlayer(self, data.player) 
      scoreTexts[data.index].setText(`${data.player._name}: ${data.player._score}`)
    })

    // When a player leaves
    this.socket.on("playerLeft", data => { 
      self.otherPlayers.getChildren().forEach(otherPlayer => {
        if (data.id === otherPlayer.id) {
          otherPlayer.destroy() 
          self[data.id + "Name"].destroy()
        }
      })

      for (let i = 0; i < scoreTexts.length; i++) {
        if (scoreTexts[i]._text.includes(data.name)) {
          scoreTexts[i].setText(`Player ${i+1}: 0`)
        }
      }
    })

    // When a player leaves
    this.socket.on("removePlayer", id => { 
      self.otherPlayers.getChildren().forEach(player => { 
        if (id === player.id) { 
          player.destroy() 
          self[id + "Name"].destroy() 
        }
      })
    })

    // When a player moves
    this.socket.on("renderMovement", player => {
      self.otherPlayers.getChildren().forEach( otherPlayer => { 
        if (player._id === otherPlayer.id) { 
          otherPlayer.setRotation(player._rotation) 
          otherPlayer.setPosition(player._x, player._y) 
          self[otherPlayer.id + "Name"].x = otherPlayer.x-nameLength
          self[otherPlayer.id + "Name"].y = otherPlayer.y+16 
          return
        }
      })
    })

    // When a bullet is fired
    this.socket.on("renderBullet", data => { 
      // TODO
      /*
       For lazer and ray, make a bullet that is invisible and have other squares drawn over the path of the bullet, mimiking an acutal lazer. Have collision for the bullet if its a lazer. 

       For booby traps, make a still frag that explodes when a player is near it. Have it hide after a second.

       For missiles, make an ai that calculates how to reach the player using the board. Have it follow the path until the missile is in the box the player is in, then go to the player. FOr rc, use arrows to control it and have it bounce.
       */
      let bullet 

      let xChange = 0
      let yChange = 0
      switch (data._powerup) {
        case "bullet":
          bulletDecay = 7000
          fireTime = 200
          bulletSpeed = 190
          maxBullets = 5
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(7, 7).setSize(7, 7)
          break

        case "gatling":
          bulletDecay = 4000
          fireTime = 75
          bulletSpeed = 240
          maxBullets = 15
          xChange = Math.floor(Math.random() * 30) - 15
          yChange = Math.floor(Math.random() * 30) - 15
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(3, 3).setSize(3, 3)
          break

        case "booby":
          bulletDecay = 45000
          fireTime = 1000
          bulletSpeed = 50
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(10, 10).setSize(10, 10)
          break

        case "frag":
          bulletDecay = 9000
          fireTime = 200
          bulletSpeed = 130
          maxBullets = 0
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(10, 10).setSize(10, 10)
          specialBullets.frag = bullet
          break

        case "frag-tiny":
          bulletDecay = 250
          bulletSpeed = 240
          xChange = Math.floor(Math.random() * 30) - 15
          yChange = Math.floor(Math.random() * 30) - 15
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(3, 3).setSize(3, 3)
          break

        case "rc-missile":
          bulletDecay = 12000
          fireTime = 500
          bulletSpeed = 200
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(7, 7).setSize(7, 7)
          break

        case "homing-missile":
          bulletDecay = 10000
          fireTime = 500
          bulletSpeed = 200
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setDisplaySize(7, 7).setSize(7, 7)
          break

        case "lazer":
          bulletDecay = 2500
          maxBullets = 1
          fireTime = 200
          bulletSpeed = 500
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setSize(4, 4)
          bullet.visibility = false
          specialBullets.lazer = bullet
          bullet.angle = data._angle
          break

        case "ray":
          bulletDecay = 2500
          maxBullets = 1
          fireTime = 200
          bulletSpeed = 1000
          bullet = self.add.sprite(data._x, data._y, data._powerup).setOrigin(0.5, 0.5).setSize(20, 20)
          bullet.angle = data._angle
          bullet.visibility = false
          specialBullets.ray = bullet
          break
      }
      self.bullets.add(bullet) 

      if (["bullet", "gatling", "frag", "frag-tiny", "rc-missile", "homing-missile"].includes(data._powerup)) {
        bullet.body.bounce = {x: 1, y: 1} 
        bullet.body.velocity.x = bulletSpeed*data._velocityX+xChange
        bullet.body.velocity.y = bulletSpeed*data._velocityY+yChange

        let touching = 0
        self.physics.add.collider(bullet, self.tiles, () => {
          touching += 10
        })

        setTimeout(() => touching += 10, 400)

        self.physics.add.overlap(bullet, self.player, () => { 
          ++touching
          if (touching > 10) {
            //self.player.play("deathAnimation") 
            self.socket.emit("playerDied", self.socket.id) 
            self.player.destroy() 
            self.player.alive = false
            self[self.socket.id + "Name"].destroy()
          }
        }, null, self)

        setTimeout(() => {
          if (data._powerup === "frag" && specialBullets.fragDestroy) {
            for (let i = 0; i < 15; i++) {
              let d = {x: bullet.x, y: bullet.y, angle: bullet.angle + i*24, powerup: "frag-tiny"}
              self.socket.emit("sendBullet", d)
            }

            --bullets

            specialBullets.fragDestroy = false
            
            if (["frag", "frag-destroyed"].includes(powerup)) powerup = "bullet"
          }



          if (!["frag-tiny", "frag"].includes(data._powerup)) --bullets

          bullet.destroy()
        }, bulletDecay)
      } else if (data._powerup === "booby") {
        self.physics.add.collider(bullet, self.tiles)
        bullet.body.velocity.x = -20*data._velocityX
        bullet.body.velocity.y = -20*data._velocityY

        setTimeout(() => {
          bullet.body.velocity.x = 0
          bullet.body.velocity.y = 0
          self.physics.add.overlap(bullet, self.player, () => {
            bullet.visible = true

            for (let i = 0; i < 15; i++) {
              let d = {x: bullet.x, y: bullet.y, angle: bullet.angle + i*24, powerup: "frag-tiny"}
              self.socket.emit("sendBullet", d)
            }

            bullet.destroy()
          }, null, self)

          bullet.visible = false
        }, 1500)
      } else if (["rc-missile", "homing-missile"].includes(data._powerup)) {

      } else if (["lazer", "ray"].includes(data._powerup)) {
        if (data._powerup === "lazer") {

          self.physics.add.collider(bullet, self.tiles)
        }

        bullet.body.bounce = {x: 1, y: 1} 
        bullet.body.velocity.x = bulletSpeed*data._velocityX+xChange
        bullet.body.velocity.y = bulletSpeed*data._velocityY+yChange
      }
      /*


      if (data._roomId !== roomId) return

      let touching = 0, time, bullet, vChange = 0
      switch (data._powerup) {
        case "gatling":
          bullet = self.add.sprite(data._x, data._y, "bullet").setOrigin(0.5, 0.5).setDisplaySize(3, 3).setSize(3, 3)
          time = 3000
          vChange = 50

        case "booby":
          bullet = self.add.sprite(data._x, data._y, "booby-bullet").setOrigin(0.5, 0.5).setDisplaySize(3, 3).setSize(3, 3)

        case "lazer":
          bullet = self.add.sprite(data._x, data._y, "lazer-bullet").setOrigin(0.5, 0.5).setDisplaySize(4, 4).setSize(4, 4)

        case "rc-missile":
          bullet = self.add.sprite(data._x, data._y, "missile-bullet").setOrigin(0.5, 0.5).setDisplaySize(4, 4).setSize(4, 4)
          time = 12000

        case "homing-missile":
          bullet = self.add.sprite(data._x, data._y, "missile-bullet").setOrigin(0.5, 0.5).setDisplaySize(4, 4).setSize(4, 4)
          time = 10000

        case "frag":
          bullet = self.add.sprite(data._x, data._y, "bullet").setOrigin(0.5, 0.5).setDisplaySize(11, 11).setSize(11, 11)
          time = 7000
          vChange = -50

        default:
          bullet = self.add.sprite(data._x, data._y, "bullet").setOrigin(0.5, 0.5).setDisplaySize(7, 7).setSize(7, 7) 
          time = 7000
      }

      let moveBullets = ["bullet", "gatling", "rc-missile", "homing-missile", "frag"]
      for (let i of moveBullets) {
        if (data._powerup === i) {
          self.bullets.add(bullet) 
          bullet.body.bounce = {x: 1, y: 1} 
          bullet.body.velocity.x = data._velocityX+vChange
          bullet.body.velocity.y = data._velocityY+vChange

          self.physics.add.collider(bullet, self.tiles, () => {
            touching += 10
          })

          self.physics.add.overlap(bullet, self.player, () => { 
            ++touching
            if (touching > 10) {
      //self.player.play("deathAnimation") 
              self.socket.emit("playerDied", self.socket.id) 
              self.player.destroy() 
              self.player.alive = false
              self[self.socket.id + "Name"].destroy()
            }
          }, null, self)

          setTimeout(() => touching += 10, 400)

          setTimeout(() => { 
            if (data._powerup === "frag") {
              for (let i = 0; i < 30; i++) {
                let b = self.add.image(bullet._x, bullet._y, "gatling-bullet")
                b.body.angle = i*10+Math.floor(Math.random() * 4)
                b.body.velocityX = 150
                b.body.velocityY = 150

                setTimeout(() => {
                  b.destroy()
                }, 500)
              }
            }
            bullet.destroy() 
          }, time)
        } else if (data._powerup === "booby") {
          setTimeout(() => { 
            bullet.hide()

            self.physics.add.overlap(bullet, self.player, () => { 
              //bullet.show()
              //self.player.play("boobyExplosion")
              //self.player.play("deathAnimation") 
              self.socket.emit("playerDied", self.socket.id) 
              self.player.destroy() 
              self.player.alive = false
              self[self.socket.id + "Name"].destroy()
            }, null, self)
          }, 2000)
        } else if (data._powerup === "lazer") {
          self.physics.add.collider(bullet, self.tiles)
          self.physics.add.overlap(bullet, self.player, () => { 
            //self.player.play("deathAnimation") 
            self.socket.emit("playerDied", self.socket.id) 
            self.player.destroy() 
            self.player.alive = false
            self[self.socket.id + "Name"].destroy()
          }, null, self)

// draw lazer line
        } else if (data._powerup === "ray") {
          self.physics.add.overlap(bullet, self.player, () => { 
            //self.player.play("deathAnimation") 
            self.socket.emit("playerDied", self.socket.id) 
            self.player.destroy() 
            self.player.alive = false
            self[self.socket.id + "Name"].destroy()
          }, null, self)

// draw ray line
        }
      }
*/
})

    // When a new round starts
    this.socket.on("restartBoard", players => { 
      // Destroy the player
      if (self.player.visible) { 
        self.player.destroy() 
        self[self.socket.id + "Name"].destroy()
      }

      // Destroy other players
      while (self.otherPlayers.getChildren()[0]) { 
        self.otherPlayers.getChildren().forEach(player => { 
          player.destroy() 
          self[player.id + "Name"].destroy()
        })
      }

      // Destory the wall tiles
      while (self.tiles.getChildren()[0]) { 
        self.tiles.getChildren().forEach(tile => { 
          tile.destroy() 
        })
      }

      // Destroy the bullets
      while (self.bullets.getChildren()[0]) { 
        self.bullets.getChildren().forEach(bullet => {  
          bullet.destroy() 
        })
      }

      // Destroy the powerups
      while (self.powerups.getChildren()[0]) { 
        self.powerups.getChildren().forEach(powerup => {  
          powerup.destroy() 
        })
      }

      while (self.lines.getChildren()[0]) {
        self.lines.getChildren().forEach(line => {
          line.destroy()
        })
      }

      // Remake all the players
      for (let i = 0; i < players.length; i++) {
        if (players[i]._id === self.socket.id) { 
          addPlayer(self, players[i]) 
          this.player.alive = true
        } else { 
          addOtherPlayer(self, players[i]) 
        }

        scoreTexts[i].setText(`${players[i]._name}: ${players[i]._score}`)
      }
    })

    this.socket.on("powerupSpawn", powerup => {
      if (powerup._id === roomId) {
        let p = self.add.sprite(powerup._x, powerup._y, `${powerup._name}-icon`)
        self.powerups.add(p)

        self.physics.add.overlap(p, self.player, () => {
          p.destroy()
          self.socket.emit("getPowerup", powerup)
        }, null, self)
      }
    })

    this.socket.on("hasPowerup", data => {
      if (data.id === self.socket.id) {
        // draw turret over player skin
        powerup = data.powerup._name
        return
      }  
      for (let player of self.otherplayers) {
        if (data.id === player.id) {
          // draw turret over player skin
        }
      }
    })
}

update() {
  if (this.player && this.player.alive) { 
    if (!localSettings.mouse) { 
      if (keyboard[localSettings.customControls.right].isDown) { 
        this.player.setAngularVelocity(225) 
      } else if (keyboard[localSettings.customControls.left].isDown) { 
        this.player.setAngularVelocity(-225)
      } else {
        this.player.setAngularVelocity(0) 
      }
    } else {
      //TODO make it so the tank"s turret aims at the mouse
    }

    if (keyboard[localSettings.customControls.up].isDown) { 
      this.player.setVelocityX(playerSpeed*Math.cos(this.player.angle*Math.PI/180)) 
      this.player.setVelocityY(playerSpeed*Math.sin(this.player.angle*Math.PI/180)) 
    } else if (keyboard[localSettings.customControls.down].isDown) { 
      this.player.setVelocityX(-1*playerSpeed*Math.cos(this.player.angle*Math.PI/180)) 
      this.player.setVelocityY(-1*playerSpeed*Math.sin(this.player.angle*Math.PI/180)) 
    } else {
      this.player.setVelocityY(0) 
      this.player.setVelocityX(0)
    }

    if (keyboard[localSettings.customControls.shoot].isDown && specialBullets.fragDestroy && !specialBullets.fragTimer) { 
      for (let i = 0; i < 15; i++) {
        let d = {x: specialBullets.frag.x, y: specialBullets.frag.y, angle: specialBullets.frag.angle + i*24, powerup: "frag-tiny"}
        this.socket.emit("sendBullet", d)
      }

      --bullets

      specialBullets.frag.destroy()
      specialBullets.frag = null
      specialBullets.fragDestroy = false
      powerup = "bullet"
      bulletDecay = 7000
      fireTime = 200
      bulletSpeed = 190
      maxBullets = 5

      canFire = false 
      setTimeout(() => canFire = true, 200) 
    } else if (keyboard[localSettings.customControls.shoot].isDown && canFire && bullets <= maxBullets) { 
      this.socket.emit("sendBullet", {x: this.player.x, y: this.player.y, angle: this.player.angle, powerup: powerup})

      if (!["ray", "lazer"].includes(powerup)) ++bullets

      if (powerup === "frag") {
        specialBullets.fragDestroy = true
        specialBullets.fragTimer = true
        setTimeout(() => {
          specialBullets.fragTimer = false
        }, 500)
      } else if (powerup === "ray") {
        specialBullets.rayFired = true
      } else if (powerup === "lazer") {
        specialBullets.lazerFired = true
      } else if (powerup !== "gatling") {
        powerup = "bullet"
      }

      canFire = false 
      setTimeout(() => canFire = true, fireTime) 
    }

    this[this.socket.id + "Name"].x = this.player.x-nameLength //updates the player"s name text box
    this[this.socket.id + "Name"].y = this.player.y+16 //updates the player"s name text box

    this.socket.emit("sendLocations", { x: this.player.x, y: this.player.y, rotation: this.player.rotation }) // emit the player"s movement
  }

  if (specialBullets.rayFired) {
    playerSpeed = 0
    let d = this.add.sprite(specialBullets.ray.x, specialBullets.ray.y, "ray")
    d.angle = specialBullets.ray.angle-90
    this.lines.add(d)

    this.physics.add.overlap(d, this.player, () => {
      // play deathAnimation
      this.socket.emit("playerDied", this.socket.id) 
      this.player.destroy() 
      this.player.alive = false
      this[this.socket.id + "Name"].destroy()
    }, null, this)

    setTimeout(() => d.destroy(), 1000)

    ++specialBullets.rayLength
    if (specialBullets.rayLength > 200 || (specialBullets.ray.x < 30 || specialBullets.ray.x > 700 || specialBullets.ray.y < 30 || specialBullets.ray.y > 700)) {
      specialBullets.ray.destroy()
      specialBullets.ray = null
      specialBullets.rayLength = 0
      specialBullets.rayFired = false
      powerup = "bullet"

      setTimeout(() => playerSpeed = 125, 1000)
    }
  } else if (specialBullets.lazerFired) {
    playerSpeed = 0

    let d = this.add.sprite(specialBullets.lazer.x, specialBullets.lazer.y, "lazer")
    d.angle = specialBullets.lazer.angle-90
    this.lines.add(d)

    this.physics.add.overlap(d, this.player, () => {
      // play deathAnimation
      this.socket.emit("playerDied", this.socket.id) 
      this.player.destroy() 
      this.player.alive = false
      this[this.socket.id + "Name"].destroy()
    }, null, this)

    setTimeout(() => d.destroy(), 800)

    ++specialBullets.lazerLength
    if (specialBullets.lazerLength > 200) {
      specialBullets.lazerFired = false
      specialBullets.lazer.destroy()
      specialBullets.lazer = null
      specialBullets.lazerLength = 0
      powerup = "bullet"

      setTimeout(() => playerSpeed = 125, 1000)
    }
  }
}
}

// ------------------------------

//functions used in the scene class for the game
const addPlayer = (self, player) => { 
  self.player = self.physics.add.image(player._x, player._y, "tank").setOrigin(0.5, 0.5).setTint(nameToInt(player._color)).setSize(19, 19) 

  self.player.angle = player._rotation
  self.physics.add.collider(self.tiles, self.player) 
  self[self.socket.id + "Name"] = self.add.text(self.player.x-nameLength, self.player.y+16, player._name, { fontSize: "12px", fill: "#000000"}) 
}

const addOtherPlayer = (self, player) => { 
  let otherPlayer = self.add.image(player._x, player._y, "tank").setOrigin(0.5, 0.5).setTint(nameToInt(player._color)) 
  otherPlayer.id = player._id
  otherPlayer.angle = player._rotation
  self.otherPlayers.add(otherPlayer) 
  self[player._id + "Name"] = self.add.text(player._x-player._name, player._y+16, player._name, { fontSize: "12px", fill: "#000000"})
}

const createBoard = (self, board) => {
  for (let i of board) {
    if (i.left) {
      let tile = self.add.image(68*i.col-34, 68*i.row, "tile_y")
      self.tiles.add(tile)
      tile.immovable = true
    }
    if (i.top) {
      let tile = self.add.image(68*i.col, 68*i.row-34, "tile_x")
      self.tiles.add(tile)
      tile.immovable = true
    }
    if (i.right) {
      let tile = self.add.image(68*i.col+34, 68*i.row, "tile_y")
      self.tiles.add(tile)
      tile.immovable = true
    }
    if (i.bottom) {
      let tile = self.add.image(68*i.col, 68*i.row+34, "tile_x")
      self.tiles.add(tile)
      tile.immovable = true
    }
  }
}

const nameToInt = name => {
  let num = 0
  switch (name) {
    case "red":
      num = 16711680
      break
    case "yellow":
      num = 16776960
      break
    case "green":
      num = 65280
      break
    case "blue":
      num = 255
      break
    case "purple":
      num = 16711935
      break
  }
  return num
}

const scoreUpdate = (self, room) => {
  self.player1 = `${players[0]}: ${scores[0]}`
  self.player2 = `${players[1]}: ${scores[1]}`
  self.player3 = `${players[2]}: ${scores[2]}`
  self.player4 = `${players[3]}: ${scores[3]}`
  self.player5 = `${players[4]}: ${scores[4]}`
}

// -------------------------------

let filterWords = /dick|bitch|nigger|penis|tits|tit|cock|balls|nigga|fag|retard/

//for the buttons to move you to a room
let name, id
let newName = document.querySelector("#newName") 
let newGame = document.querySelector("#newGame") 
newGame.onclick = _ => { 
  name = newName.value 
  if (!name || name.match(filterWords)) { 
    alert("You need to enter a valid name")
    return 
  }

  document.querySelector("#menu").style.display = "none" 

  runPhaser() 
}

let joinName = document.querySelector("#joinName") 
let joinId = document.querySelector("#joinId") 
let joinGame = document.querySelector("#joinGame") 

joinGame.onclick = _ => {
  name = joinName.value 
  id = joinId.value 
  if ((!name || name.match(filterWords) )|| !id) {
    alert("You need to enter a value for your name and room id") 
    return 
  }

  document.querySelector("#menu").style.display = "none" 

  runPhaser() 
}

// -------------------------------

//declare config as a new Phaser.Game (starts the Phaser game)

const runPhaser = () => {
  let config = new Phaser.Game({ 
    width: 1300, //set the width of the game
    height: 750, //set the height of the game
    physics: { //declare the physics object
      default: "arcade", //set the type of physics for the engine
      arcade: { //declare the arcade (type of physics) object
        //debug: true, //set debug type (true shows hit-boxes, vectors, etc. False shows normal game)
      },
    },
    scene: [Scene] //declare scene as a new instance of the scene class
  })
}
