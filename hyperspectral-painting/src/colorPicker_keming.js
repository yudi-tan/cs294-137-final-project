class ColorPickerKeming {
    constructor(screenWidth, screenHeight, offset, h, r, label, position) {
        
        // the thing should take up about 1/5th of the 
        // horizontal space available, and however much
        // vertical space that would entail.

        // horizontal space == screen/2 /5 == screen/10
        this.width = screenWidth/10;

        // set an xPos and yPos based on the size of the circle
        this.xPos = 30 + this.width/2;
        this.yPos = 30 + this.width/2;
        // note: though screenHeight is constant, screenWidth 
        // varies depending on offset.

        // coordinates are w.r.t. (0,0) being at the bottom left of the screen, so let's do some adjusting

        
        this.position = position;
        if (position === "lowerleft") {
            this.yPos = screenHeight - this.yPos;
        } else if (position === "lowerright") {
            this.xPos = screenWidth/2 - this.xPos;
            this.yPos = screenHeight - this.yPos;
        }

        // hColors and rColors are different
        // rColors is just a list of RGB ([[1, 1, 1], [2, 2, 2], etc])
        // hColors is defined by pairs of RGB - ([[[1, 1, 1], [2, 2, 2]], [[3, 3, 3], [4, 4, 4]])
        this.hColors = h;
        this.rColors = r;
        this.hColorPositions = [];
        this.rColorPositions = [];

        this.label = label;        
        
        this.offset = offset;

    }

    update(newScreenWidth, newScreenHeight) {
        // reset and update all the width/height/pos parameters
        this.width = newScreenWidth/10;
        // set an xPos and yPos based on the size of the circle
        this.xPos = 30 + this.width/2;
        this.yPos = 30 + this.width/2;
        // note: though screenHeight is constant, screenWidth 
        // varies depending on offset.

        // coordinates are w.r.t. (0,0) being at the bottom left of the screen, so let's do some adjusting
        if (this.position === "lowerleft") {
            this.yPos = newScreenHeight - this.yPos;
        } else if (this.position === "lowerright") {
            this.xPos = newScreenWidth/2 - this.xPos;
            this.yPos = newScreenHeight - this.yPos;
        }

        this.offset = newScreenWidth/2;
        this.hColorPositions = [];
        this.rColorPositions = [];
    }

    updateOffset(new_offset) {
        this.offset = new_offset;
    }

    display(d) {
        strokeWeight(1);
        d.stroke(0,0,0,0,0,0);
        d.fill(255,255,255,255,255,255);
        d.ellipse(this.xPos, this.yPos, this.width);
        d.ellipse(this.xPos, this.yPos, this.width/2)


        // // add dividing line
        let xStart = this.xPos - this.width/4;
        let xEnd = this.xPos + this.width/4;
        d.line(xStart, this.yPos, xEnd, this.yPos);

        // // add the text to indicate what's what
        d.fill(0, 0, 0, 0, 0, 0);
        textSize(this.width/12);
        textAlign(CENTER);
        d.text('H', this.xPos, this.yPos - this.width/8);
        d.text('R', this.xPos, this.yPos + this.width/8);

        // // add label text
        d.fill(255, 255, 255, 255, 255, 255)
        d.text(this.label, this.xPos, this.yPos + this.width/2 + 10)

        // now fill in the ellipse positions with hColor values
        
        for (let i = 0; i < this.hColors.length; i++) {
            // retrieve the appropriate colors:
            let [hColor1, hColor2] = this.hColors[i];
            // each new circle is placed at an angle of 0 + 180/len(hColors) - 180/len(hColors)/2
            let angle = (180/this.hColors.length)/2 + i*(180/this.hColors.length);
            let angle_rads = angle*(Math.PI/180);
            // precise coordinate is on the circle starting at xPos yPos with radius width*(3/8)
            let colorCircleXPos = this.xPos + this.width*(3/8)*Math.cos(angle_rads);
            let colorCircleYPos = this.yPos - this.width*(3/8)*Math.sin(angle_rads);

            // each color circle has width of width/4 - margin
            let colorCircleWidth = this.width/4 - 5;
            
            
            d.fill(...hColor1, ...hColor2);
            d.ellipse(colorCircleXPos, colorCircleYPos, colorCircleWidth);
            //NOTE - SHOULD SAVE NOT ONLY POSITIONS BUT CURRENT OFFSET
            this.hColorPositions.push({x: colorCircleXPos, y: colorCircleYPos});
        }

        // do the same with rColor values, but the rules are a lil bit different
        // separation like this allows for diff amounts of rColors and hColors
        for (let i = 0; i < this.rColors.length; i++) {
            
            // each new circle is placed at an angle of 180/len(hColors)*index + 180/len(hColors)/2 (the initial offset) + 180 (reflect)
            let angle = (180/this.rColors.length)/2 + i*(180/this.rColors.length) + 180;
            let angle_rads = angle*(Math.PI/180);
            // precise coordinate is on the circle starting at xPos yPos with radius width*(3/8)
            let colorCircleXPos = this.xPos + this.width*(3/8)*Math.cos(angle_rads);
            let colorCircleYPos = this.yPos - this.width*(3/8)*Math.sin(angle_rads);
            
            // each color circle has width of width/4 - margin
            let colorCircleWidth = this.width/4 - 5;

            d.fill(...this.rColors[i], ...this.rColors[i]);
            d.ellipse(colorCircleXPos, colorCircleYPos, colorCircleWidth);

            // save the positions to detect clicky click
            this.rColorPositions.push({x: colorCircleXPos, y: colorCircleYPos});

        }

    }

    retColorClicked() {
        // returns what color was picked
        for (let i = 0; i < this.hColors.length; i++) {
            let colorToCheck = this.hColorPositions[i]
            let distPrimary = dist(mouseX, mouseY, colorToCheck.x, colorToCheck.y);
            let distOffset = dist(mouseX, mouseY, colorToCheck.x + this.offset, colorToCheck.y) 
            // if distance from the colorCircle centroid is within a certain radius:
            if ((distPrimary < this.width/8) || (distOffset < this.width/8)) {
                return this.hColors[i];
                // returns a 2d [[left, left, left], [right, right, right]]
            }
        }

        for (let i = 0; i < this.rColors.length; i++) {
            let colorToCheck = this.rColorPositions[i]
            let distPrimary = dist(mouseX, mouseY, colorToCheck.x, colorToCheck.y);
            let distOffset = dist(mouseX, mouseY, colorToCheck.x + this.offset, colorToCheck.y);
            // if distance from the colorCircle centroid is within a certain radius:
            if ((distPrimary < this.width/8) || (distOffset < this.width/8)) {
                return [this.rColors[i], this.rColors[i]];
                // returns a 1d [r, g, b]
            }
        }

        return null;
        
    }
}