<!--
  Created by: Ethan Baker (contact@ethanbaker.dev)
  
  Adapted from:
    https://github.com/othneildrew/Best-README-Template/

Here are different preset "variables" that you can search and replace in this template.
`project_title`
`project_description`
`documentation_link`
`path_to_logo`
`path_to_demo`
-->

<div id="top"></div>


<!-- PROJECT SHIELDS/BUTTONS -->
<!-- 
  Netlify buttons:
[![Netlify Status]()]()
  Golang specific buttons:
[![GoDoc](https://godoc.org/github.com/ethanbaker/tank-trouble?status.svg)](https://godoc.org/github.com/ethanbaker/tank-trouble)
[![Go Report Card](https://goreportcard.com/badge/github.com/ethanbaker/tank-trouble)](https://goreportcard.com/report/github.com/ethanbaker/tank-trouble)
NEED GITHUB WORKFLOW [![Go Coverage](https://github.com/ethanbaker/tank-trouble/wiki/coverage.svg)](https://raw.githack.com/wiki/ethanbaker/tank-trouble/coverage.html)
-->
![1.0.0](https://img.shields.io/badge/status-1.0.0-red)
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]


<!-- PROJECT LOGO -->
<br><br><br>
<div align="center">
  <a href="https://github.com/ethanbaker/tank-trouble">
    <img src="path_to_logo" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Tank Trouble</h3>

  <p align="center">
    Tank fighting game built with NodeJS, Phaser3, and websockets
  </p>
</div>


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>


<!-- ABOUT -->
## About

![Project demonstration image][product-screenshot]

This is a simple clone of Tank Trouble but multiplayer. Up to five users can play concurrently. Different powerups exist in the game for users to use. Randomly generated maps reset on one (or none) players remaining.

#### Phaser Game Logic

Logic/constructs for the phaser game the client will be playing in:
* Colored tank inside of a randomly generated map
* Movement with the arrows (default), mouse, or custom controls
* Shoot with space (default) or custom controls to spawn a bullet
* Client can only shoot 5 bullets with a 200ms separation between each bullet
* Power-ups spawn around the map after a designated period of time
* Power-ups can be used by client, which changes tank shape

#### General Socket Logic

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


<p align="right">(<a href="#top">back to top</a>)</p>


### Built With

* [NodeJS](https://nodejs.org/en)
* [Phaser](https://phaser.io/)
* [Websockets](https://socket.io/)

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* You have git installed
* You have NodeJS installed

### Installation

1. Clone this repository
1. Run `node server/server.js` to start the server
1. Visit `localhost:8080` on your web-browser (or whatever server this program is running on)

If you want to run this program off of a different port, change the port number in `server.js`.

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- ROADMAP -->
## Roadmap

- [ ] Complete all powerups
- [ ] Add styles

See the [open issues][issues-url] for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- CONTRIBUTING -->
## Contributing

For issues and suggestions, please include as much useful information as possible.
Review the [documentation][documentation-url] and make sure the issue is actually
present or the suggestion is not included. Please share issues/suggestions on the
[issue tracker][issues-url].

For patches and feature additions, please submit them as [pull requests][pulls-url]. 
Please adhere to the [conventional commits][conventional-commits-url]. standard for
commit messaging. In addition, please try to name your git branch according to your
new patch. [These standards][conventional-branches-url] are a great guide you can follow.

You can follow these steps below to create a pull request:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b branch_name`)
3. Commit your Changes (`git commit -m "commit_message"`)
4. Push to the Branch (`git push origin branch_name`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- LICENSE -->
## License

This project uses the Apache 2.0 license.

You can find more information in the [LICENSE][license-url] file.

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- CONTACT -->
## Contact

Ethan Baker - contact@ethanbaker.dev - [LinkedIn][linkedin-url]

Project Link: [https://github.com/ethanbaker/tank-trouble][project-url]

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/ethanbaker/tank-trouble.svg
[forks-shield]: https://img.shields.io/github/forks/ethanbaker/tank-trouble.svg
[stars-shield]: https://img.shields.io/github/stars/ethanbaker/tank-trouble.svg
[issues-shield]: https://img.shields.io/github/issues/ethanbaker/tank-trouble.svg
[license-shield]: https://img.shields.io/github/license/ethanbaker/tank-trouble.svg
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?logo=linkedin&colorB=555

[contributors-url]: <https://github.com/ethanbaker/tank-trouble/graphs/contributors>
[forks-url]: <https://github.com/ethanbaker/tank-trouble/network/members>
[stars-url]: <https://github.com/ethanbaker/tank-trouble/stargazers>
[issues-url]: <https://github.com/ethanbaker/tank-trouble/issues>
[pulls-url]: <https://github.com/ethanbaker/tank-trouble/pulls>
[license-url]: <https://github.com/ethanbaker/tank-trouble/blob/master/LICENSE>
[linkedin-url]: <https://linkedin.com/in/ethandbaker>
[project-url]: <https://github.com/ethanbaker/tank-trouble>

[product-screenshot]: ./docs/demonstration.png
[documentation-url]: <documentation_link>

[conventional-commits-url]: <https://www.conventionalcommits.org/en/v1.0.0/#summary>
[conventional-branches-url]: <https://docs.microsoft.com/en-us/azure/devops/repos/git/git-branching-guidance?view=azure-devops>