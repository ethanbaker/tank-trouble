//Generate a random map
const generateBoard = () => {
    let board = [] //create the board
    let k = 0 //for index key
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) { //push 100 spaces to the board with info
            board.push({
                row: i+1,
                col: j+1,
                top: false,
                bottom: false,
                left: false,
                right: false,
                ableToConnect: false,
                index: k
            })
            k++
        }
    }

    let directions = ['top', 'bottom', 'left', 'right'] //creates an array with all of the walls directions can be in
    let chosen //set up the variable that controls the while loops
    for (let i of board) {
        chosen = false 

        if (Math.floor(Math.random() * 2) === 0) { // 50% chance for there to be a wall
            i[directions[Math.floor(Math.random() * 4)]] = true //give one of the sides the true value
        }

        if (Math.floor(Math.random() * 2) === 0) {
            while (!chosen) { //creates a while loop to give a side different from one that might be chosen in the previous if statement is a wall
                let j = Math.floor(Math.random() * 4)
                if (!i[directions[j]]) {
                    i[directions[j]] = true
                    chosen = true
                }
            }
        }
        chosen = false

        if (Math.floor(Math.random() * 2) === 0) {
            while (!chosen) { //creates a while loop to give a side different from one that might be chosen in the previous if statement is a wall 
                let j = Math.floor(Math.random() * 4)
                if (!i[directions[j]]) {
                    i[directions[j]] = true
                    chosen = true
                }
            }
        }

        if (i.row === 1) i.top = true //if the box is on the edge, the direction of the edge gets a wall
        if (i.row === 10) i.bottom = true
        if (i.col === 1) i.left = true
        if (i.col === 10) i.right = true
    }

    //printBoard(board) //print the board 
    //console.log()

    for (let i of board) { //for every tile on the board,
        if (i.row === 1 && i.col === 1) { //if the element is index 0 (row 1 col 1)
            i.ableToConnect = true //it is able to connect
        }
        
        let currentPos = {row: i.row, col: i.col, index: i.index} //sets the current position to the tile iterating
        let moved = [] //sets the past moves array empty (where the AI has moved already)
        let canMove = [] //sets the possible but not chosen moves array empty (where the AI could have moved somewhere but didn't)

        while (!i.ableToConnect) { //while the tile is unable to connect
            if (!board[currentPos.index].top && currentPos.index > 9 && currentPos.row > 1 && !board[currentPos.index-10].bottom && !moved.includes(currentPos.index-10) && !moved.includes(currentPos.index) && !canMove.includes(currentPos.index)) { //if there is not a wall above or a wall below on the tile above (if there even is a tile above) and the tile wanting to be moved to is not already in one of the two moves arrays
                canMove.push(currentPos.index-10) //add the tile above to the canMove array
                //console.log('can move up')
            } 
            if (!board[currentPos.index].left && currentPos.index > 0 && currentPos.col > 1 && !board[currentPos.index-1].right && !moved.includes(currentPos.index-1) && !moved.includes(currentPos.index) && !canMove.includes(currentPos.index)) { //as said above but with left and right instead of top and bottom
                canMove.push(currentPos.index-1) //add the tile to the left to the canMove array
                //console.log('can move left')
            }
            if (!board[currentPos.index].right && currentPos.index < 99 && currentPos.col < 10 && !board[currentPos.index+1].left && !moved.includes(currentPos.index+1) && !moved.includes(currentPos.index) && !canMove.includes(currentPos.index)) {// ^ 
                canMove.push(currentPos.index+1) //add the tile to the right to the canMove array
                //console.log('can move right')
            }
            if (!board[currentPos.index].bottom && currentPos.index < 90 && currentPos.row < 10 && !board[currentPos.index+10].top && !moved.includes(currentPos.index+10) && !moved.includes(currentPos.index)&& !canMove.includes(currentPos.index)) {//same as t
                canMove.push(currentPos.index+10) //add the tile to the bottom to the canMove array
                //console.log('can move down')
            }

            if (!board[currentPos.index].top && currentPos.index > 9 && currentPos.row > 1 && !board[currentPos.index-10].bottom && !moved.includes(currentPos.index-10)) { //if there is no wall to the top of the current tile or on the bottom of the tile to the top (if there even is a tile above the current one)
                moved.push(currentPos.index) //push the current tile to the moved array (history)
                let index = canMove.indexOf(currentPos.index-10) //find the index of the top tile
                if (index > -1) { //check to make sure the tile is actually in the array
                    canMove.splice(index, 1) //remove the tile
                }
                currentPos.row -= 1 //move one row up
                currentPos.index -= 10 //(1 row = 10 index)
                //console.log('moving top')
            } else if (!board[currentPos.index].left && currentPos.index > 0 && currentPos.col > 1 && !board[currentPos.index-1].right && !moved.includes(currentPos.index-1)) { //if there is no wall to the left of the current tile or on the right of the tile to the left (if there even is one) 
                moved.push(currentPos.index) //push the current tile to the moved array (history)
                let index = canMove.indexOf(currentPos.index-1) //find the index of the left tile
                if (index > -1) { //check to make sure the tile is actually in the array
                    canMove.splice(index, 1) //remove the tile
                }
                currentPos.col -= 1 //move one column left
                currentPos.index -= 1 //(1 col = 1 index)
                //console.log('moving left')
            } else if (!board[currentPos.index].right && currentPos.index < 99 && currentPos.col < 10 && !board[currentPos.index+1].left && !moved.includes(currentPos.index+1)) { //if there is no wall to the right of the current tile or on the left of the tile to the right (if there even is a tile)
                moved.push(currentPos.index) //push the current tile to the moved array (history)
                let index = canMove.indexOf(currentPos.index+1) //find the index of the right tile
                if (index > -1) { //check to make sure the tile is actually in the array
                    canMove.splice(index, 1) //remove the tile
                }
                currentPos.col += 1 //move one column left 
                currentPos.index += 1 //(1 col = 1 index)
                //console.log('moving right')
            } else if (!board[currentPos.index].bottom && currentPos.index < 90 && currentPos.row < 10 && !board[currentPos.index+10].top && !moved.includes(currentPos.index+10)) { //if there is no wall to the bottom of the current tile or on the top of the tile below the current tile (if there even is a tile)
                moved.push(currentPos.index) //push the current tile to the moved array (history)
                let index = canMove.indexOf(currentPos.index+10) //find the index of the bottom tile
                if (index > -1) { //check to make sure the tile is actually in the array
                    canMove.splice(index, 1) //remove the tile
                }
                currentPos.row += 1 //move the tile one row down
                currentPos.index += 10 //(1 row = 10 index)
                //console.log('moving bottom')
            } else { //if the AI cannot move
                if (canMove.length === 0) { //if there are no places the AI could have moved
                    let done = false //sets up the variable that controls the while loop that destroys a wall
                    let tile //sets up the variable that will hold the tile that will have a wall be destroyed
                    if (moved.length !== 0) { //if there are tiles in the moved array
                        tile = board[moved.sort((a, b) => {return a - b})[0]] //set the tile as the tile closest to index 0 (row 1 col 1)
                    } else { //if there are no tiles in the moved array
                        tile = i //the tile is equal to the starting tile (in for loop)
                    }
                    while (!done) { //while done is false
                        let j = Math.floor(Math.random() * 4) //generate a random number so a random wall will get destroyed (it must be random so patterns aren't obvious)
                        if (tile.index > 9 && tile.row > 1 &&(tile.top || board[tile.index-10].bottom) && j === 0) { //if there is a wall to the top that is not on the outside of the board and j is 0
                            board[tile.index].top = false //remove the top wall (if it is there) of the current tile
                            board[tile.index-10].bottom = false //remove the bottom wall (if it is there) of the tile above the current one
                            done = true //set done to true to get rid of the while loop
                            //console.log('removing top at ' + tile.index)
                        } else if (tile.index > 0 && tile.col > 1 && (tile.left || board[tile.index-1].right) && j === 1) { //if there is a wall to the left that is not on the outside of the board and j is 1
                            board[tile.index].left = false //remove the left wall (if it is there) of the current tile
                            board[tile.index-1].right = false //remove the right wall (if it is there) of the tile left of the current one
                            done = true //set done to true to get rid of the while loop
                            //console.log('removing left at ' + tile.index)
                        } else if (tile.index < 99 && tile.col < 10 &&(tile.right || board[tile.index+1].left) && j === 2) { //if there is a wall to the right that is not on the outside of the board and j is 2
                            board[tile.index].right = false //remove the right wall (if it is there) of the current tile
                            board[tile.index+1].left = false //remove the left wall (if it is there) of the wall to the right
                            done = true //set done to true to get rid of the while loop
                            //console.log('removing right at ' + tile.index)
                        } else if (tile.index < 89 && tile.row < 10 && (tile.bottom || board[tile.index+10].top) && j === 3) { //if there is a wall to the bottom that is not on the outside of the board and j is 3
                            board[tile.index].bottom = false //remove the bottom wall (if it is there) of the current tile
                            board[tile.index+10].top = false //remove the top wall (if it is there) of the wall below 
                            done = true //set done to true to get rid of the while loop
                            //console.log('removing bottom at ' + tile.index)
                        } else { //if a wall cannot be destroyed
                            done = true //set done to true to get rid of the while loop
                        }
                    }
                    currentPos = {row: i.row, col: i.col, index: i.index} //after the wall is destroyed, set the current position to the original tile
                    //console.log('moving to ' + currentPos.index)
                } else { //if there are still tiles in canMove (the AI could have moved there but didn't)
                    currentPos = {row: board[canMove[0]].row, col: board[canMove[0]].col, index: canMove[0]} //move the AI to the place where the AI could have moved
                    canMove.splice(0, 1) //remove the tile from the canMove array
                    //console.log('moving to ' + currentPos.index)
                }

            }
            if (currentPos.row === 1 && currentPos.col === 1 && currentPos.index === 0) { //if the AI is at index 0 (row 1 col 1)
                i.ableToConnect = true //sets ableToConnect to true to break the while loop
                break //break the loop just incase
            }
        }
        //console.log(i.index + ' is done')
    }

    //eliminates double walls ( left and right wall next to each other or top and bottom wall next to each other)
    for (let i of board) { //for every tile in board
        if (i.index < 99 && i.col < 10 && i.right && board[i.index+1].left) { //if the tile is not the last one and is not in column 10 and the right wall is true and the left wall of the tile to the right is true
            board[i.index+1].left = false //delete the left wall of the tile to the right
        }
        if (i.index < 89 && i.bottom && board[i.index+10].top) { //if the tile is not in the bottom row and the bottom wall is true and the top wall of the tile below it is true
            board[i.index+10].top = false //delete the top wall of the tile below
        }
    }

    return board
    printBoard(board) //print the board after everything is completed
}

// ---------------------------------------------------------------------------------------------------------------

const printBoard = board => { //prints the entire board out
    for (let i of board) { //for every tile of the board
        let string = '' //creates an empty string
        i.left ? string += '[' : string += ' ' //if the tile's left wall is true, add [ to the string
        i.top ? string += '^' : string += ' ' //if the tile's top wall is true, add ^ to the string
        i.bottom ? string += '_' : string += ' ' //if the tile's bottom wall is true, add _ to the string
        i.right ? string += ']' : string += ' ' //if the tile's right wall is true, add ] to the string
        process.stdout.write(string) //write out the string to the console (using process.stdout.write to make sure there is no line return)
        if (i.col === 10) { //after there is 10 columns, create a line return
            console.log() //line return
        }
    }
}

const printItem = i => {
    let string = '' //creates an empty string
    i.left ? string += '[' : string += ' ' //if the tile's left wall is true, add [ to the string
    i.top ? string += '^' : string += ' ' //if the tile's top wall is true, add ^ to the string
    i.bottom ? string += '_' : string += ' ' //if the tile's bottom wall is true, add _ to the string
    i.right ? string += ']' : string += ' '  //if the tile's right wall is true, add ] to the string
    process.stdout.write(string) //write out the string to the console (using process.stdout.write to make sure there is no line return) 
    if (i.col === 10) { //after there is 10 columns, create a line return 
        console.log() //line return
    }    
}

let tokens = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("")
const generateId = ids => {
  let id = ""
  for (let i = 0; i < 10; i++) {
    id += tokens[Math.floor(Math.random() * tokens.length)]
  }

  if (!(id in ids)) {
    return id
  }
  return generateId(ids)
}

module.exports = {
    generateBoard,
    generateId
}

//generateBoard()
//console.log(generateId([]))
