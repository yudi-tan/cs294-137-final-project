// this version is an attempt at integration ... DOESN'T WORK :(
// global variable (initialized in setup) which tracks websocket connection to
// server. used to broadcast / receive events to and from server.
var socket;

// global variables (we manually set) that contain all the hyperspectral and regular colors we want to include
let paintHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]];
let paintRColors = [[5, 100, 200], [25, 25, 25]];
let backgroundHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]];
let backgroundRColors = [[5, 100, 200], [25, 25, 25]];
let starting_offset = width/2;

// global variable to track what the current desired color is
let currPaintColor;
let currBackgroundColor;

// discrete color pickers, tracked globally
var paintColorPicker;
var backgroundColorPicker;

// controlling user offset to adapt to different users
var offsetSlider;

// internal mapping to overwrite default p5.js APIs.
// key = p5.js original API name (e.g. "fill", "stroke" etc), value = custom functions.
let d = {};

// continuous color picker stuff, tracked globally
var colorWheelSize = 130, margin = 20
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

  // Initialize the canvas to the size of the screen
  createCanvas(window.innerWidth, window.innerHeight);  

  // create special functions for drawing and filling
  fillD(starting_offset);
  // add some of the continuous color picker stuff - maybe don't need this?
  initialization();

  // bisecting line in middle of screen
  line(d.width,0,d.width,d.height)

  // set up the discrete color pickers
  paintColorPicker = new ColorPicker(width, height, starting_offset, paintHColors, paintRColors, "Paint", "lowerleft");
  backgroundColorPicker = new ColorPicker(width, height, starting_offset, backgroundHColors, backgroundRColors, "Background", "lowerright");

  // set up the offset controller
  offsetSlider1 = createSlider(0, width, starting_offset);
  offsetSlider1.position(20, 20);

  // set the intial background color and initial paint colors
  

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

  // deal with resized screen/different offset; update the values
  let offset = offsetSlider1.value();
  paintColorPicker.updateOffset(offset);
  backgroundColorPicker.updateOffset(offset);
  paintColorPicker.display();
  backgroundColorPicker.display();
  fillD(offset);

  if (currBackgroundColor.length === 3) {
    background(currBackgroundColor);
  } else {
    // create a left and right background;
    background(currBackgroundColor[1]);
    fill(currBackgroundColor[0]);
    //"backgruond" that appears on the left
    rect(0,0, width/2, height);
  }
  

  // what sucks about this approach is that once you've set an offset/screen size, you're stuck. 
  // should be rerendering strokes in the draw function according to a buffer 

}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  paintColorPicker.update(width, height);
  backgroundColorPicker.update(width, height);
  // this doesn't change the offset value; on next render (draw()), the offset is updated again, and so are the fillD functions.
}

function mousePressed() {
  let possiblePaintColor = paintColorPicker.retColorClicked();
  let possibleBackgroundColor = backgroundColorPicker.retColorClicked();

  // only set if not null
  currPaintColor = (possiblePaintColor) ? possiblePaintColor : currPaintColor;
  currBackgroundColor = (possibleBackgroundColor) ? possibleBackgroundColor : currBackgroundColor;
  console.log(currPaintColor, currBackgroundColor, possiblePaintColor, possibleBackgroundColor);
}

// Core function which overwrites and extends default p5.js functions such as
// fill, stroke, etc.
function fillD(offset) {
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
  // half the width, so the same image is shown on left and right side of canvas,
  // and accept an "offset" argument
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
      
      let newargs = Array.from(arguments).map((v, i) => ((2 ** i) & idxs) > 0 ? v + offset : v);
      OG_f.apply(window, newargs);
    }
  });

  d.width = width/2;
  d.offset = offset;
  d.height = height;
}



/************************
 *                      *
 *   websocket helpers  *
 *                      *
 ************************/

function handleMessage(msg) {
  [mx, my, pmx, pmy] = msg.split(",").map(s => Number(s.trim()));
  if (currPaintColor.length === 3) {
    paintbrushStroke(mx, my, pmx, pmy, currPaintColor, currPaintColor);
  } else {
    paintbrushStroke(mx, my, pmx, pmy, currPaintColor[0], currPaintColor[1]);
  }
  
}
