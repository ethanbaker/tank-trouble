# Tank Trouble Plan

## Phaser Game Logic

Logic/constructs for the phaser game the client will be playing in:
* Colored tank inside of a randomly generated map
* Movement with the arrows (default), mouse, or custom controls
* Shoot with space (default) or custom controls to spawn a bullet
* Client can only shoot 5 bullets with a 200ms separation between each bullet
* Power-ups spawn around the map after a designated period of time
* Power-ups can be used by client, which changes tank shape

## General Socket Logic

~~~go
type Room struct {
  id        string
  players   []Player
  board     Board
  settings  GlobalSettings
}
~~~

~~~go
type Player struct {
  id        string
  roomId    string
  name      string
  color     string
  x         float64
  y         float64
  rotation  float64
  score     int
  bullets   int
  alive     bool
  powerup   string
  settings  LocalSettings
}
~~~

---

Joining and leaving 

Create room:
* A room is added to the `room` list
* A board is generated for the room
* The initial player that created the room is added to the players array in the room. This entails:
  * Giving the player the correct id and name
  * Giving the player a random x, y, and rotation
  * Giving the player a color

Join room:
* The player that joined the room is added to the players array in the room. This entails:
  * Giving the player the correct id and name
  * Giving the player a random x, y, and rotation
  * Giving the player a color
* A socket event is emitted for the client that draws every other player
* A socket event is emitted for every other player to draw the client 

Leave room:
* Client is removed from everyone else's game

---

Live game updates

Player movement:
* Every client emits a socket event sending data to the server
* The server emits a socket event sending all the individual clients all of the other location info

Bullet movement:
* If a client fires a bullet, a socket event is emitted which sends the initial location and trajectory of the bullet to the server
* The server emits a socket event sending the bullet path and trajectory to every client
* Every client renders the bullet's location and trajectory

Client dies:
* If a bullet touches a client, the client is erased locally and a socket event is emitted to the server about the player's death
* The server emits an event to every client broadcasting the certain player's death
* Each client deletes the specific client that died

New round:
* If there is one or less clients left alive, the room will generate a new board, all players and bullets will be deleted, and each player will get a new spawn location and rotation. If there is one client left alive, they will get an extra point added on to their score.
* A plausible test to see if there is one or less clients left alive is to test whenever a client dies.

Power-up spawn:
* A timer on the server will emit a socket event to every player to make a power-up
* Each client will draw the power-up and the correct location

Power-up collection:
* Once a client touches a power-up, they emit a socket event to the server saying that they collected the power-up.  
* The server emits a socket event to every client about what client receives what power-up.
* Each client will draw the client that received the power-up with the correct turret.

---
