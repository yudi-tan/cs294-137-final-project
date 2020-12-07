var LRFlag=0 //LRFlag=0:left,=1:right
var brushSize=25
var imgL, imgR
var rect_height_y
var LoadButtonLeft, LoadButtonRight, resetButtonLeft, resetButtonLeft;
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
	if (resetButtonLeft) {
		// remove the existing buttons if it's already been drawn, to avoid buttons duplicating on UI redraw
		resetButtonLeft.remove();
		resetButtonRight.remove();
	}
	
	
	resetButtonLeft = createButton('RESET');
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

function reinitialization() {
	textSize(20)
    d.noStroke()
    d.fill(255,255,255,255,255,255)
	img=null
	paintDrawingAreas();
	colorWheel.resize(colorWheelSize,colorWheelSize)
    image(colorWheel, d.width/2-colorWheelSize/2, d.height-colorWheelSize-margin,colorWheelSize,colorWheelSize)
	image(colorWheel, 3*d.width/2-colorWheelSize/2, d.height-colorWheelSize-margin,colorWheelSize,colorWheelSize)
	console.log('resize')
}

function createLoadButton(){
	if (LoadButtonLeft) {
		// remove the existing buttons if it's already been drawn, to avoid buttons duplicating on UI redraw
		LoadButtonLeft.remove();
		LoadButtonRight.remove();
	}
	

	LoadButtonLeft = createFileInput(displayImg);
	LoadButtonLeft.position(d.width/2+0.6*colorWheelSize, d.height-margin-colorWheelSize);
	LoadButtonRight = createFileInput(displayImg);
	LoadButtonRight.position(3*d.width/2+0.6*colorWheelSize, d.height-margin-colorWheelSize);
}

function displayImg(file){
  if (file.type === 'image') {
	imgL = loadImage(file.data)
	payload = {
		type: "set_background_picture",
		payload: file
	}
	socket.send(JSON.stringify(payload));
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
	var imgR = createImage(imgL.width, imgL.height);
	imgR.loadPixels();
	for (let i = 0; i < imgR.width; i++) {
		for (let j = 0; j < imgR.height; j++) {
			// get the pixel value for imgL
			c=imgL.get(i,j)
			gp=rgb2rgpb(c[0],c[1],c[2]);
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
	let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
    rabs = r / 255;
    gabs = g / 255;
    babs = b / 255;
    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;
    percentRoundFn = num => Math.round(num * 100) / 100;
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
	}

	// convert to radians
	return [Math.round(h * 360), percentRoundFn(s * 100), percentRoundFn(v * 100)].map(v => v * (Math.PI / 180));
}

// this code expects 0 <= h,s,v <= 1 so convert the degrees to radians first.
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

function deleteButtons() {
	console.log('calling this');
	
	resetButtonLeft.remove();
	resetButtonRight.remove();
}