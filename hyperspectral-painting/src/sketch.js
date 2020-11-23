// global variable (initialized in setup) which tracks websocket connection to
// server. used to broadcast / receive events to and from server.
var socket;

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
  // set up the color picker
  colorWheel.resize(colorWheelSize,colorWheelSize)
  image(colorWheel, margin, margin,colorWheelSize,colorWheelSize)
  image(colorWheel, d.width+margin, margin,colorWheelSize,colorWheelSize)
  textSize(20)
  d.noStroke()
  d.fill(255,255,255,255,255,255)
  d.text("using arrow keys to control left/right and brush size, DEL:erase",colorWheelSize+4*margin,margin-5)
  createResetButton()
  createLoadButton()
  
}

// p5.js will then repeatedly call this function to render drawings.
function draw() {
  ColorPicker(colorWheel, colorWheelSize, bg, margin, d)
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

function handleMessage(msg) {
  [mx, my, pmx, pmy] = msg.split(",").map(s => Number(s.trim()));
  paintbrushStroke(mx, my, pmx, pmy);
}