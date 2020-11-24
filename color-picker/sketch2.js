var paintColorPicker;
var backgroundColorPicker;
var currentPaintColor;
var currentBackgroundColor;

function setup() {
  var canv = createCanvas(window.innerWidth, window.innerHeight);
  canv.parent("canvasDiv");
  background(255);
 
  let paintHColors = [5, 100, 200];
  let paintRColors = [25, 55, 100, 150, 225];
  
  let backgroundHColors = [200, 225, 255];
  let backgroundRColors = [30, 40];
  paintColorPicker = new ColorPicker(width, height,width/2, paintHColors, paintRColors, "Paint", "lowerleft");
  backgroundColorPicker = new ColorPicker(width, height, width/2, backgroundHColors, backgroundRColors, "Background", "lowerright");
  
}

function draw() {
  
  background(255);


  paintColorPicker.display();

  backgroundColorPicker.display();

  
 
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  paintColorPicker.update(width, height);
  backgroundColorPicker.update(width, height);
}

function mousePressed() {
  currentPaintColor = paintColorPicker.retColorClicked();
  currentBackgroundColor = backgroundColorPicker.retColorClicked();
  console.log(currentPaintColor, currentBackgroundColor);
}