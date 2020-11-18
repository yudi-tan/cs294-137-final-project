// global variable (initialized in setup) which tracks websocket connection to
// server. used to broadcast / receive events to and from server.
var socket;

// global variables tracking the color values.
let ir = 1024, ig = 127, igp = 768, ib = 1024;

let d = {};

/************************
 *                      *
 *    p5.js callbacks   *
 *                      *
 ************************/

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
  createCanvas(window.innerWidth, window.innerHeight+100);

  fillD();

  print("done with setup!");
}

// p5.js will then repeatedly call this function to render drawings.
function draw() {
  singleGiantCircle();
}

// p5.js will call this everytime a touch is registered
function touchStarted() {
  window.location = window.location;
}

// p5.js will call this everytime mouse is moved and a mouse button is NOT pressed
function mouseMoved() {
  let v = round((1 - mouseY / height) * 1024);
  if (mouseX < width/4) {
    ir = v;
  } else if (mouseX < width/2) {
    ig = v;
  } else if (mouseX < width/1.33) {
    igp = v;
  } else {
    ib = v;
  }
  socket.send([ir,ig,igp,ib].join(","));
}

// p5.js will call this everytime mouse is moved and a mouse button IS pressed
var mouseDragged = mouseMoved;

/************************
 *                      *
 *    custom handlers   *
 *                      *
 ************************/


function fillD() {
  ["fill", "stroke"].forEach(fn => {
    d[fn] = (r,g,gp,b) => {
      let OG_f = window[fn];
    
      d[`${fn}_left`] = color(r,g,b);
      d[`${fn}_right`] = color(r,gp,b);
    }
  });
  // bitfield of indices that need to have "width/2" added
  [["ellipse", 0b1], ["rect", 0b1], ["text", 0b10], ["line", 0b0101]].forEach(([fn, idxs]) => {
    d[fn] = function() {
      let OG_f = window[fn];

      if (d.fill_left) {
        fill(d.fill_left);
      } else {
        noFill();
      }
      if (d.stroke_left) {
        stroke(d.stroke_left);
      } else {
        noStroke();
      }
    
      OG_f.apply(window, Array.from(arguments));

      if (d.fill_right) {
        fill(d.fill_right);
      } else {
        noFill();
      }
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

function singleGiantCircle() {
  background(40);
  var bgHues = [color(255, 220, 220), color(235,255,220), color(220,255,235), color(220,220,255)];
  [0, width/4, width/2, width/1.33].forEach((x, i) => {
    if (x > 0) {
      line(x, 0, x, height)
    }
    if (mouseIsPressed) {
      fill(bgHues[i]);
      rect(x, height-[ir,ig,igp,ib][i]/1024*height, width/4, height);
    }
  })

  const offset = width/4;
  const offset2 = width/18;
  const w = offset2 * 0.95;

  d.fill(ir/4,ig/4,igp/4,ib/4);
  d.ellipse(d.width/2, d.height/2, d.width/2);
  textAlign(CENTER, TOP);
  d.fill(0,0,0,0);
  d.text("RGG'B: "+[ir,ig,igp,ib].map(round).join(","), d.width/2, d.height-40);
}


/************************
 *                      *
 *   websocket helpers  *
 *                      *
 ************************/

function handleMessage(msg) {
  [ir,ig,igp,ib] = msg.split(",").map(s => Number(s.trim())).slice(0, 4);
}