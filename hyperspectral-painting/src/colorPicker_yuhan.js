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
			paintStrokeBuffer.push({type:'draw_stroke', payload:[mx, my, pmx, pmy, brushColorLeft, brushColorRight]});
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
		paintStrokeBuffer = [];
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
			imgR.set(i, j, color(c[0], c[1]+20, c[2]));
		}
	}
	imgR.updatePixels();
	return imgR
}




function deleteButtons() {
	console.log('calling this');
	
	resetButtonLeft.remove();
	resetButtonRight.remove();
}