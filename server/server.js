// Imports
const generate = require("./generate.js")

let express = require("express")
let app = express()

let server = require("http").Server(app)

let io = require("socket.io").listen(server)

// Express setup
let homeDir = __dirname + "/../public"

app.use(express.static(homeDir))

app.get("/", (req, res) => {
  res.sendFile(homeDir + "/index.html")
})

server.listen(8080, () => {
  console.log(`Listening on ${server.address().port}`)
})

// Global memory
let globalSettings = {

}
let roomIds = []
let rooms = {}

// Player/room classes
class Player {
  constructor(id, name, roomId) {
    this._id = id
    this._roomId = roomId
    this._name = name
    this._color
    this._score = 0
    this._powerup
  }

  get id() {
    return this._id
  }

  get roomId() {
    return this._roomId
  }

  get name() {
    return this._name
  }

  get color() {
    return this._color
  }

  get x() {
    return this._x
  }

  get y() {
    return this._y
  }

  get rotation() {
    return this._rotation
  }

  get score() {
    return this._score
  }

  get alive() {
    return this._alive
  }

  get powerup() {
    return this._powerup
  }

  spawn() {
    this._x = Math.floor(Math.random() * 10 + 1) * 68
    this._y = Math.floor(Math.random() * 10 + 1) * 68
    this._rotation = Math.floor(Math.random() * 4) * 90
    this._alive = true
    this._powerup = null
  }
}

class Room {
  constructor(id, socket) {
    this._id = id
    roomIds.push(id)

    this._players = []
    this._board = generate.generateBoard()
    this._settings = globalSettings
    this.inCheckFunc = 0
    this.socket = socket
  }

  get id() {
    return this._id
  }

  get players() {
    return this._players
  }

  get board() {
    return this._board
  }

  get settings() {
    return this._settings
  }

  setColor(player) {
    let possible = ["red", "yellow", "green", "blue", "purple"]

    for (let p of this.players) {
      possible.splice(possible.indexOf(p.color), 1)
    }

    player._color = possible[0]
  }

  newPlayer(id, name) {
    let player = new Player(id, name, this._id)
    player.spawn()
    this.setColor(player)
    this._players.push(player)
    this.socket.broadcast.to(this._id).emit("newPlayer", {player: player, index: this.players.length})
    this.socket.emit("playerLocation", this._players)
  }

  getPlayer(id) {
    for (let i = 0; i < this.players.length; i++) {
      if (id === this.players[i].id) {
        return i
      }
    }
  }

  checkNewRound() {
    let alivePlayers = 0
    for (let p of this.players) {
      if (p.alive) {
        ++alivePlayers
      }
    }
    
    if (alivePlayers <= 1) {
      ++this.inCheckFunc
      setTimeout(() => {
        if (this.inCheckFunc > 1) {
          --this.inCheckFunc
          return
        }

        for (let p of this.players) {
          if (p.alive) {
            ++this._players[this._players.indexOf(p)]._score
          }
        }

        this.newRound()
        --this.inCheckFunc
      }, 5000)
    }
  }

  newRound() {
    this._board = generate.generateBoard()

    for (let p of this.players) {
      p.spawn()
    }

    io.emit("restartBoard", this.players)
    io.emit("drawBoard", this.board)
  }

  powerupSpawner() {
    let self = this
    setInterval(() => {
      let num = Math.floor(Math.random() * 5) 
      if (num > 1) {
        let powerup = new Powerup(self.id)
        io.emit("powerupSpawn", powerup)
      }
    }, 6000)
  }
}

class Bullet {
  constructor(x, y, angle, id, powerup) {
    this._x = x+8*Math.cos(angle*Math.PI/180)
    this._y = y+8*Math.sin(angle*Math.PI/180)
    this._velocityX = Math.cos(angle*Math.PI/180)
    this._velocityY = Math.sin(angle*Math.PI/180)
    this._angle = angle
    this._roomId = id
    this._powerup = powerup
  }

  get x() {
    return this._x
  }

  get y() {
    return this._y
  }

  get velocityX() {
    return this._velocityX
  }

  get velocityY() {
    return this._velocityY
  }

  get powerup() {
    return this._powerup
  }
}

class Powerup {
  constructor(id) {
    this._id = id

    let powerups = ["gatling", "booby", "lazer", "ray", "rc-missile", "homing-missile", "frag"]

    this._name = powerups[Math.floor(Math.random() * powerups.length)]
    this._x = Math.floor(Math.random() * 10 + 1) * 68
    this._y = Math.floor(Math.random() * 10 + 1) * 68
    this._rotation = [1, -1][Math.floor(Math.random() * 2)] * 45 - 90
  }

  get id() {
    return this._id
  }

  get name() {
    return this._name
  }

  get x() {
    return this._x
  }

  get y() {
    return this._y
  }

  get rotation() {
    return this._rotation
  }
}

// Socket logic
io.on("connection", socket => {
  socket.on("newGame", data => { // When a client makes a new game 
    let id = generate.generateId(roomIds)
    rooms[id] = new Room(id, socket)
    rooms[id].newPlayer(socket.id, data.name)
    rooms[id].powerupSpawner()

    socket.emit("drawBoard", rooms[id].board)
    socket.emit("drawRoomId", id)
    socket.emit("drawPlayers", rooms[id].players)
  })

  socket.on("joinGame", data => { // When a client joins a game
    Object.keys(rooms).forEach(key => {
      if (data.id === key) {
        rooms[data.id].newPlayer(socket.id, data.name)
        let playerIndex = rooms[data.id].getPlayer(socket.id)
        socket.broadcast.emit("newPlayer", {player: rooms[data.id].players[playerIndex], index: playerIndex})

        socket.emit("drawBoard", rooms[data.id].board)
        socket.emit("drawRoomId", data.id)
        socket.emit("drawPlayers", rooms[data.id].players)
      } else {
        socket.emit("invalidRoomId", data.id)
      }
    })
  })

  socket.on("disconnect", data => { // When a client leaves a game
    let roomId = getRoom(socket.id)
    if (roomId) {
      let playerIndex = rooms[roomId].getPlayer(socket.id)
      socket.broadcast.emit("playerLeft", {id: socket.id, name: rooms[roomId].players[playerIndex].name})

      rooms[roomId]._players.splice(playerIndex, 1)

      if (rooms[roomId]._players.length === 0) {
        delete rooms[roomId]
      }
    }
  })

  socket.on("getRoom", () => { // When a client requests the room
    let roomId = getRoom(socket.id)
    socket.emit("sendRoom", rooms[roomId])
  })

  socket.on("sendLocations", data => { // When a client sends their location info
    let roomId = getRoom(socket.id)
    let playerIndex = rooms[roomId].getPlayer(socket.id)
    rooms[roomId]._players[playerIndex]._x = data.x
    rooms[roomId]._players[playerIndex]._y = data.y
    rooms[roomId]._players[playerIndex]._rotation = data.rotation

    socket.broadcast.emit("renderMovement", rooms[roomId].players[playerIndex])
  })

  socket.on("sendBullet", data => {
    let roomId = getRoom(socket.id)
    let bullet = new Bullet(data.x, data.y, data.angle, roomId, data.powerup)
    io.emit("renderBullet", bullet)
  })

  socket.on("playerDied", id => {
    let roomId = getRoom(socket.id)
    let playerIndex = rooms[roomId].getPlayer(socket.id)

    rooms[roomId]._players[playerIndex]._alive = false
    rooms[roomId].checkNewRound()

    socket.broadcast.emit("removePlayer", id)
  })

  socket.on("getPowerup", powerup => {
    let roomId = getRoom(socket.id)
    let playerIndex = rooms[roomId].getPlayer(socket.id)

    rooms[roomId]._players[playerIndex].powerup = powerup._name
    io.emit("hasPowerup", {id: socket.id, powerup: powerup})
  })
})

const getRoom = id => {
  let val
  Object.keys(rooms).forEach(key => {
    for (let p of rooms[key].players) {
      if (id === p.id) { // Fix to getter func
        val = key
        return
      }
    }
  })
  return val
}
