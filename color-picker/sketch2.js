// in this version of the color picker, allow hyperspectral colors, add a slider to define the offset

var paintColorPicker;
var backgroundColorPicker;
var currentPaintColor;
var currentBackgroundColor;
var offsetSlider1;
var offsetSlider2;

function setup() {
  var canv = createCanvas(window.innerWidth, window.innerHeight);
  canv.parent("canvasDiv");
  background(255);
  
  // hColors need to be structured like
  // [
  //   [
  //     [left,left,left],
  //     [right,right,right],
  //   ],
  //   [
  //     [left,left,left],
  //     [right,right,right]
  //   ]
  // ]

  // rColors structured like
  // [
  //   [r1, g1, b1],
  //   ...
  //   [rn, gn, bn],
  // ]
  let paintHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
  let paintRColors = [[5, 100, 200], [25, 25, 25], [5, 100, 200], [5, 100, 200]]
  
  let backgroundHColors = [[[5, 100, 200], [10, 90, 180]], [[25, 25, 25], [40, 40, 40]]]
  let backgroundRColors = [[5, 100, 200], [25, 25, 25]]
  let starting_offset = width/2

  paintColorPicker = new ColorPicker(width, height, starting_offset, paintHColors, paintRColors, "Paint", "lowerleft");
  backgroundColorPicker = new ColorPicker(width, height, starting_offset, backgroundHColors, backgroundRColors, "Background", "lowerright");

  offsetSlider1 = createSlider(0, width, starting_offset);
  offsetSlider1.position(20, 20);


}

function draw() {
  
  background(255);
  let offset = offsetSlider1.value();

  paintColorPicker.updateOffset(offset);
  backgroundColorPicker.updateOffset(offset);

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