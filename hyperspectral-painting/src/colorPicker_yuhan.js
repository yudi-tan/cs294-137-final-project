var brushColorLeft=[170,0,0,255], brushColorRight=[170,0,0,255]
var LRFlag=0 //LRFlag=0:left,=1:right
var brushSize=25
var labelColorLeft=[170,0,0,255], labelColorRight=[170,0,0,255]
var img
let LoadButtonLeft

function ColorPicker(colorWheel_temp, colorWheelSize_temp, bg_temp, margin_temp, d_temp){
	// change the variable to be global
	colorWheel = colorWheel_temp
	colorWheelSize = colorWheelSize_temp
	bg = bg_temp
	margin = margin_temp
	d = d_temp
	// update the menu on the LEFT
	push()
	d.noStroke()
	d.fill(bg[0],bg[1],bg[2],bg[0],bg[1],bg[2],)
	d.rect(margin+colorWheelSize,0,3*margin,2*margin+colorWheelSize)
	d.rect(5, 2*margin+colorWheelSize,4*margin+colorWheelSize,d.height-2*margin-colorWheelSize)
	pop()
	// left and right label
	if(brushColorLeft[0]!=bg[0]||brushColorLeft[1]!=bg[1]||brushColorLeft[2]!=bg[2]){
		labelColorLeft = brushColorLeft
	}
	if(brushColorRight[0]!=bg[0]||brushColorRight[1]!=bg[1]||brushColorRight[2]!=bg[2]){
		labelColorRight = brushColorRight
	}
	push()
	textSize(20)
	d.noStroke()
	d.fill(labelColorLeft[0],labelColorLeft[1],labelColorLeft[2],labelColorRight[0],labelColorRight[1],labelColorRight[2])
	if (LRFlag==0)
		d.text('left', margin+50, margin+colorWheelSize+40)
	if (LRFlag==1)
		d.text('right', margin+50, margin+colorWheelSize+40)
	pop()
	// brush size 
	push()
	textSize(20)
	d.noStroke()
	d.fill(labelColorLeft[0],labelColorLeft[1],labelColorLeft[2],labelColorRight[0],labelColorRight[1],labelColorRight[2])
	d.text('brush size:'+ brushSize.toString(), margin+8, margin+colorWheelSize+65)
	pop()

	if(mouseIsPressed) {
		let xPos = mouseX % Math.round(d.width), yPos = mouseY
		if (Math.pow(xPos-margin-colorWheelSize/2,2)+Math.pow(yPos-margin-colorWheelSize/2,2)<=colorWheelSize*colorWheelSize/4){
			if(LRFlag==0)
				brushColorLeft = colorWheel.get(xPos-margin,yPos-margin)
			if(LRFlag==1)
				brushColorRight = colorWheel.get(xPos-margin,yPos-margin)
		}
		if (xPos>4*margin+colorWheelSize && yPos>40){
			paintbrushStroke(d, mouseX,mouseY,pmouseX,pmouseY,brushColorLeft,brushColorRight)
		}	
	}
	if (img) {
		image(img, 200, 200,350*img.width/img.height,350);
		image(img, 200+d.width, 200,350*img.width/img.height,350);
	}

}

function paintbrushStroke(d, mx, my, px, py,brushColorLeft,brushColorRight) {
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
		brushColorLeft=[bg[0],bg[1],bg[2],255]
		brushColorRight=[bg[0],bg[1],bg[2],255]
	}
}

function createResetButton(){
	let resetButtonLeft = createButton('RESET');
	resetButtonLeft.position(margin+35, margin+colorWheelSize+80);
	resetButtonRight = createButton('RESET');
	resetButtonRight.position(margin+35+d.width, margin+colorWheelSize+80);
	resetButtonLeft.mousePressed(initialization);
	resetButtonRight.mousePressed(initialization);
}

function initialization(){
	background(bg)
	stroke(255)
	line(d.width,0,d.width,d.height)
	colorWheel.resize(colorWheelSize,colorWheelSize)
    image(colorWheel, margin, margin,colorWheelSize,colorWheelSize)
    image(colorWheel, d.width+margin, margin,colorWheelSize,colorWheelSize)
    textSize(20)
    d.noStroke()
    d.fill(255,255,255,255,255,255)
    d.text("using arrow keys to control left/right and brush size, DEL:erase",colorWheelSize+4*margin,margin-5)
	img=null
}

function createLoadButton(){
	LoadButtonLeft = createFileInput(displayImg);
	LoadButtonLeft.position(margin+25, margin+colorWheelSize+120);
	LoadButtonRight = createFileInput(displayImg);
	LoadButtonRight.position(margin+25+d.width, margin+colorWheelSize+120);
}

function displayImg(file){
  if (file.type === 'image') {
    img = createImg(file.data, '',);
    img.hide();
  } else {
    img = null;
	}
}

