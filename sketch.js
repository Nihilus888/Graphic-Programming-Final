let video;
let snapshot;        
let hasSnapshot = false;
let grayImg;
let redImg, greenImg, blueImg;
let rSlider, gSlider, bSlider;
let rThreshImg, gThreshImg, bThreshImg;
let hsvImg, ycbcrImg;
let hsvThresholdSlider;
let hsvThreshImg;
let facemesh;
let faces = [];
let faceImg;
let faceMode = 0; 

// Grid settings
const cellW = 160;
const cellH = 120;
const cols = 4;
const rows = 3;

function setup() {
  createCanvas(cols * cellW, rows * cellH);
  pixelDensity(1);

  // Webcam capture
  video = createCapture(VIDEO);
  video.size(320, 240); // higher res source
  video.hide();

  // Empty snapshot buffer
  snapshot = createImage(cellW, cellH);

  rSlider = createSlider(0, 255, 128);
  gSlider = createSlider(0, 255, 128);
  bSlider = createSlider(0, 255, 128);

  // Optional: position them under the canvas
  rSlider.position(10, height + 10);
  gSlider.position(170, height + 10);
  bSlider.position(330, height + 10);

  hsvThresholdSlider = createSlider(0, 255, 128);
  hsvThresholdSlider.position(20, height + 80);
  hsvThresholdSlider.style('width', '160px');

  facemesh = ml5.facemesh(video, () => {
    console.log("FaceMesh model loaded");
  });

  facemesh.on("predict", results => {
    faces = results;
  });
}

function draw() {
  background(30);

  if (!hasSnapshot) {
    image(video, 0, 0, cellW, cellH);
  } else {
    image(snapshot, 0, 0);
    drawFaceBoundingBox();
  }

  drawGridGuides();

  if (hasSnapshot) {
    image(grayImg, cellW, 0);
    image(redImg,   0, cellH);
    image(greenImg, cellW, cellH);
    image(blueImg,  cellW * 2, cellH);
  
    rThreshImg = createThresholdImage(snapshot, 'r', rSlider.value());
    gThreshImg = createThresholdImage(snapshot, 'g', gSlider.value());
    bThreshImg = createThresholdImage(snapshot, 'b', bSlider.value());
  
    image(rThreshImg, 0, cellH * 2);
    image(gThreshImg, cellW, cellH * 2);
    image(bThreshImg, cellW * 2, cellH * 2);

    image(hsvImg,   cellW * 3, cellH);     
    image(ycbcrImg, cellW * 3, cellH * 2);

    hsvThreshImg = createHSVThresholdImage(snapshot, hsvThresholdSlider.value());
    image(hsvThreshImg, cellW * 3, 0);
  }

  if (faceImg) {
    let fx = cellW * 2; // column index
    let fy = 0;         // row index

    if (faceMode === 1) {
      image(makeGrayFace(faceImg), fx, fy);
    } else if (faceMode === 2) {
      image(makeFlippedFace(faceImg), fx, fy);
    } else if (faceMode === 3) {
      drawPixelatedFace(faceImg, fx, fy);
    } else {
      image(faceImg, fx, fy);
    }
  }
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    takeSnapshot();
  }
  if (key === '1') faceMode = 1;
  if (key === '2') faceMode = 2;
  if (key === '3') faceMode = 3;
}

// ------------------ HELPERS ------------------

function takeSnapshot() {
  snapshot.copy(
    video,
    0, 0, video.width, video.height,
    0, 0, cellW, cellH
  );
  snapshot.loadPixels();

  grayImg  = createGrayscaleImage(snapshot);
  redImg   = createChannelImage(snapshot, 'r');
  greenImg = createChannelImage(snapshot, 'g');
  blueImg  = createChannelImage(snapshot, 'b');

  hsvImg   = createHSVImage(snapshot);
  ycbcrImg = createYCbCrImage(snapshot);

  extractFaceImage();

  hasSnapshot = true;
}

function drawGridGuides() {
  stroke(80);
  noFill();

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      rect(c * cellW, r * cellH, cellW, cellH);
    }
  }
}

function createGrayscaleImage(srcImg) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let index = (x + y * srcImg.width) * 4;
  
        let r = srcImg.pixels[index];
        let g = srcImg.pixels[index + 1];
        let b = srcImg.pixels[index + 2];
  
        // Convert to grayscale
        let gray = (r + g + b) / 3;
  
        // Reduce brightness by 20%
        gray = gray * 0.8;
  
        // Prevent values below 0
        gray = constrain(gray, 0, 255);
  
        result.pixels[index]     = gray;
        result.pixels[index + 1] = gray;
        result.pixels[index + 2] = gray;
        result.pixels[index + 3] = 255;
      }
    }
  
    result.updatePixels();
    return result;
  }

  function createChannelImage(srcImg, channel) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let index = (x + y * srcImg.width) * 4;
  
        let r = srcImg.pixels[index];
        let g = srcImg.pixels[index + 1];
        let b = srcImg.pixels[index + 2];
  
        let outR = 0;
        let outG = 0;
        let outB = 0;
  
        if (channel === 'r') outR = r;
        if (channel === 'g') outG = g;
        if (channel === 'b') outB = b;
  
        result.pixels[index]     = outR;
        result.pixels[index + 1] = outG;
        result.pixels[index + 2] = outB;
        result.pixels[index + 3] = 255;
      }
    }
  
    result.updatePixels();
    return result;
  }

  function createThresholdImage(srcImg, channel, threshold) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let index = (x + y * srcImg.width) * 4;
  
        let r = srcImg.pixels[index];
        let g = srcImg.pixels[index + 1];
        let b = srcImg.pixels[index + 2];
  
        let value = 0;
  
        if (channel === 'r') value = r;
        if (channel === 'g') value = g;
        if (channel === 'b') value = b;
  
        let out = value > threshold ? 255 : 0;
  
        result.pixels[index]     = out;
        result.pixels[index + 1] = out;
        result.pixels[index + 2] = out;
        result.pixels[index + 3] = 255;
      }
    }
  
    result.updatePixels();
    return result;
  }

  function createHSVImage(srcImg) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    colorMode(HSB, 360, 1, 1);
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let i = (x + y * srcImg.width) * 4;
  
        let r = srcImg.pixels[i] / 255;
        let g = srcImg.pixels[i + 1] / 255;
        let b = srcImg.pixels[i + 2] / 255;
  
        let maxVal = max(r, g, b);
        let minVal = min(r, g, b);
        let delta = maxVal - minVal;
  
        let h = 0;
        if (delta !== 0) {
          if (maxVal === r) h = ((g - b) / delta) % 6;
          else if (maxVal === g) h = (b - r) / delta + 2;
          else h = (r - g) / delta + 4;
        }
        h = (h * 60 + 360) % 360;
  
        let s = maxVal === 0 ? 0 : delta / maxVal;
        let v = maxVal;
  
        let col = color(h, s, v);
  
        result.pixels[i]     = red(col);
        result.pixels[i + 1] = green(col);
        result.pixels[i + 2] = blue(col);
        result.pixels[i + 3] = 255;
      }
    }
  
    colorMode(RGB, 255);
  
    result.updatePixels();
    return result;
  }
  

  function createYCbCrImage(srcImg) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let i = (x + y * srcImg.width) * 4;
  
        let R = srcImg.pixels[i];
        let G = srcImg.pixels[i + 1];
        let B = srcImg.pixels[i + 2];
  
        let Y = 0.299 * R + 0.587 * G + 0.114 * B;
        Y = constrain(Y, 0, 255);
  
        result.pixels[i]     = Y;
        result.pixels[i + 1] = Y;
        result.pixels[i + 2] = Y;
        result.pixels[i + 3] = 255;
      }
    }
  
    result.updatePixels();
    return result;
  }

  function createHSVThresholdImage(srcImg, threshold) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();
  
    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {
  
        let i = (x + y * srcImg.width) * 4;
  
        // RGB (0–255 → 0–1)
        let r = srcImg.pixels[i]     / 255;
        let g = srcImg.pixels[i + 1] / 255;
        let b = srcImg.pixels[i + 2] / 255;
  
        // --- RGB → HSV (manual, value channel only) ---
        let maxVal = max(r, g, b);
        let v = maxVal * 255; // VALUE channel (0–255)
  
        // Threshold on V only
        let out = v > threshold ? 255 : 0;
  
        result.pixels[i]     = out;
        result.pixels[i + 1] = out;
        result.pixels[i + 2] = out;
        result.pixels[i + 3] = 255;
      }
    }
  
    result.updatePixels();
    return result;
  }

  function drawFaceBoundingBox() {
    if (faces.length > 0) {
      let face = faces[0];

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      // Loop through all landmarks
      for (let pt of face.scaledMesh) {
        minX = min(minX, pt[0]);
        minY = min(minY, pt[1]);
        maxX = max(maxX, pt[0]);
        maxY = max(maxY, pt[1]);
      }

      // Scale to snapshot size
      let scaleX = cellW / video.width;
      let scaleY = cellH / video.height;

      noFill();
      stroke(0, 255, 0);
      strokeWeight(2);

      rect(
        minX * scaleX,
        minY * scaleY,
        (maxX - minX) * scaleX,
        (maxY - minY) * scaleY
      );
  }
}

function extractFaceImage() {
  if (faces.length === 0) return;

  let face = faces[0];

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (let pt of face.scaledMesh) {
    minX = min(minX, pt[0]);
    minY = min(minY, pt[1]);
    maxX = max(maxX, pt[0]);
    maxY = max(maxY, pt[1]);
  }

  let scaleX = cellW / video.width;
  let scaleY = cellH / video.height;

  let x = minX * scaleX;
  let y = minY * scaleY;
  let w = (maxX - minX) * scaleX;
  let h = (maxY - minY) * scaleY;

  faceImg = snapshot.get(x, y, w, h);
}

function makeGrayFace(img) {
  let result = createImage(img.width, img.height);
  img.loadPixels();
  result.loadPixels();

  for (let i = 0; i < img.pixels.length; i += 4) {
    let g = (img.pixels[i] + img.pixels[i+1] + img.pixels[i+2]) / 3;
    result.pixels[i] = g;
    result.pixels[i+1] = g;
    result.pixels[i+2] = g;
    result.pixels[i+3] = 255;
  }

  result.updatePixels();
  return result;
}

function makeFlippedFace(img) {
  let result = createImage(img.width, img.height);
  img.loadPixels();
  result.loadPixels();

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {

      let srcIndex = (x + y * img.width) * 4;
      let dstX = img.width - 1 - x;
      let dstIndex = (dstX + y * img.width) * 4;

      result.pixels[dstIndex]     = img.pixels[srcIndex];
      result.pixels[dstIndex + 1] = img.pixels[srcIndex + 1];
      result.pixels[dstIndex + 2] = img.pixels[srcIndex + 2];
      result.pixels[dstIndex + 3] = 255;
    }
  }

  result.updatePixels();
  return result;
}

function drawPixelatedFace(img, xOffset, yOffset) {
  img.loadPixels();
  noStroke();

  let blockSize = 5;

  for (let y = 0; y < img.height; y += blockSize) {
    for (let x = 0; x < img.width; x += blockSize) {

      let sum = 0;
      let count = 0;

      for (let j = 0; j < blockSize; j++) {
        for (let i = 0; i < blockSize; i++) {
          let px = x + i;
          let py = y + j;
          if (px < img.width && py < img.height) {
            let idx = (px + py * img.width) * 4;
            let g = (img.pixels[idx] + img.pixels[idx+1] + img.pixels[idx+2]) / 3;
            sum += g;
            count++;
          }
        }
      }

      let avg = sum / count;
      fill(avg);
      circle(
        xOffset + x + blockSize / 2,
        yOffset + y + blockSize / 2,
        blockSize
      );
    }
  }
}