// global variable (initialized in setup) which tracks websocket connection to
// server. used to broadcast / receive events to and from server.
var socket;

// global variables to store the color picker and offset states
var paintColorPicker;
var backgroundColorPicker;
var brushColorLeft=[170,0,0,255], brushColorRight=[170,0,0,255]
var labelColorLeft=[170,0,0,255], labelColorRight=[170,0,0,255]

var paintStrokeBuffer = [];

// global variables tracking the color values.
let ir = 246, ig = 255, igp = 0, ib = 68;
let bg = [40,40,40]
let bg_left = [255, 0, 255]
let bg_right = [255, 255, 0]
// internal mapping to overwrite default p5.js APIs.
// key = p5.js original API name (e.g. "fill", "stroke" etc), value = custom functions.
let d = {};

//color picker related
var colorWheelSize = 200, margin = 30

// for keming's color pickers
var paintHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
var paintRColors = [[5, 100, 200], [25, 25, 25], [5, 100, 200], [5, 100, 200]]

var backgroundHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
var backgroundRColors = [[5, 100, 200], [25, 25, 25]]

var curr_offset;


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
  fillD(width/2);
  background(bg); // change the background color using a color picker.
  stroke(255)
  line(d.width,0,d.width,d.height)
  // set up yuhan's color picker
  initialization();
  createResetButton()
  createLoadButton()
  

  paintDrawingAreas();
  
  // specify the offset
  curr_offset = width/2;
  
  slider = createSlider(0, curr_offset+300, curr_offset);
  slider.position(10, 10);
  slider.style('width', '80px');

}

// p5.js will then repeatedly call this function to render drawings.
function draw() {
  // to_change_offset = slider.value();
  // if (to_change_offset !== curr_offset) {
  //   clear();
  //   curr_offset = to_change_offset;
  // }
  // fillD(to_change_offset);

  

  ColorPicker(colorWheel, colorWheelSize, bg, margin, d, socket, mouseIsPressed, mouseX, mouseY, pmouseX, pmouseY)
  paintColorPicker = new ColorPickerKeming(width, height, curr_offset, paintHColors, paintRColors, "Paint", "lowerleft");
  backgroundColorPicker = new ColorPickerKeming(width, height, curr_offset, backgroundHColors, backgroundRColors, "Background", "lowerright");

  paintColorPicker.display(d);
  backgroundColorPicker.display(d);
}

function mousePressed() {
  pc = paintColorPicker.retColorClicked();
  bc = backgroundColorPicker.retColorClicked();
  console.log(pc, bc);
  if (pc) {
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
    // TODO: synchronize this to other clients via ws.
    // TODO: update the left and right background colors correspondignly
    bg_left = bc[0];
    bg_right = bc[1];
    initialization();
    // as user changes bg color, we need to synchronize this change to other
    // clients too.
		payload = {
			type: "background_color_change",
			payload: bc,
		}
    socket.send(JSON.stringify(payload));
  }
}


// function windowResized() {
//   resizeCanvas(window.innerWidth, window.innerHeight);
//   //update the new offset
//   curr_offset = width/2;
  
//   // send a message to the web socket indicating that we are resetting the canvas and to redraw components on other clients
//   // socket.send(JSON.stringify({type:"canvas_resize"}));
  
// }

/************************
 *                      *
 *    custom handlers   *
 *                      *
 ************************/



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
      
      let newargs = Array.from(arguments).map((v, i) => ((2 ** i) & idxs) > 0 ? v + offset : v);
      OG_f.apply(window, newargs);
    }
  });

  d.width = offset;
  d.height = height;
}

// FOR USE IN REPAINTING THE STROKE ITEMS AFTER adjusting the background, resizing the canvas, or changing the offset
function repaintBufferItems() {
  for (let i = 0; i < paintStrokeBuffer.length; i++) {
    let action = paintStrokeBuffer[i].type;
    let pl = paintStrokeBuffer[i].payload;
    switch(action) {
      case "draw_stroke":
        paintbrushStroke(pl[0],pl[1],pl[2],pl[3],pl[4],pl[5]);
        break;
      case "brush_color_change_left":
        brushColorLeft = pl;
        labelColorLeft = pl;
        break;
      case "brush_color_change_right":
        brushColorRight = pl;
        labelColorRight = pl;
        break;
    }
  }
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
      paintStrokeBuffer.push({type: 'draw_stroke', payload: pl});
      paintbrushStroke(pl[0],pl[1],pl[2],pl[3],pl[4],pl[5]);
      break;
    case "reset_canvas":
      initialization();
      paintStrokeBuffer = [];
      break;
    case "brush_color_change_left":
      brushColorLeft = obj.payload;
      labelColorLeft = obj.payload;
      paintStrokeBuffer.push({type:'brush_color_change_left', payload: obj.payload})
      break;
    case "brush_color_change_right":
      brushColorRight = obj.payload;
      labelColorRight = obj.payload;
      paintStrokeBuffer.push({type:'brush_color_change_right', payload: obj.payload})
      break;
    case "background_color_change":
      bg_left = obj.payload[0];
      bg_right = obj.payload[1];
      initialization();
      // repaint all items in buffer, since the background color change overwrites the previously drawn items
      repaintBufferItems();
      break;
    // add more cases here for other synchronization needs
    // case "canvas_resize":
    //   console.log('got resize');
    //   // reset the D functions; this will cause the color picker elems to automatically redraw too
    //   fillD();
    //   // redraw UI elements like the drawing area, etc, which will use the new screenwidth and such
    //   initialization();
    //   // redraw the strokes drawn, with the new d width
    //   repaintBufferItems();
      
    //   break;
    // case "change_offset":
      
    //   break;
      
    default:
      return
  }
}