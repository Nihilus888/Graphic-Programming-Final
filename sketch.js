/*Project Commentary

This project is an interactive image-processing tool that I built using p5.js and it uses a live webcam input function to perform real-time computer vision tasks while the interface is organized into a 3 × 5 grid layout.

When the user presses the ‘S’ key, the program uses the webcam to take a snapshot and it then resizes to a minimum resolution of 160 × 120 pixels as per the guidelines where this snapshot becomes the static image that all the processing effects are applied to.

For the technical implementation, I coded several core image-processing techniques to show that I understand low-level pixel manipulation. An example of it is for grayscale and brightness adjustments where I used nested loops to go through each pixel and calculate its intensity and I reduced the brightness by 20% and used constrain() to make sure the values never went below zero. To aid in the process, I built a custom image processing suite featuring various thresholding such as RGB, HSV, and YCbCr spaces where I implemented the HSV and YCbCr transformations from scratch where the code handles normalized RGB deltas for Hue/Saturation and isolates the Y-channel for luminance-based filtering. As for the creative layer, I integrated ml5.js FaceMesh and developed a toggleable filter system using manual pixel manipulation.

The horizontal flip filter reverses the x-axis pixel indices using nested loops instead of using p5’s scale() function. The pixelation filter processes the image in 5 × 5 blocks, calculates the average grayscale value of each block and then renders it as a circle centered within the block.
My creative extension focuses on facial feature tracking where it not only detects the face but also tracks the nose tip from the live faces array. To do this extension, I had to rescale the coordinates from the 320 × 240 video feed to the 160 × 120 grid so it matches the processed image where I then can draw a “clown nose” overlay that works across all filter modes.

One of the challenges I faced was an issue in ml5.js v1.0 was where the scaledMesh property was replaced with keypoints and to rectify this, I refactored my code to access the landmark coordinates using object properties (pt.x, pt.y). Another issue that arose was a race condition where face detection was not immediately ready after taking a snapshot. To resolve this issue, I solved this by adding retry logic in the draw() loop to continuously check for a detected face until it was successfully extracted.

To conclude, this project was eye opening and allowed me to play and experiment with images and how do I use it for graphics programming. 

*/

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
let ycbcrThreshImg;
let facemesh;
let faces = [];
let faceImg;
let faceMode = 0; 
let faceX = 0;
let faceY = 0;

// Grid settings
const cellW = 160;
const cellH = 120;
const cols = 3;
const rows = 5;

function setup() {
  createCanvas(cols * cellW, rows * cellH);
  pixelDensity(1);

  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  snapshot = createImage(cellW, cellH);

  rSlider = createSlider(0, 255, 128);
  gSlider = createSlider(0, 255, 128);
  bSlider = createSlider(0, 255, 128);

  rSlider.position(10, height + 10);
  gSlider.position(170, height + 10);
  bSlider.position(330, height + 10);

  hsvThresholdSlider = createSlider(0, 255, 128);
  hsvThresholdSlider.position(20, height + 80);
  hsvThresholdSlider.style('width', '160px');

  // Initialize FaceMesh model
  facemesh = ml5.faceMesh(video, modelLoaded);
}

function modelLoaded() {
  runFaceDetection();
}

function runFaceDetection() {
  facemesh.detect(video, (results) => {
    faces = results;
    runFaceDetection(); // loop
  });
}

function draw() {
  background(30);
  drawGridGuides();

  if (!hasSnapshot) {
    image(video, 0, 0, cellW, cellH);
    return;
  }

  // Rows 1 - 4 (Your existing code is correct here)
  image(snapshot, 0, 0); 
  image(grayImg, cellW, 0);
  image(redImg, 0, cellH);
  image(greenImg, cellW, cellH);
  image(blueImg, cellW * 2, cellH);
  
  // Row 3: Thresholds
  image(createThresholdImage(snapshot, 'r', rSlider.value()), 0, cellH * 2);
  image(createThresholdImage(snapshot, 'g', gSlider.value()), cellW, cellH * 2);
  image(createThresholdImage(snapshot, 'b', bSlider.value()), cellW * 2, cellH * 2);

  // Row 4: Colour Spaces
  image(snapshot, 0, cellH * 3);
  image(hsvImg, cellW, cellH * 3);
  image(ycbcrImg, cellW * 2, cellH * 3);

  // -------------------------
  // ROW 5 - CONSOLIDATED
  // -------------------------
  // -------------------------
  // ROW 5 - NATURAL SIZE (NOT ZOOMED)
  // -------------------------
  let fx = 0;
  let fy = cellH * 4;

  fill(20); 
  rect(fx, fy, cellW, cellH);

  if (!faceImg && faces.length > 0) {
    extractFaceImage();
  }

  if (faceImg) {
    // 1. Calculate the local position inside the cell
    // faceX and faceY come from your extractFaceImage function
    let drawX = fx + faceX;
    let drawY = fy + faceY;

    if (faceMode === 1) {
      // Removed cellW, cellH to stop the zoom
      image(makeGrayFace(faceImg), drawX, drawY);
    } 
    else if (faceMode === 2) {
      image(makeFlippedFace(faceImg), drawX, drawY);
    } 
    else if (faceMode === 3) {
      // Your drawPixelatedFace already handles the drawX/drawY internally
      drawPixelatedFace(faceImg, fx, fy);
    } 
    else {
      image(faceImg, drawX, drawY);
    }

    // 2. Draw extension (Clown nose) on top
    if (faces.length > 0 && faces[0].keypoints.length > 1) {
  
      let nose = faces[0].keypoints[1];

      let scaleX = cellW / video.width;
      let scaleY = cellH / video.height;

      // Create pulsing effect
      let baseSize = 10;
      let pulseAmount = 4;
      let pulse = sin(frameCount * 0.1) * pulseAmount;

      let noseSize = baseSize + pulse;

      fill(255, 0, 0, 150);
      noStroke();

      circle(
        fx + (nose.x * scaleX),
        fy + (nose.y * scaleY),
        noseSize
      );
    }

  }

  // Task 10: Final Thresholds
  image(createHSVThresholdImage(snapshot, hsvThresholdSlider.value()), cellW, cellH * 4);
  image(createYCbCrThresholdImage(snapshot, hsvThresholdSlider.value()), cellW * 2, cellH * 4);
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    takeSnapshot();
  }
  if (key === '1') faceMode = 1; // Grayscale
  if (key === '2') faceMode = 2; // Flip
  if (key === '3') faceMode = 3; // Pixelate
}

function takeSnapshot() {
  if (video.width === 0) return;

  snapshot.copy(video, 0, 0, video.width, video.height, 0, 0, cellW, cellH);
  
  // Reset faceImg so the draw loop tries to find it again in the new snapshot
  faceImg = null; 

  grayImg  = createGrayscaleImage(snapshot);
  redImg   = createChannelImage(snapshot, 'r');
  greenImg = createChannelImage(snapshot, 'g');
  blueImg  = createChannelImage(snapshot, 'b');
  hsvImg   = createHSVImage(snapshot);
  ycbcrImg = createYCbCrImage(snapshot);

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

  function createYCbCrThresholdImage(srcImg, threshold) {
    let result = createImage(srcImg.width, srcImg.height);
    srcImg.loadPixels();
    result.loadPixels();

    for (let y = 0; y < srcImg.height; y++) {
      for (let x = 0; x < srcImg.width; x++) {

        let i = (x + y * srcImg.width) * 4;

        let R = srcImg.pixels[i];
        let G = srcImg.pixels[i + 1];
        let B = srcImg.pixels[i + 2];

        // Y channel
        let Y = 0.299 * R + 0.587 * G + 0.114 * B;

        let out = Y > threshold ? 255 : 0;

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
  if (faces && faces.length > 0) {
    let face = faces[0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Fix: Use .keypoints and .x/.y for ml5 v1.0
    for (let pt of face.keypoints) {
      minX = min(minX, pt.x);
      minY = min(minY, pt.y);
      maxX = max(maxX, pt.x);
      maxY = max(maxY, pt.y);
    }

    let scaleX = cellW / video.width;
    let scaleY = cellH / video.height;

    noFill();
    stroke(0, 255, 0);
    strokeWeight(2);
    rect(minX * scaleX, minY * scaleY, (maxX - minX) * scaleX, (maxY - minY) * scaleY);
  }
}

function extractFaceImage() {
  if (faces.length === 0) return;
  let face = faces[0];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let pt of face.keypoints) {
    minX = min(minX, pt.x);
    minY = min(minY, pt.y);
    maxX = max(maxX, pt.x);
    maxY = max(maxY, pt.y);
  }

  let scaleX = cellW / video.width;
  let scaleY = cellH / video.height;
  
  // Use Math.floor to ensure we have integers for the pixel array
  faceX = Math.floor(minX * scaleX);
  faceY = Math.floor(minY * scaleY);
  let faceW = Math.floor((maxX - minX) * scaleX);
  let faceH = Math.floor((maxY - minY) * scaleY);
  
  // Extra safety: make sure width/height are at least 1
  faceW = max(1, faceW);
  faceH = max(1, faceH);

  faceImg = snapshot.get(faceX, faceY, faceW, faceH);
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
      // Get the index of the current pixel
      let srcIndex = (x + y * img.width) * 4;
      
      // Calculate the opposite X position (Flip logic)
      let dstX = img.width - 1 - x;
      let dstIndex = (dstX + y * img.width) * 4;

      // Copy RGBA values manually
      result.pixels[dstIndex]     = img.pixels[srcIndex];
      result.pixels[dstIndex + 1] = img.pixels[srcIndex + 1];
      result.pixels[dstIndex + 2] = img.pixels[srcIndex + 2];
      result.pixels[dstIndex + 3] = img.pixels[srcIndex + 3];
    }
  }

  result.updatePixels();
  return result;
}

function drawPixelatedFace(img, xOffset, yOffset) {
  if (!img) return;
  
  // Force p5 to recognize the pixel data
  img.loadPixels();
  
  let blockSize = 5;
  noStroke();

  for (let y = 0; y < img.height; y += blockSize) {
    for (let x = 0; x < img.width; x += blockSize) {
      
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      // Sample the 5x5 block
      for (let j = 0; j < blockSize; j++) {
        for (let i = 0; i < blockSize; i++) {
          let px = x + i;
          let py = y + j;

          if (px < img.width && py < img.height) {
            let index = (px + py * img.width) * 4;
            rSum += img.pixels[index];
            gSum += img.pixels[index + 1];
            bSum += img.pixels[index + 2];
            count++;
          }
        }
      }

      if (count > 0) {
        // Calculate average and convert to Grayscale (Requirement 12.c.i)
        let avg = (rSum / count + gSum / count + bSum / count) / 3;
        
        fill(avg);
        
        // Exact placement: Grid Box Start + Face Position + Block Offset
        let posX = xOffset + faceX + x + (blockSize / 2);
        let posY = yOffset + faceY + y + (blockSize / 2);
        
        circle(posX, posY, blockSize);
      }
    }
  }
}
