let keyboard //create the keyboard variable to use for movement
let keys = "UP,LEFT,DOWN,RIGHT,SPACE,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z"

let destroyed = false //sets the destroyed variable to see if the player is destroyed

let bulletNumber = 0 //sets the bulletNumber to true
let canFire = true //sets canFire true for the firing mechanism

let globalSettings = {}
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
        this.load.image("tile_x", "./assets/images/tile_x.png") //load the horizontal tile image
        this.load.image("tile_y", "./assets/images/tile_y.png") //load the vertical tile image 

        this.load.image("tank", "./assets/images/tank.png") //load the tank image

        this.load.image("bullet", "./assets/images/bullet.png") //load the bullet image

        this.load.image("settingsButton", "./assets/images/settings.png") //load the settings cog sprite
        this.load.image("settingsBackground", "./assets/images/settingsWindow.png") //load the settings window sprite
    }

    create() {
        keyboard = this.input.keyboard.addKeys(keys) //create the keyboard inputs

        this.cameras.main.setBackgroundColor("#FFFFFF") //set the background white

        this.tiles = this.physics.add.staticGroup() //creates a group for the tiles of the map
        this.bullets = this.physics.add.group() //creates a group for the bullets
        this.otherPlayers = this.physics.add.group() //creates a group for the other players

        this.player1 = this.add.text(750, 20, "Player 1: 0", {fontSize: "20px", fill: "#000000"})
        this.player2 = this.add.text(750, 120, "Player 2: 0", {fontSize: "20px", fill: "#000000"})
        this.player3 = this.add.text(750, 220, "Player 3: 0", {fontSize: "20px", fill: "#000000"})
        this.player4 = this.add.text(750, 320, "Player 4: 0", {fontSize: "20px", fill: "#000000"})
        this.player5 = this.add.text(750, 420, "Player 5: 0", {fontSize: "20px", fill: "#000000"})


        //socket.io logic
        let self = this //creates a keyword for `this`(Phaser) so we can use it inside of the socket functions

        this.socket = io() //creates a new socket

        if (name && id) { //if both the name and id value are something
            this.socket.emit("clientJoined", {name: name, room: id}) //emit "clientJoined" from the socket and pass the name as data
            this.roomId = this.add.text(650, 725, `Room id: ${id}`, { fontSize: "20px", fill: "#000000" })
        } else if (name && !id) { //if the name value is something and the id value is not
            this.socket.emit("clientMakeGame", {name: name}) //emit "clientMakeGame" from the socket and pass the name as data
        }

        this.socket.emit("getBoard") //emit the "getBoard" socket to render the board

        this.socket.on("getRoomId", id => {
            self.roomId = this.add.text(650, 725, `Room id: ${id}`, { fontSize: "20px", fill: "#000000" })
        })

        this.socket.on("newPlayer", playerInfo => { //when the server socket emits "newPlayer" (a new player joined and other players playing need to know)
            addOtherPlayer(self, playerInfo) //add the player as another player
        })

        this.socket.on("renderPlayers", players => { //when the socket emits "current players" (rendering all of the current players)
            Object.keys(players).forEach(id => { //for every key in the players object
                if (players[id].id === self.socket.id) { //if the id iterating is equal to the client"s id
                    addPlayer(self, players[id]) //add the player to the game
                } else { //otherwise (the id iterating is not equal to the client"s id)
                    addOtherPlayer(self, players[id]) //add the player as another player
                }
            })
        })

        this.socket.on("renderPlayerMovement", playerInfo => { //when the server socket emits "playerMoved" (another player moved)
            self.otherPlayers.getChildren().forEach( otherPlayer => { //for every other player in the otherPlayers group
                if (playerInfo.id === otherPlayer.id) { //if the id of the player that moved is equal to the id that is iterating
                    otherPlayer.setRotation(playerInfo.rotation) //set that player"s rotation
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y) //set that player"s position
                    self[otherPlayer.id + "Name"].x = otherPlayer.x-16 //set the player"s text box"s x position
                    self[otherPlayer.id + "Name"].y = otherPlayer.y+16 //set the player"s text box"s y position
                }
            })
        })
        this.socket.on("playerDisconnect", id => { //when the socket emits "disconnect" (someone disconnects)
            self.otherPlayers.getChildren().forEach(otherPlayer => { //for every other player in the otherPlayers group
                if (id === otherPlayer.id) { //if the id of the other player is the player that left
                    otherPlayer.destroy() //destroy the player
                    self[playerId + "Name"].destroy() //destroy the text box associated with the player
                }
            })
        })

        this.socket.on("sendBoard", board => { //when the "serverSendBoard" socket is emitted
            createBoard(self, board) //create the board
        })

        this.socket.on("renderBullet", bulletInfo => { //when the "renderBullet" socket is emitted
            let bullet = self.add.sprite(bulletInfo.x, bulletInfo.y, "bullet").setOrigin(0.5, 0.5).setDisplaySize(7, 7).setSize(7, 7) //creates a bullet with the x and y coords
            self.bullets.add(bullet) //adds the bullet to the bullets group
            bullet.body.bounce = {x: 1, y: 1} //makes the  bullet be able to bounce
            bullet.body.velocity.x = bulletInfo.velocityX //gives the bullet an x velocity
            bullet.body.velocity.y = bulletInfo.velocityY //gives the bullet a y velocity
            self.physics.add.collider(bullet, self.tiles) //adds a collider with bullets and the tiles so the bullet bounces around
            self.physics.add.overlap(self.bullets, self.player, () => { //adds an overlap with bullets and the players so the player will die
                //self.player.play("deathAnimation") //play the death animation for the player
                self.socket.emit("clientDied", self.socket.id) //emits "die" from the socket to let all other players know who died
                destroyed = true //sets destroyed equal to true so the update function knows when the player is dead
                self.player.destroy() //destroy the player
                self[self.socket.id + "Name"].destroy()
            }, null, self)
            setTimeout(() => { //set a timeout so the bullet will eventually dissipate
                bullet.destroy() //destroy the bullet
                bulletNumber-- //remove 1 from the bullet number so the player can fire again
            }, 7000)
        })

        this.socket.on("removePlayer", playerId => {
            self.otherPlayers.getChildren().forEach(player => { //for every player in the otherPlayers group
                if (playerId === player.id) { //if the id passed through the socket is equal to the id of the player in the otherPlayers group
                    player.destroy() //destroy the player
                    self[playerId + "Name"].destroy() //destroy the text box associated with the player
                }
            })
        })

        this.socket.on("newRound", room => { //when the "newRound" socket is emitted
            if (self.player.visible) { //if the player is visible (aka not destroyed)
                self.player.destroy() //destroy the player
                self[self.socket.id + "Name"].destroy()
            }

            while (self.otherPlayers.getChildren()[0]) { //while there is a child of the otherPlayers group
                self.otherPlayers.getChildren().forEach(player => { //for all of the children in the otherPlayers group
                    player.destroy() //destroy that player
                    self[player.id + "Name"].destroy()
                })
            }

            while (self.tiles.getChildren()[0]) { //while there is a child of the tiles group
                self.tiles.getChildren().forEach(tile => { //for all of the tiles in the tiles group
                    tile.destroy() //destroy the tile
                })
            }

            while (self.bullets.getChildren()[0]) { //while there is a child of the bullets group
                self.bullets.getChildren().forEach(bullet => {  //for all of the bullets in the bullets group
                    bullet.destroy() //destroy the bullet
                })
            }

            Object.keys(room.players).forEach(id => { //for every key in the players object
                if (room.players[id].id === self.socket.id) { //if the id iterating is equal to the client"s id
                    addPlayer(self, room.players[id]) //add the player to the game
                    destroyed = false
                } else { //otherwise (the id iterating is not equal to the client"s id)
                    addOtherPlayer(self, room.players[id]) //add the player as another player
                }
            })

            createBoard(self, room.board) //create a new board with the board sent by the socket
        })

        this.socket.on("scoreUpdate", data => {
          console.log("here 1")
          scoreUpdate(self, data)
        })
    }

    update() {
        if (this.player && !destroyed) { //if the player is real and is not destroyed
            if (!localSettings.mouse) { //if the local settings say that the user wants to use the keyboard to aim instead of the mouse;
                if (keyboard[localSettings.customControls.right].isDown) { //if the right key (or whatever the user has as right) is down
                    this.player.setAngularVelocity(150) //rotate right
                } else if (keyboard[localSettings.customControls.left].isDown) { //if the left key (or whatever the user has as left) is down
                    this.player.setAngularVelocity(-150)//rotate left
                } else {
                    this.player.setAngularVelocity(0) //when the player is not pressing left or right, set the rotation to 0
                }
            } else {
                //TODO make it so the tank"s turret aims at the mouse
            }

            if (keyboard[localSettings.customControls.up].isDown) { //if the up key (or W) is down, move forwards according to the player angle
                this.player.setVelocityX(100*Math.cos(this.player.angle*Math.PI/180)) //move up with two combined vectors (cos of the angle converted to degrees is the x vector)
                this.player.setVelocityY(100*Math.sin(this.player.angle*Math.PI/180)) // sin of the angle converted to degrees is the y vector
            } else if (keyboard[localSettings.customControls.down].isDown) { //if the down key (or S) is down, move backwards according to the angle
                this.player.setVelocityX(-100*Math.cos(this.player.angle*Math.PI/180)) //move down with two combined vectors
                this.player.setVelocityY(-100*Math.sin(this.player.angle*Math.PI/180)) // cos of the angle converted to degrees is the x vector
            } else {
                this.player.setVelocityY(0) //when the player is not moving, set the velocities to 0
                this.player.setVelocityX(0)
            }

            if (keyboard[localSettings.customControls.shoot].isDown) { //if the spacebar is down
                //console.log(this.player.body.touching.up, this.player.body.wasTouching.up, this.player.angle,this.player.body.touching.up && this.player.angle < -45 && this.player.angle > -135 )
                
                if (canFire && bulletNumber <= 5) { //if the player can fire and has not already shot 5 bullets
                    let invertedX = 1, invertedY = 1
                    if (this.player.body.touching.up && this.player.angle < -45 && this.player.angle > -135) {
                        invertedY = -1
                    } else if (this.player.body.touching.down && this.player.angle > 45 && this.player.angle < 135) {
                        invertedY = -1
                    } else if (this.player.body.touching.right && this.player.angle < 45 && this.player.angle > -45) {
                        invertedX = -1
                    } else if (this.player.body.touching.left && this.player.angle < -135 && this.player.angle > 135) {
                        invertedX = -1
                    }
                    this.socket.emit("makeBullet", {x: this.player.x, y: this.player.y, angle: this.player.angle, number: bulletNumber, player: this.socket.id, invertedX: invertedX, invertedY: invertedY}) //emits fireBullet to the socket to send the bullet to the server
                    bulletNumber++ //adds 1 to the bullet number
                    canFire = false //stops the player from rapid firing 
                    setTimeout(() => canFire = true, 200) //adds a 200 millisecond delay for firing a bullet
                }
            }

            this[this.socket.id + "Name"].x = this.player.x-16 //updates the player"s name text box
            this[this.socket.id + "Name"].y = this.player.y+16 //updates the player"s name text box

            this.socket.emit("renderPlayerMovement", { x: this.player.x, y: this.player.y, rotation: this.player.rotation }) // emit the player"s movement
        }
    }
}

// ------------------------------

//functions used in the scene class for the game
const addPlayer = (self, playerInfo) => { //declares the function
    self.player = self.physics.add.image(playerInfo.x, playerInfo.y, "tank").setOrigin(0.5, 0.5).setDisplaySize(29, 19).setTint(nameToInt(playerInfo.color)).setSize(19, 19) //spawn in the player and change it accordingly
    self.player.angle = playerInfo.rotation //set the player rotation to the playerInfo.rotation
    self.physics.add.collider(self.tiles, self.player) //add a collider between the player and the tiles
    self[self.socket.id + "Name"] = self.add.text(self.player.x-16, self.player.y+16, playerInfo.name, { fontSize: "12px", fill: "#000000"}) //create a text box to display the player name
}

const addOtherPlayer = (self, playerInfo) => { //declares the function
    let otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, "tank").setOrigin(0.5, 0.5).setDisplaySize(29, 19).setTint(nameToInt(playerInfo.color)) //spawn in the other player and change it accordingly
    otherPlayer.id = playerInfo.id //sets the otherPlayer"s id to the playerInfo.id
    otherPlayer.angle = playerInfo.angle //sets the otherPlayer angle to the playerInfo.angle
    self.otherPlayers.add(otherPlayer) //adds the other player to the otherPlayers group
    self[playerInfo.id + "Name"] = self.add.text(playerInfo.x-16, playerInfo.y+16, playerInfo.name, { fontSize: "12px", fill: "#000000"}) //creates a text box for the other player
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
    let int
    switch (name) {
        case "red":
            int = 16711680
            break
        case "yellow":
            int = 16776960
            break
        case "green":
            int = 65280
            break
        case "blue":
            int = 255
            break
        case "purple":
            int = 16711935
            break
    }
    return int
}

const scoreUpdate = (self, room) => {
  self.player1 = `${room.players[0]}: ${scores[0]}`
  self.player2 = `${players[1]}: ${scores[1]}`
  self.player3 = `${players[2]}: ${scores[2]}`
  self.player4 = `${players[3]}: ${scores[3]}`
  self.player5 = `${players[4]}: ${scores[4]}`
}

// -------------------------------

//for the buttons to move you to a room
let name, id
let newName = document.querySelector("#newName") //gets the html element with the id of newName
let newGame = document.querySelector("#newGame") //gets the html element with the id of newGame
newGame.onclick = _ => { //when the newGame button is clicked
    name = newName.value //declares the variable name as what text is in the input element (newName)
    if (!name) { //if name is nothing
        alert("You need to enter a value for your name") //alert the client that they have to have a name
        return //stop the rest of the function from running
    }
    //socket.emit("createGame", {name: name}) //emit "createGame" from the socket and pass the name as data
    document.querySelector("#menu").style.display = "none" //get the menu off of the screen
    runPhaser() //run the phaser program
}

let joinName = document.querySelector("#joinName") //gets the html element with the id of joinName
let joinId = document.querySelector("#joinId") //gets the html element with the id of joinId
let joinGame = document.querySelector("#joinGame") //gets the html element with the id of joinGame
joinGame.onclick = _ => {
    name = joinName.value //declares the variable name as what text is in the input element (joinName)
    id = joinId.value //declares the variable id as what text is in the input element (joinId)
    if (!name || !id) {
        alert("You need to enter a value for your name and room id") //alert the client that they have to have a name and id
        return //stop the rest of the function from running
    }

    //socket.emit("joinGame", {name: name, room: id}) //emit "joinGame" from the socket and pass the name and id as data
    document.querySelector("#menu").style.display = "none" //get the menu off of the screen
    runPhaser() //run the phaser program
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
                debug: false, //set debug type (true shows hit-boxes, vectors, etc. False shows normal game)
            },
        },
        scene: [Scene] //declare scene as a new instance of the scene class
    })
}
