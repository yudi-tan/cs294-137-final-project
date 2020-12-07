// global variable (initialized in setup) which tracks websocket connection to
// server. used to broadcast / receive events to and from server.
var socket;

// global variables to store the color picker and offset states
var paintColorPicker;
var backgroundColorPicker;
var brushColorLeft=[170,0,0,255], brushColorRight=[170,0,0,255]
var labelColorLeft=[170,0,0,255], labelColorRight=[170,0,0,255]

// var offsetSlider1;

// global variables tracking the color values.
let ir = 246, ig = 255, igp = 0, ib = 68;
let bg = [40,40,40]

// internal mapping to overwrite default p5.js APIs.
// key = p5.js original API name (e.g. "fill", "stroke" etc), value = custom functions.
let d = {};

//color picker related
var colorWheelSize = 130, margin = 20

/************************
 *                      *
 *    p5.js callbacks   *
 *                      *
 ************************/
 function preload() {
	colorWheel = loadImage("ColorWheel.png");
}

 // p5.js will first call this function upon starting.
function setup() {

  // Start by creating a websocket connection to the server to push and receive
  // canvas updates.
  socket = new WebSocket(`ws://${window.location.host}/comm`);
    
  // when the socket closes, issue an alert.
  socket.addEventListener('close', () => {
    alert("Socket connection to server closed.");
  });

  // when there's a message from the server, use the handleMessage function
  // to handle it.
  socket.addEventListener('message', message => {
    handleMessage(message.data);
  })  

  // Initialize the canvas to the size of the screen.
  createCanvas(window.innerWidth, window.innerHeight);
  fillD();
  initialization()
  background(bg); // change the background color using a color picker.
  stroke(255)
  line(d.width,0,d.width,d.height)
  // set up yuhan's color picker
  colorWheel.resize(colorWheelSize,colorWheelSize)
  image(colorWheel, margin, margin,colorWheelSize,colorWheelSize)
  image(colorWheel, d.width+margin, margin,colorWheelSize,colorWheelSize)
  textSize(20)
  d.noStroke()
  d.fill(255,255,255,255,255,255)
  createResetButton()
  createLoadButton()
  // set up keming's color pickers
  let paintHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
  let paintRColors = [[5, 100, 200], [25, 25, 25], [5, 100, 200], [5, 100, 200]]
  
  let backgroundHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
  let backgroundRColors = [[5, 100, 200], [25, 25, 25]]
  let starting_offset = width/2

  paintColorPicker = new ColorPickerKeming(width, height, starting_offset, paintHColors, paintRColors, "Paint", "lowerleft", d);
  backgroundColorPicker = new ColorPickerKeming(width, height, starting_offset, backgroundHColors, backgroundRColors, "Background", "lowerright", d);

  // offsetSlider1 = createSlider(0, width, starting_offset);
  // offsetSlider1.position(20, 20);
  
}

// p5.js will then repeatedly call this function to render drawings.
function draw() {
  ColorPicker(colorWheel, colorWheelSize, bg, margin, d, socket, mouseIsPressed, mouseX, mouseY, pmouseX, pmouseY)
  
  // keming color picker
  // let offset = offsetSlider1.value();

  // paintColorPicker.updateOffset(offset);
  // backgroundColorPicker.updateOffset(offset);

  paintColorPicker.display();
  backgroundColorPicker.display();
}

function mousePressed() {
  pc = paintColorPicker.retColorClicked();
  bc = backgroundColorPicker.retColorClicked();
  if (pc) {
    // TODO: synchronize this to other clients via ws.
    brushColorLeft = pc[0];
    labelColorLeft = pc[0];
    brushColorRight = pc[1];
    labelColorRight = pc[1];
    // as user changes brush color, we need to synchronize this change to other
    // clients too.
		payload = {
			type: "brush_color_change_left",
			payload: pc[0],
		}
    socket.send(JSON.stringify(payload));
    payload = {
			type: "brush_color_change_right",
			payload: pc[1],
		}
    socket.send(JSON.stringify(payload));
  }
  if (bc) {
    // currentBackgroundColor = bc;
     // TODO: synchronize this to other clients via ws.
    // TODO: update the left and right background colors correspondignly
    console.log("BC: ", bc);
  }
}

/************************
 *                      *
 *    custom handlers   *
 *                      *
 ************************/



// Core function which overwrites and extends default p5.js functions such as
// fill, stroke, etc.
function fillD() {
  // overwrite fill and stroke functions with d.fill and d.stroke such that they take in
  // RGG'B  and render rgb on left eye and rg'b on right eye.
  ["fill", "stroke"].forEach(fn => {
    d[fn] = (r1,g1,b1,r2,g2,b2) => {
      d[`${fn}_left`] = color(r1,g1,b1);
      d[`${fn}_right`] = color(r2,g2,b2);
    }
  });
  d["noStroke"] = ()=>{
      d["stroke_left"] = 0;
      d["stroke_right"] = 0;
  }
  // overwrite the p5.js APIs for drawing shapes / figures so that they take up
  // half the width, so the same image is shown on left and right side of canvas.
  // bitfield of indices that need to have "width/2" added
  [["ellipse", 0b1], ["rect", 0b1], ["text", 0b10], ["line", 0b0101]].forEach(([fn, idxs]) => {
    d[fn] = function() {
      let OG_f = window[fn];
      // we fill the left side with the rgb color
      if (d.fill_left) {
        fill(d.fill_left);
      } else {
        noFill();
      }
      // same for strokes, stroke left side with rgb
      if (d.stroke_left) {
        stroke(d.stroke_left);
      } else {
        noStroke();
      }
    
      OG_f.apply(window, Array.from(arguments));
      // for right side, we fill with rg'b
      if (d.fill_right) {
        fill(d.fill_right);
      } else {
        noFill();
      }
      // same for right side, we stroke with rg'b
      if (d.stroke_right) {
        stroke(d.stroke_right);
      } else {
        noStroke();
      }
      
      let newargs = Array.from(arguments).map((v, i) => ((2 ** i) & idxs) > 0 ? v + width/2 : v);
      OG_f.apply(window, newargs);
    }
  });

  d.width = width/2;
  d.height = height;
}



/************************
 *                      *
 *   websocket helpers  *
 *                      *
 ************************/

// Takes a JSON string with 2 keys (type, payload). Will process them
// differently based on the type.
function handleMessage(msg) {
  obj = JSON.parse(msg);
  switch (obj.type) {
    case "draw_stroke":
      pl = obj.payload
      paintbrushStroke(pl[0],pl[1],pl[2],pl[3],pl[4],pl[5]);
      break;
    case "reset_canvas":
      initialization();
      break;
    case "brush_color_change_left":
      brushColorLeft = obj.payload;
      labelColorLeft = obj.payload;
      break;
    case "brush_color_change_right":
      brushColorRight = obj.payload;
      labelColorRight = obj.payload;
      break;
    // add more cases here for other synchronization needs
    default:
      return
  }
}