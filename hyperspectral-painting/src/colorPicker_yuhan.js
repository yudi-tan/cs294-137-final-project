var LRFlag=0 //LRFlag=0:left,=1:right
var brushSize=25
var imgL, imgR
var rect_height_y
let LoadButtonLeft
var imgFlag = true

function ColorPicker(colorWheel_temp, colorWheelSize_temp, bg_temp, margin_temp, d_temp, socket, mousePressed, mx, my, pmx, pmy){
	// change the variable to be global
	colorWheel = colorWheel_temp
	colorWheelSize = colorWheelSize_temp
	bg = bg_temp
	margin = margin_temp
	d = d_temp

	if(mousePressed) {
		let xPos = mx % Math.round(d.width), yPos = my
		if (Math.pow(xPos-d.width/2+colorWheelSize/2-colorWheelSize/2,2)+Math.pow(yPos-d.height+colorWheelSize+margin-colorWheelSize/2,2)<=colorWheelSize*colorWheelSize/4){
			if(LRFlag==0)
				brushColorLeft = colorWheel.get(xPos-d.width/2+colorWheelSize/2,yPos-d.height+colorWheelSize+margin)
			if(LRFlag==1)
				brushColorRight = colorWheel.get(xPos-d.width/2+colorWheelSize/2,yPos-d.height+colorWheelSize+margin)
		}
		if (yPos<rect_height_y-brushSize/2){
			paintbrushStroke(mx,my,pmx,pmy,brushColorLeft,brushColorRight)
		}	
		// as user draws a stroke, we also send those data over socket so other
		// clients can draw them similarly
		payload = {
			type: "draw_stroke",
			payload: [mx, my, pmx, pmy, brushColorLeft, brushColorRight]
		}
		socket.send(JSON.stringify(payload));
		payload = {
			type: "brush_color_change_left",
			payload: brushColorLeft,
		}
		socket.send(JSON.stringify(payload));
		payload = {
				type: "brush_color_change_right",
				payload: brushColorRight,
			}
		socket.send(JSON.stringify(payload));
	}
	if (imgL && imgFlag) {
		image(imgL, 0, 0,d.width,rect_height_y);
		if (imgL.width>1){
			imgR = computeimgR(imgL)
			image(imgR, d.width, 0,d.width,rect_height_y);
			imgFlag = false
		}
	}
}

function paintbrushStroke(mx, my, px, py,brushColorLeft,brushColorRight) {
	push()
    colorMode(RGB);
    // Change the RGG'B parameters here using a color picker.
    d.stroke(brushColorLeft[0],brushColorLeft[1],brushColorLeft[2],brushColorRight[0],brushColorRight[1],brushColorRight[2]);
    strokeWeight(brushSize);
	if((px-d.width)*(mx-d.width)<=0) {pop();return}
    d.line(mx%Math.round(d.width), my, px%Math.round(d.width), py);
	pop()
}

function keyPressed(){
	if (keyCode === LEFT_ARROW) LRFlag=0
	if (keyCode === RIGHT_ARROW) LRFlag=1
	if (keyCode === UP_ARROW){
		brushSize=brushSize+5
		if(brushSize>140) brushSize=140
	}
	if (keyCode === DOWN_ARROW){
		brushSize=brushSize-5
		if(brushSize<5) brushSize=5
	}
	if (keyCode === DELETE){
		brushColorLeft=[bg_left[0],bg_left[1],bg_left[2],255]
		brushColorRight=[bg_right[0],bg_right[1],bg_right[2],255]
	}
}

function createResetButton(){
	let resetButtonLeft = createButton('RESET');
	resetButtonLeft.position(d.width/2-colorWheelSize, d.height-margin-colorWheelSize);
	resetButtonRight = createButton('RESET');
	resetButtonRight.position(3*d.width/2-colorWheelSize, d.height-margin-colorWheelSize);
	mousePressedCallback = () => {
		initialization();
		// as user resets canvas on one client, we synchronize the other clients
		// too
		payload = {
			type: "reset_canvas",
		}
		socket.send(JSON.stringify(payload));
	}
	resetButtonLeft.mousePressed(mousePressedCallback);
	resetButtonRight.mousePressed(mousePressedCallback);
}

function initialization(){
	background(bg)
	stroke(255)
	line(d.width,0,d.width,d.height)
	colorWheel.resize(colorWheelSize,colorWheelSize)
    image(colorWheel, d.width/2-colorWheelSize/2, d.height-colorWheelSize-margin,colorWheelSize,colorWheelSize)
    image(colorWheel, 3*d.width/2-colorWheelSize/2, d.height-colorWheelSize-margin,colorWheelSize,colorWheelSize)
    textSize(20)
    d.noStroke()
    d.fill(255,255,255,255,255,255)
	img=null
	paintDrawingAreas();
}

function createLoadButton(){
	LoadButtonLeft = createFileInput(displayImg);
	LoadButtonLeft.position(d.width/2+0.6*colorWheelSize, d.height-margin-colorWheelSize);
	LoadButtonRight = createFileInput(displayImg);
	LoadButtonRight.position(3*d.width/2+0.6*colorWheelSize, d.height-margin-colorWheelSize);
}

function displayImg(file){
  if (file.type === 'image') {
	imgL = loadImage(file.data)
  } else {
    imgL = null;
	imgR = null;
	}
}

function paintDrawingAreas() {
	let rect_margin_x = 0;
	let rect_width_x = window.innerWidth / 2 - rect_margin_x;
	let rect_margin_y = 0;
	rect_height_y = window.innerHeight * 0.75;
	let c = color(bg_left);
	fill(c);
	noStroke();
	rect(rect_margin_x, rect_margin_y, rect_width_x, rect_height_y);
  	let rect_margin_x_right = rect_margin_x + window.innerWidth / 2;
  	c = color(bg_right);
	fill(c);
	noStroke();
	rect(rect_margin_x_right, rect_margin_y, rect_width_x, rect_height_y);
}

function computeimgR(imgL){
	console.log(imgL.width)
	var imgR = createImage(imgL.width, imgL.height);
	imgR.loadPixels();
	for (let i = 0; i < imgR.width; i++) {
		for (let j = 0; j < imgR.height; j++) {
			// get the pixel value for imgL
			c=imgL.get(i,j)
			gp=rgb2rgpb(c[0],c[1],c[2]);
			console.log(gp)
			imgR.set(i, j, color(c[0], gp, c[2]));
		}
	}
	imgR.updatePixels();
	return imgR
}

function rgb2rgpb(r,g,b){
      let hsVals = rgbToHsv(r, g, b);

      let h = hsVals[0];
      let s = hsVals[1];
      let v = hsVals[2];
	  [r,g,gp,b]=HSVtoRGGB(h, s, v);
	  return gp
}


function rgbToHsv(r, g, b) {
  // r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h * 60, s, v];
}

function HSVtoRGGB(h, s, v) {
    var r, g, gp, b, i, f, p, q, t;
    i = Math.floor(h * 8);
    f = h * 8 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 8) {
      case 0: r = v, g = t, gp = p, b = p; break;
      case 1: r = q, g = v, gp = p, b = p; break;
      case 2: r = p, g = v, gp = t, b = p; break;
      case 3: r = p, g = q, gp = v, b = p; break;
      case 4: r = p, g = p, gp = v, b = t; break;
      case 5: r = p, g = p, gp = q, b = v; break;
      case 6: r = t, g = p, gp = p, b = v; break;
      case 7: r = v, g = p, gp = p, b = q; break;
    }
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(gp * 255),
      Math.round(b * 255)
    ];
}