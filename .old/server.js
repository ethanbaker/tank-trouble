//Import or require necessary dependencies 

const generate = require("./generate.js") //import generate file (that generates the random maps)

let express = require("express") //import the express library
let app = express() //create a new instance of the express of the app

let server = require("http").Server(app) //create a http server using the app and the http library

let io = require("socket.io").listen(server) //import the socket.io library and create a new instance

// -----------------------------

//Run the express server
let homeDir = __dirname + "/../public"
app.use(express.static(homeDir)) //Use the app to run an express server with the materials in the dirname/public
app.get("/", function (req, res) { //get what is in the directory
    res.sendFile(homeDir + "/index.html") //send what was got to the server (for clients to see)
})
server.listen(5001, function () { //start the server on port 80 (http)
    console.log(`Listening on ${server.address().port}`) //message to make sure that server is actually running
})

// -----------------------------

//socket.io logic that makes the game
io.on("connection", socket => { //when somebody connects to the game
    socket.on("clientMakeGame", data => { //when "clientMakeGame" is emitted from the socket on the client side
        totalRooms++ //adds 1 to the total number of rooms
        rooms[totalRooms] = { //creates the room 
            players: {}, //empty players object
            activePlayers: 0,
            alivePlayers: [],
            bullets: {}, //empty bullets object
            scores: {}, //empty scores object
            board: generate.generateBoard(),
            openColors: {"red": true, "yellow": true, "green": true, "blue": true, "purple": true}, //open colors used to color the players
            globalSettings: { //sets up a global settings object to hold settings made by the host (player who has been in the lobby the longest)
                toggleMouse: true,
                toggleCustomControls: true,
                togglePowerups: true,
            }
        }
        rooms[totalRooms].players[socket.id] = { //adds the current player to the room
            x: Math.floor(Math.random() * 10 + 1) * 68, //assuming tiles are 68 pixels wide and there are 10 tiles on the board 
            y: Math.floor(Math.random() * 10 + 1) * 68, //assuming tiles are 68 pixels wide and there are 10 tiles on the board
            rotation: Math.floor(Math.random() * 2) === 0 ? 90*Math.floor(Math.random() * 2) : 90+90*Math.floor(Math.random() * 2), //gives the player a random rotation
            id: socket.id, //gives the player an id of their socket id
            name: data.name, //gives the player a name of the data received
            color: giveColor(rooms[totalRooms]), //set up the player"s color
            room: totalRooms, //gives the player their room number
            localSettings: {
                mouse: false,
                customControls: {
                    left: "LEFT",
                    right: "RIGHT",
                    up: "UP",
                    down: "DOWN",
                    shoot: "SPACE"
                },
            }
        }
        rooms[totalRooms].bullets[socket.id] = [] //creates an empty array as the players bullets
        rooms[totalRooms].activePlayers++ //adds 1 to the activePlayers
        rooms[totalRooms].alivePlayers.push(socket.id) //pushes the current player to the alivePlayers array
        rooms[totalRooms].scores[socket.id] = 0 //makes the score of the player be 0
        socket.join("room-" + totalRooms) //has the player join a room with the id of that one greater of the last created room 
        socket.emit("getRoomId", "room-" + totalRooms)
        socket.emit("renderPlayers", rooms[totalRooms].players) //emit all of the players locations so the player can render them
    })
    socket.on("clientJoined", data => {
        //let rawRoom = io.nsps["/"].adapter.rooms[data.room] //grabs the room to see if it exists
        let roomNumber = Number(data.room.replace("room-", "")) //get the number at the end of the rooms
        if (rooms[roomNumber] && Object.keys(rooms[roomNumber].players).length < 5){//if room is not full and the room exists
            socket.join(data.room) //join the room
            rooms[roomNumber].players[socket.id] = { //adds the current player to the room
                x: Math.floor(Math.random() * 10 + 1) * 68, //assuming tiles are 68 pixels wide and there are 10 tiles on the board 
                y: Math.floor(Math.random() * 10 + 1) * 68, //assuming tiles are 68 pixels wide and there are 10 tiles on the board
                rotation: Math.floor(Math.random() * 2) === 0 ? 90*Math.floor(Math.random() * 2) : 90+90*Math.floor(Math.random() * 2), //gives the player a random rotation
                id: socket.id, //gives the player an id of their socket id
                name: data.name, //gives the player a name of the data received
                color: giveColor(rooms[roomNumber]), //set up the player"s color
                room: roomNumber, //gives the player their room number
                localSettings: {
                    mouse: true,
                    customControls: {
                        left: "LEFT",
                        right: "RIGHT",
                        up: "UP",
                        down: "DOWN",
                        shoot: "SPACE"
                    },
                }
            }
            rooms[roomNumber].bullets[socket.id] = [] //creates an empty array as the players bullets
            rooms[roomNumber].activePlayers++ //adds 1 to the activePlayers
            rooms[roomNumber].alivePlayers.push(socket.id) //pushes the current player to the alivePlayers array
            rooms[roomNumber].scores[socket.id] = 0 //makes the score of the player be 0
            socket.broadcast.to(data.room).emit("newPlayer", rooms[roomNumber].players[socket.id]) //notify current players of the new players arrival
            socket.emit("currentPlayers", rooms[roomNumber].players) //emit all of the players locations so the player can render them
        } else { //if the room is either full or doesn"t exist
            socket.emit("error", {message: `Sorry the room you are looking for either doesn"t exist or is full!`}) //emit "error" from the socket to alert the client that they can"t enter the room
        }
    })
    socket.on("disconnect", () => { //when the player disconnects
        rooms[getRoom(socket.id)].openColors[rooms[getRoom(socket.id)].players[socket.id].color] = true //open the color back up for other players
        rooms[getRoom(socket.id)].activePlayers-- //removes 1 from the active players
        rooms[getRoom(socket.id)].alivePlayers.splice(rooms[getRoom(socket.id)].alivePlayers.indexOf(socket.id)) //removes the players from the alivePlayers 
        delete rooms[getRoom(socket.id)].scores[socket.id] 
        delete rooms[getRoom(socket.id)].bullets[socket.id] //remove the players bullet array
        delete rooms[getRoom(socket.id)].players[socket.id] //remove this player from our players object
        io.emit("playerDisconnect", socket.id) //emit a message to all players to remove this player
    })

    socket.on("getBoard", () => { //when the "getBoard" socket is emitted from the client
        socket.emit("sendBoard", rooms[getRoom(socket.id)].board) //send the client the board when the client "asks" for it
    })

    socket.on("renderPlayerMovement", movementData => {
        rooms[getRoom(socket.id)].players[socket.id].x = movementData.x //the player"s x position is what the client says it is
        rooms[getRoom(socket.id)].players[socket.id].y = movementData.y //the player"s y position is what the client says it is
        rooms[getRoom(socket.id)].players[socket.id].rotation = movementData.rotation //the player"s rotation is what the client says it is
        socket.broadcast.emit("playerMoved", rooms[getRoom(socket.id)].players[socket.id])  //tell all the players (except the one that moved) about the player that moved
    })

    socket.on("makeBullet", bulletData => {
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number] = {} //adds a bullet to the server info as an empty object
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number].x = bulletData.x+16*Math.cos(bulletData.angle*Math.PI/180) //gives the bullet an x position
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number].y = bulletData.y+16*Math.sin(bulletData.angle*Math.PI/180) //gives the bullet a y position 
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number].angle = bulletData.angle //gives the player an angle
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number].velocityX = 150*Math.cos(bulletData.angle*Math.PI/180)*bulletData.invertedX //gives the bullet an x velocity 
        rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number].velocityY = 150*Math.sin(bulletData.angle*Math.PI/180)*bulletData.invertedY //gives the bullet a y velocity
        io.emit("renderBullet", rooms[getRoom(bulletData.player)].bullets[bulletData.player][bulletData.number]) //tells all of the players that a bullet has been fired with the specific properties.
    })
    socket.on("clientDied", playerId => {
        socket.broadcast.emit("removePlayer", playerId) //emit "removePlayer" to every other player that a player died
        rooms[getRoom(playerId)].alivePlayers.splice(rooms[getRoom(playerId)].alivePlayers.indexOf(playerId), 1)
        setTimeout(() => { //set a timeout to see if any other players die in 5 seconds
            if (rooms[getRoom(playerId)].alivePlayers.length <= 1) { //if there is less than or equal to one alive player 
                if (rooms[getRoom(playerId)].alivePlayers.length === 1) { //if there is only one alivePlayer
                    rooms[getRoom(playerId)].scores[rooms[getRoom(playerId)].alivePlayers[0]] += 1 //add 1 to their score
                    rooms[getRoom(playerId)].alivePlayers = [] //make the alivePlayers array empty
                }
                Object.keys(rooms[getRoom(playerId)].bullets).forEach(player => { //for every key in the bullets object
                    rooms[getRoom(playerId)].bullets[player] = [] //set the player"s bullet"s array to an empty one
                })
                Object.keys(rooms[getRoom(playerId)].players).forEach(player => { //for every key in the players object
                    rooms[getRoom(playerId)].alivePlayers.push(player) //push the alivePlayer to 
                    rooms[getRoom(playerId)].players[player].x = Math.floor(Math.random() * 10 + 1) * 68 //assuming tiles are 68 pixels wide and there are 10 tiles on the board 
                    rooms[getRoom(playerId)].players[player].y = Math.floor(Math.random() * 10 + 1) * 68 //assuming tiles are 68 pixels wide and there are 10 tiles on the board
                    rooms[getRoom(playerId)].players[player].rotation = Math.floor(Math.random() * 2) === 0 ? 90*Math.floor(Math.random() * 2) : 90+90*Math.floor(Math.random() * 2) //gives the player a random rotation 
                })
                rooms[getRoom(playerId)].board = generate.generateBoard() //give the room a new board
                io.emit("scoreUpdate", rooms[getRoom(playerId)]) //tells every player that the scores have changed
                io.emit("newRound", rooms[getRoom(playerId)]) //tell every player in the room that there is a new round
            }
        }, 5000)
    })
    socket.on("updateLocal", data => { //when the "updateLocal" socket is emitted from the client
        if (rooms[getRoom(data.id)].globalSettings.toggleMouse) { //if you can toggle mouse aiming (global setting)
            rooms[getRoom(data.id)].players[data.id].localSettings.mouse = data.settings.mouse //change the user setting for the mouse
        } else if (rooms[getRoom(data.id)].globalSettings.toggleCustomControls) { //if you can toggle custom controls (global setting)
            rooms[getRoom(data.id)].players[data.id].localSettings.up = data.settings.up //change the user setting for the custom control
            rooms[getRoom(data.id)].players[data.id].localSettings.down = data.settings.down //change the user setting for the custom control
            rooms[getRoom(data.id)].players[data.id].localSettings.left = data.settings.left //change the user setting for the custom control
            rooms[getRoom(data.id)].players[data.id].localSettings.right = data.settings.right //change the user setting for the custom control
            rooms[getRoom(data.id)].players[data.id].localSettings.shoot = data.settings.shoot //change the user setting for the custom control
        }
        socket.emit("localSettingsUpdated", rooms[getRoom(data.id)].players[data.id].localSettings) //tell the client who changed the settings that their settings have been updated
    })
    socket.on("updateGlobal", data => { //when the "updateGlobal" socket is emitted from the client
        rooms[getRoom(data.id)].globalSettings = data.localSettings //set the room"s global settings to the data from the client"s socket
        io.emit("globalSettingsUpdated", rooms[getRoom(data.id)].globalSettings) //tell every player that the global settings have been updated
    })
})

// -----------------------------

//functions used to help the game run
const giveColor = room => { //declares the function
    let chosenColor //creates an empty chosenColor variable
    Object.keys(room.openColors).forEach(color => { //for all of the keys in the openColors object
        if (room.openColors[color] && !chosenColor) { //if the value of the key is true and a color was not already chosen
            chosenColor = color //the chosen color is the current color
            room.openColors[color] = false //that color choice is removed from the open colors
        }
    })
    return chosenColor //return the chosen color
}

const getRoom = id => { //declares the function
    let roomNumber //creates an empty roomNumber variable
    for (let i = 0; i < rooms.length; i++) { //starts a for loop that will run for every item in the rooms array
        Object.keys(rooms[i].players).forEach(player => { //for every key in the room"s item"s players object
            if (id === player) { //if the id (parameter) is equal to the key
                roomNumber = i //the roomNumber is equal to the index of the room
                return //stop the forEach function
            }
        })
    }
    return roomNumber //return the roomNumber
}

// -----------------------------

//variables declared to help the game run
let totalRooms = -1 //number of rooms to keep track of the id
let rooms = [] //all of the rooms with all of the players
