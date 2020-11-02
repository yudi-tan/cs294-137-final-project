var imgdata;
var img_cie;
var img_txf;

function preload() {
  // cie_strings = loadStrings("cie-cmf-lowres.txt");
  // imgdata = loadJSON("https://zamfi.net/img/image2.json");
}

var socket;

let d = {};

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

function setup() {
  createCanvas(window.innerWidth, window.innerHeight+100);
  fillD();
  
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
  
  // color_test();
  
  background(255);
  // colorMode(RGB, 255,1,1);
  // generateImages();
  // frameRate(1);
  print("done with setup!");
}

let ir = 1024, ig = 127, igp = 768, ib = 1024;

function handleMessage(msg) {
  [ir,ig,igp,ib] = msg.split(",").map(s => Number(s.trim())).slice(0, 4);
}

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
var mouseDragged = mouseMoved;

function singleGiantCircle() {
  // colorMode(RGB);
  // TODO: programamtically vary this background color to observe 
  // effects of background color on binocular rivalry.
  background(40);
  // stroke(0);
  // let nh = nHot([hot1, hot2], 31);
  // if (hot1 > 31 && hot2 > 31) {
  //   nh = nh.map((_, i) => i/31);
  // }
  // stroke(230);
  // strokeWeight(10);
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
  
  // noStroke();
  

  const offset = width/4;
  const offset2 = width/18;
  const w = offset2 * 0.95;


  d.fill(ir/4,ig/4,igp/4,ib/4);
  d.ellipse(d.width/2, d.height/2, d.width/2);
  textAlign(CENTER, TOP);
  d.fill(0,0,0,0);
  d.text("RGG'B: "+[ir,ig,igp,ib].map(round).join(","), d.width/2, d.height-40);

  // textAlign(CENTER, BOTTOM);
  // fill(0);
  // text("Red/green intensity "+Math.round(redIntensity*1000)/100.0+"/"+Math.round(greenIntensity*1000)/1000+"; yellow intensity "+yellowIntensity, width/2, height);
  // image(img_cie, 0, 0);
  // image(img_txf, 400, 0);
  // let x = constrain(mouseX, 0, 1392/4);
  // let y = constrain(mouseY, 0, 1300/4);
  // if (mouseX > 0 && mouseY > 0) {
  //   try {
  //     print("For", x, y, "in CIE (RGB):", img_cie.get(x, y), "spectrum:", imgdata[1299-y*4][x*4], "original", imgdata[y*4][x*4].p1);
  //   } catch (e) {
  //     print("failed?");
  //   }
  // }  
}

function randomDotLandings() {
  frameRate(10);
  noStroke();
  let g = random(127, 255);
  let gp = g + random(-80,80);
  d.fill(random(127, 255), g, gp, random(127, 255));
  d.ellipse(random(d.width), random(d.height), 40);
}

function discretizedDotLandings() {
  frameRate(10);
  noStroke();
  let values = [[180, 240], [210, 230], [190, 220], [180, 200]];
  let rggb = values.map(v => v[floor(random()*v.length)]);
  d.fill(...rggb);
  d.ellipse(random(d.width), random(d.height), 40);  
}

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
*/
function HSVtoRGGB(h, s, v) {
    var r, g, gp, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
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

function hueSpread() {
  for (let h = 0; h < d.width/2; h++) {
    d.stroke(...HSVtoRGGB(h/(d.width/2), 0.2, 1.0));
    d.line(d.width/4 + h, 0, d.width/4 + h, d.height);
  }
  noLoop();
}

function rainbow() {
  for (let wl = 380; wl < 680.1; wl += 5) {
    let f = l => wl == l ? 1 : 1-min(abs(wl-l)/5, 1);
    
    let [x,y,z,w] = spectrum_to_xyz(f, false);
    let [r,g,b] = xyz_to_rgb(cs, x, y, z);
    [ir,ig,ib] = [r*w, g*w, b*w];

    [x,y,z,w] = spectrum_to_xyz(f, true);
    [r,g,b] = xyz_to_rgb(cs, x, y, z);
    [ir,igp,ib] = [r*w, g*w, b*w];
    
    noStroke();
    d.fill(...[ir,ig,igp,ib].map(v => v * 150));
    d.rect(d.width/2-150+(wl-380), 0, 5, d.height);
  }
  noLoop();
}

function hsbDots() {
  frameRate(10);
  noStroke()
  d.fill(...HSVtoRGGB(random(1), 0.3, 1.0))
  d.ellipse(random(d.width), random(d.height), 40);
}

function draw() {
  singleGiantCircle();
  // randomDotLandings();
  // discretizedDotLandings();
  // hueSpread();
  // rainbow();
  // hsbDots();
}

function touchStarted() {
  window.location = window.location;
}

function nHot(indices, intensities, n) {
  var out = [];
  for (let j = 0; j < n; j++) {
    out.push(0);
  }
  indices.forEach((bucket, i) => {
    if (bucket >= n) {
      return;
    }
    if (bucket == floor(bucket)) {
        out[bucket] += intensities[i];
    }
    out[floor(bucket)] += intensities[i] * (ceil(bucket)-bucket);
    if (ceil(bucket) < n) {
      out[ceil(bucket)] += intensities[i] * (bucket-floor(bucket));
    }
  });
  return out;
}

const cs = HDTVsystem;

function spec_to_rgb(spec, adapted=false, norm=true) {
  // print(spec);
  var x,y,z,w,r,g,b;
  [x,y,z,w] = spectrum_to_xyz(
    λ => λ < 380 ? 0 : λ > 680 ? 0 : spec[floor((λ-380)/10)],
    adapted);
  [r,g,b] = xyz_to_rgb(cs, x, y, z);
  [r,g,b] = [r*w, g*w, b*w]; // constrain_rgb(r*w, g*w, b*w);
  if (norm) {
    [r,g,b] = norm_rgb(r,g,b);
  }
  return [r,g,b];
}
       
// const xyz_to_rgb = ([x,y,z]) => [
//     x*0.41847 + y*-0.15866 + z*-0.082835,
//     x*-0.091169 + y*0.25243 + z*0.015708,
//     x*0.00092090 + y*-0.0025498 + z*0.17860
//   ];

// function spec_to_rgb(spec, cmf = cie_cmf) {
//   var sums = [0,0,0];
//   spec.forEach((v, λ) => {
//     cmf[λ].forEach((c, i) => {
//       sums[i] += v * c;
//     });
//   });
//   // print("sums", sums);
//   // let sum = sums[0]+sums[1]+sums[2];
//   // if (sum > 0) {
//   //   sums = sums.map(v => v / sum);
//   // }
//   // print("xyz", sums);
//   let rgb = xyz_to_rgb(sums);
//   if (Math.min(...rgb) < 0) {
//     let w = -Math.min(...rgb);
//     rgb = rgb.map(v => v + w);
//   }
//   return rgb;
// }