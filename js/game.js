const LeftCell = 0;
const TopCell = 1;
const RightCell = 2;
const BottomCell = 3;

function random(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function middlePosition(distance) {

  let middle = Math.floor(distance / 2);
  let result = (distance % 2 == 0) ? random(middle-1, middle) : middle;
  return result;
}

function Game() {
  var canvas = this.getCanvas();
  var helper = this.getHelper();
  this.controllers = [];

  this.mouseX = this.mouseY = 0;
  this.gridX = this.gridY = -1;
  this.gridWall = true;

  // Create a grid with a floor over its entire width
  this.grid = new PlatformerGrid(
    Math.floor(canvas.width / this.GRID_RESOLUTION),
    Math.floor(canvas.height / this.GRID_RESOLUTION),
    this.GRID_RESOLUTION);

  console.log("grid: w="+this.grid.width+", h="+this.grid.height);

  // Complete grid with all walls and ceilings
  for(var x = 0; x < this.grid.width; ++x) {
    for(var y = 0; y < this.grid.height; ++y) {
      this.grid.setCeiling(x, y, true);    
      this.grid.setWall(x, y, true);
      var item  = { 'x' : x , 'y' : y, 'cell' : this.grid.getCell(x, y) };
    }
  }

  // Generate maze
  this.stack = new Stack();
  this.mazeGenerate();

  // Players and finish
  this.player = [];
  this.player[0] = new PlatformerNode(2, 2, this.PLAYER_SIZE, this.PLAYER_SIZE, "orange");
  this.grid.addNode(this.player[0]);
  this.player[1] = new PlatformerNode(canvas.width - this.PLAYER_SIZE - 2 , canvas.height - this.PLAYER_SIZE - 2, this.PLAYER_SIZE, this.PLAYER_SIZE, "green");
  this.grid.addNode(this.player[1]);



  var fx = middlePosition(this.grid.width-1) * this.GRID_RESOLUTION;
  var fy = middlePosition(this.grid.height-1) * this.GRID_RESOLUTION;
  console.log("finish: fx="+fx+", fy="+fy);

  var finish = new PlatformerNode(fx+4, fy+4, this.PLAYER_SIZE+2, this.PLAYER_SIZE, "red");
  finish.finish = true;
  this.grid.addNode(finish);

  this.addListeners();
};

Game.prototype = {
  GRID_RESOLUTION: 32,
  PLAYER_SIZE: 24,
  PAINT_STROKE_STYLE: "lime",
  ERASE_STROKE_STYLE: "red",
  PLAYER_WALK_SPEED: 270,
  PLAYER_WALK_ACCELERATION: 3500,

  P1_KEY_LEFT: 65,
  P1_KEY_UP: 87,
  P1_KEY_RIGHT: 68,
  P1_KEY_DOWN: 83,

  P2_KEY_LEFT: 37,
  P2_KEY_UP: 38,
  P2_KEY_RIGHT: 39,
  P2_KEY_DOWN: 40,  

  mazeGenerate() {
    // https://en.wikipedia.org/wiki/Maze_generation_algorithm#Iterative_implementation
    let rx= Math.floor(Math.random() * (this.grid.width-1));
    let ry= Math.floor(Math.random() * (this.grid.height-1));
    let initial  = { 'x' : rx , 'y' : ry, 'cell' : this.grid.getCell(rx, ry) };
    initial.cell.visited = true;
    this.stack.push(initial);

    while (!this.stack.isEmpty()) {

      let current = this.stack.pop();
      let x = current.x;
      let y = current.y;
      //console.log("mazeGenerate: "+x+","+y);

      if (!this.allNeighboursVisited(x, y)) {

        this.stack.push(current);

        let choosing = true;
        while (choosing) {

          let position = Math.floor(Math.random() * 4);
          let neighbour = this.pickNeighbour(position, current);
          //console.log("Choosing: "+neighbour.x+", "+neighbour.y);

          if (neighbour.x > this.grid.width-2 || neighbour.x < 0 ||
              neighbour.y < 0 || neighbour.y > this.grid.height-2) {
            //console.log(" -> Out of grid!");
            continue;
          }

          if (!neighbour.cell.visited) {
            //console.log("Chose unvisited neighbour");
            this.removeWall(position, current, neighbour)
            neighbour.cell.visited = true;
            this.stack.push(neighbour);
            choosing = false;
          }
        }
      } else {
        //console.log("No more unvisited neighbour");
      }
    }
  },

  allNeighboursVisited(x, y) {

    var leftNeighbour = (x > 0) ? this.grid.getCell(x-1, y).visited : true;
    var upNeighbour = (y > 0) ? this.grid.getCell(x, y-1).visited : true;
    var rightNeighbour = (x < this.grid.width-2) ? this.grid.getCell(x+1, y).visited : true;
    var downNeighbour = (y < this.grid.height-2) ? this.grid.getCell(x, y+1).visited : true;
    return leftNeighbour && upNeighbour && rightNeighbour && downNeighbour;
  },

  pickNeighbour(position, current) {
    let dx = 0;
    let dy = 0;
    switch(position) { 
      case(LeftCell): dx = -1; break;
      case(TopCell): dy = -1; break;
      case(RightCell): dx = 1; break;
      case(BottomCell): dy = 1; break;
    }

    let nx = current.x + dx;
    let ny = current.y + dy;
    let neighbour = { 'x' : nx , 'y' : ny, 'cell' : this.grid.getCell(nx, ny) };
    return neighbour;
  },

  removeWall(position, current, neighbour) {
    switch(position) { 
      case(LeftCell): current.cell.wall = false; break;
      case(TopCell): current.cell.ceiling = false; break;
      case(RightCell): neighbour.cell.wall = false; break;
      case(BottomCell): neighbour.cell.ceiling = false; break;
    }
  },

  addListeners() {
    this.getCanvas().addEventListener("click", this.mouseClick.bind(this));
    this.getCanvas().addEventListener("mousemove", this.mouseMove.bind(this));
    this.getCanvas().addEventListener("mouseout", this.mouseLeave.bind(this));

    window.addEventListener("keydown", this.keyDown.bind(this));
    window.addEventListener("keyup", this.keyUp.bind(this));
    window.addEventListener("gamepadconnected", this.gamepadHandler.bind(this));
  },

  getCanvas() {
    return document.getElementById("renderer");
  },

  getHelper() {
    return document.getElementById("helper");
  },

  run() {
    this.lastTime = new Date();

    window.requestAnimationFrame(this.animate.bind(this));
  },

  gamepadHandler(e) {
    this.addgamepad(e.gamepad);
  },

  keyDown(e) {
    switch(e.keyCode) {
      case this.P1_KEY_RIGHT:
        this.player[0].right = true;
        break;
      case this.P1_KEY_LEFT:
        this.player[0].left = true;
        break;
      case this.P1_KEY_UP:
        this.player[0].up = true;
        break;
      case this.P1_KEY_DOWN:
        this.player[0].down = true;
        break;        
  
      case this.P2_KEY_RIGHT:
        this.player[1].right = true;
        break;        
      case this.P2_KEY_LEFT:
        this.player[1].left = true;
        break;
      case this.P2_KEY_UP:
        this.player[1].up = true;
        break;
      case this.P2_KEY_DOWN:
        this.player[1].down = true;
        break;             
    }
  },

  keyUp(e) {
    switch(e.keyCode) {
      case this.P1_KEY_RIGHT:
        this.player[0].right = false;
        break;
      case this.P1_KEY_LEFT:
        this.player[0].left = false;
        break;
      case this.P1_KEY_UP:
        this.player[0].up = false;
        break;
      case this.P1_KEY_DOWN:
        this.player[0].down = false;
        break;        

      case this.P2_KEY_RIGHT:
        this.player[1].right = false;
        break;
      case this.P2_KEY_LEFT:
        this.player[1].left = false;
        break;
      case this.P2_KEY_UP:
        this.player[1].up = false;
        break;
      case this.P2_KEY_DOWN:
        this.player[1].down = false;
        break;            
      }
  },

  mouseClick(e) {
    if(this.gridX == -1 || this.gridY == -1)
      return;

    // Toggle selected edge
    if(this.gridWall)
      this.grid.setWall(this.gridX, this.gridY, !this.grid.getWall(this.gridX, this.gridY));
    else
      this.grid.setCeiling(this.gridX, this.gridY, !this.grid.getCeiling(this.gridX, this.gridY));
  },

  mouseMove(e) {
    const bounds = this.getCanvas().getBoundingClientRect();

    this.mouseX = e.clientX - bounds.left;
    this.mouseY = e.clientY - bounds.top;
    this.gridX = Math.floor(this.mouseX / this.GRID_RESOLUTION);
    this.gridY = Math.floor(this.mouseY / this.GRID_RESOLUTION);

    this.findSelectedEdge();
  },

  findSelectedEdge() {
    const deltaX = this.mouseX - this.gridX * this.GRID_RESOLUTION;
    const deltaY = this.mouseY - this.gridY * this.GRID_RESOLUTION;
    this.gridWall = deltaX * deltaX < deltaY * deltaY;

    if(deltaX + deltaY > this.GRID_RESOLUTION) {
      if(deltaX > deltaY) {
        this.gridX = Math.min(this.gridX + 1, this.grid.width);
      }
      else {
        this.gridY = Math.min(this.gridY + 1, this.grid.height);
      }

      this.gridWall = !this.gridWall;
    }
  },

  mouseLeave(e) {
    this.gridX = this.gridY = -1;
  },

  animate() {
    var time = new Date();
    var timeStep = (time.getMilliseconds() - this.lastTime.getMilliseconds()) / 1000;
    if(timeStep < 0)
      timeStep += 1;

    this.lastTime = time;

    this.movePlayer(this.player[0], timeStep);
    this.movePlayer(this.player[1], timeStep);

    this.grid.update(timeStep);
    this.render(timeStep);

    window.requestAnimationFrame(this.animate.bind(this));
  },

  movePlayer(player, timeStep) {
    if(player.right) {
      player.setvx(Math.min(player.vx + this.PLAYER_WALK_ACCELERATION * timeStep, this.PLAYER_WALK_SPEED));
    }

    if(player.left) {
      player.setvx(Math.max(player.vx - this.PLAYER_WALK_ACCELERATION * timeStep, -this.PLAYER_WALK_SPEED));
    }

    if(player.down) {
      player.setvy(Math.min(player.vy + this.PLAYER_WALK_ACCELERATION * timeStep, this.PLAYER_WALK_SPEED));
    }

    if(player.up) {
      player.setvy(Math.max(player.vy - this.PLAYER_WALK_ACCELERATION * timeStep, -this.PLAYER_WALK_SPEED));
    }

    if(player.x < -player.width) {
      player.x = this.getCanvas().width - 1;
      player.y = player.y-1;
    }
    else if (player.x > this.getCanvas().width) {
      player.x = -player.width;
    } else if (player.y > this.getCanvas().height) {
      player.y = 0;
    }
  },

  render(timeStep) {
    var canvas = this.getCanvas();
    var context = canvas.getContext("2d");

    var helper = this.getHelper();
    var helpCtx = helper.getContext("2d");

    helpCtx.clearRect(0, 0, helper.width, helper.height);
    helpCtx.fillStyle = "white";
    helpCtx.beginPath();
    helpCtx.rect(0, 0, helper.width, helper.height);
    helpCtx.fill();

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "white";
    context.beginPath();
    context.rect(0, 0, canvas.width, canvas.height);
    context.fill();

    this.grid.draw(context, helpCtx);

    var gX = this.gridX; var gY = this.gridY;

    // Draw selected edge
    if(gX != -1 && gY != -1) {
      context.beginPath();
      context.lineWidth = PlatformerGrid.prototype.EDGE_LINE_WIDTH;

      if(this.gridWall) {
        if(this.grid.getWall(gX, gY))
          context.strokeStyle = this.ERASE_STROKE_STYLE;
        else
          context.strokeStyle = this.PAINT_STROKE_STYLE;

        context.moveTo(gX * this.GRID_RESOLUTION, gY * this.GRID_RESOLUTION);
        context.lineTo(gX * this.GRID_RESOLUTION, (gY + 1) * this.GRID_RESOLUTION);
      }
      else {
        if(this.grid.getCeiling(gX, gY))
          context.strokeStyle = this.ERASE_STROKE_STYLE;
        else
          context.strokeStyle = this.PAINT_STROKE_STYLE;

        context.moveTo(gX * this.GRID_RESOLUTION, gY * this.GRID_RESOLUTION);
        context.lineTo((gX + 1) * this.GRID_RESOLUTION, gY * this.GRID_RESOLUTION);
      }

      context.stroke();
    }
  },

  gamepadPlayerUpdate(controller, player) {

    for (var i=0; i<controller.buttons.length; i++) {
      var val = controller.buttons[i];
      var pressed = val == 1.0;
      if (typeof(val) == "object") {
        pressed = val.pressed;
        //val = val.value; // for triggers
      }

      if (pressed) {
        console.log("pressed: "+i);
        if (i == 0) { // button A

        }
      }
    }

    for (var i=0; i<controller.axes.length; i++) {

      var value = controller.axes[i].toFixed(4);
      var limit = 0.25;
      if ( Math.abs(value) > limit) {
        console.log("axes:"+i +" value:"+value);
      }
      if (i == 0) { // Left Axes
          if (value > 0.25) {
            player.right = true;
            this.playBip();
          } else {
            player.right = false;
          }

          if (value < -0.25) {
            player.left = true;
            this.playBip();
          } else {
            player.left = false;
          }
      }
      if (i == 1) { // Left Axes
        if (value > 0.25) {
          player.down = true;
          this.playBip();
        } else {
          player.down = false;
        }

        if (value < -0.25) {
          player.up = true;
          this.playBip();
        } else {
          player.up = false;
        }
    }      

    }
  },
  playBip() {
    var audio = new Audio('bip.wav');
    //audio.play();
  },
  gamepadUpdate() {
    this.scangamepads();
    for (i in this.controllers) {
      var controller = this.controllers[i];
      this.gamepadPlayerUpdate(controller, this.player[i]);
    }
    window.requestAnimationFrame(this.gamepadUpdate.bind(this));
  },

  scangamepads() {
    var gamepads = navigator.getGamepads();
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && (gamepads[i].index in this.controllers)) {
        this.controllers[gamepads[i].index] = gamepads[i];
      }
    }
  },

  addgamepad(gamepad) {
    console.log("gamepad.index:"+gamepad.index);
    this.controllers[gamepad.index] = gamepad;
    window.requestAnimationFrame(this.gamepadUpdate.bind(this));
  },
};
