let bgImg;
let stopSheet;
let walkSheet;
let magicSheet;

let p2StandSheet;
let p2AttackSheet;
let p2StandFrames = [];
let p2AttackFrames = [];

let stopFrames = [];
let walkFrames = [];
let magicFrames = [];
let magicEffectFrames = [];

const totalFrames = 8;
const sheetWidth = 1107;
const magicSheetWidth = 1300;
const magicSheetHeight = 148;
const magicFrameCount = 5;
const magicFrameWidth = magicSheetWidth / magicFrameCount;
const magicEffectFrameCount = 3;

const stopSheetHeight = 196;
const walkSheetHeight = 197;
const frameWidth = sheetWidth / totalFrames;

const p2FrameCount = 8;
const p2StandSheetWidth = 699;
const p2AttackSheetWidth = 1083;
const p2SheetHeight = 190;
const p2StandFrameWidth = p2StandSheetWidth / p2FrameCount;
const p2AttackFrameWidth = p2AttackSheetWidth / p2FrameCount;
const p2TriggerDistance = 220;
const p2DefaultDir = 1;

// 簡單英文選擇題內容。
const englishQuestion = {
  title: 'Simple English Quiz',
  prompt: 'Which one is an animal?',
  options: ['(A) Apple', '(B) Book', '(C) Cat', '(D) Pen']
};

let currentFrame = 0;
let p2Frame = 0;
let prevNearP2 = false;
let characterX;
let bgX;
let moveDirection = 0;
let facingDirection = 1;
let isWalking = false;
let leftKeyDown = false;
let rightKeyDown = false;
let lastPressedDirection = 1;
let spaceKeyDown = false;
let isCastingMagic = false;
let magicFrame = 0;
let effectActive = false;
let effectX = 0;
let effectDirection = 1;
let effectFrame = 0;

const animSpeed = 8;

function sliceFrames(sheet, count, singleWidth, sheetHeight, targetArray) {
  if (!sheet || sheet.width === 0 || sheet.height === 0) return;
  const w = Math.floor(singleWidth);
  const h = Math.min(sheetHeight, sheet.height);
  for (let i = 0; i < count; i++) {
    const sx = Math.floor(i * singleWidth);
    targetArray.push(sheet.get(sx, 0, w, h));
  }
}

function preload() {
  bgImg = loadImage('bg/01.png');
  stopSheet = loadImage('1/stop/1stop.png');
  walkSheet = loadImage('1/walk/1walk.png');
  magicSheet = loadImage('1/magic/1magic.png');
  p2StandSheet = loadImage('角色2/站立/站立.png');
  p2AttackSheet = loadImage('角色2/打擊/打擊.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  bgX = 0;
  characterX = width * 0.72;

  sliceFrames(stopSheet, totalFrames, frameWidth, stopSheetHeight, stopFrames);
  sliceFrames(walkSheet, totalFrames, frameWidth, walkSheetHeight, walkFrames);
  sliceFrames(magicSheet, magicFrameCount, magicFrameWidth, magicSheetHeight, magicFrames);

  if (magicSheet && magicSheet.width > 0) {
    magicEffectFrames.push(createMagicEffectFrame(1, 220));
    magicEffectFrames.push(createMagicEffectFrame(2, 220));
    magicEffectFrames.push(createMagicEffectFrame(3, 220));
  }

  sliceFrames(p2StandSheet, p2FrameCount, p2StandFrameWidth, p2SheetHeight, p2StandFrames);
  sliceFrames(p2AttackSheet, p2FrameCount, p2AttackFrameWidth, p2SheetHeight, p2AttackFrames);
}

function createMagicEffectFrame(frameIndex, whiteGlowStartX) {
  const img = magicSheet.get(
    Math.floor(frameIndex * magicFrameWidth),
    0,
    Math.floor(magicFrameWidth),
    magicSheetHeight
  );
  img.loadPixels();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      const r = img.pixels[idx];
      const g = img.pixels[idx + 1];
      const b = img.pixels[idx + 2];
      const a = img.pixels[idx + 3];
      const blueGlow = b > 150 && g > 115 && b > r * 1.1;
      const warmGlow = r > 220 && g > 100 && r - g > 70 && g - b > 45;
      const whiteGlow = x >= whiteGlowStartX && r > 225 && g > 225 && b > 205;
      if (a === 0 || !(blueGlow || warmGlow || whiteGlow)) {
        img.pixels[idx + 3] = 0;
      }
    }
  }
  img.updatePixels();
  return img;
}

function keyPressed() {
  if (keyCode === 32) {
    if (!spaceKeyDown && !isCastingMagic) {
      spaceKeyDown = true;
      magicFrame = 0;
      isCastingMagic = true;
      moveDirection = 0;
    } else {
      spaceKeyDown = true;
    }
    return false;
  }
  if (keyCode === RIGHT_ARROW) {
    rightKeyDown = true;
    lastPressedDirection = 1;
    updateMovementState();
    return false;
  }
  if (keyCode === LEFT_ARROW) {
    leftKeyDown = true;
    lastPressedDirection = -1;
    updateMovementState();
    return false;
  }
}

function keyReleased() {
  if (keyCode === 32) {
    spaceKeyDown = false;
    return false;
  }
  if (keyCode === RIGHT_ARROW) rightKeyDown = false;
  if (keyCode === LEFT_ARROW) leftKeyDown = false;
  if (keyCode === RIGHT_ARROW || keyCode === LEFT_ARROW) {
    updateMovementState();
    return false;
  }
}

function updateMovementState() {
  let nextDirection = 0;
  if (leftKeyDown && rightKeyDown) nextDirection = lastPressedDirection;
  else if (rightKeyDown) nextDirection = 1;
  else if (leftKeyDown) nextDirection = -1;
  if (nextDirection === 0) {
    if (isWalking) currentFrame = 0;
    isWalking = false;
    moveDirection = 0;
    return;
  }
  if (!isWalking) currentFrame = 0;
  isWalking = true;
  moveDirection = nextDirection;
  facingDirection = nextDirection;
}

function startMagicEffect() {
  effectDirection = facingDirection;
  effectX = characterX;
  effectFrame = 0;
  effectActive = true;
}

// 當角色1接近角色2時，在畫布上方顯示透明度 90 的黃色方框與簡單英文選擇題。
function drawEnglishQuestionBox() {
  const boxW = width / 3;
  const boxH = height / 2;
  const boxX = width / 2 - boxW / 2;
  const boxY = 16;

  push();
  fill(255, 255, 0, 90);
  stroke(180, 150, 0);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 12);

  noStroke();
  fill(30);
  textAlign(CENTER, TOP);

  const titleSize = constrain(min(boxW, boxH) * 0.11, 16, 26);
  textSize(titleSize);
  text(englishQuestion.title, width / 2, boxY + boxH * 0.08);

  const questionSize = constrain(min(boxW, boxH) * 0.12, 16, 30);
  textSize(questionSize);
  text(englishQuestion.prompt, width / 2, boxY + boxH * 0.24);

  const optionSize = constrain(min(boxW, boxH) * 0.09, 14, 22);
  textSize(optionSize);
  textAlign(LEFT, TOP);
  const optionStartX = boxX + boxW * 0.22;
  const optionStartY = boxY + boxH * 0.44;
  const optionGap = (boxH * 0.48) / englishQuestion.options.length;

  for (let i = 0; i < englishQuestion.options.length; i++) {
    text(englishQuestion.options[i], optionStartX, optionStartY + i * optionGap);
  }
  pop();
}

function draw() {
  background(135, 206, 235);

  const bgDisplayHeight = height;
  const bgDisplayWidth =
    bgImg && bgImg.height ? Math.ceil(bgDisplayHeight * (bgImg.width / bgImg.height)) : width;
  const totalBgWidth = bgDisplayWidth * 3;

  const displayHeight = height / 3;
  const frameHeight = isWalking ? walkSheetHeight : stopSheetHeight;
  const characterDisplayHeight = isCastingMagic
    ? displayHeight * (magicSheetHeight / stopSheetHeight)
    : displayHeight;
  const displayWidth = isCastingMagic
    ? displayHeight * (magicFrameWidth / stopSheetHeight)
    : displayHeight * (frameWidth / frameHeight);
  const halfWidth = displayWidth / 2;

  const moveSpeed = min(width, height) * 0.008;
  if (!isCastingMagic && moveDirection !== 0) {
    if (moveDirection > 0) {
      const minBgX = -(totalBgWidth - width);
      if (bgX > minBgX) {
        bgX -= moveSpeed * 1.5;
        if (bgX < minBgX) bgX = minBgX;
      } else {
        characterX = min(characterX + moveSpeed, width - halfWidth);
      }
    } else if (moveDirection < 0) {
      if (bgX < 0) {
        bgX += moveSpeed * 1.5;
        if (bgX > 0) bgX = 0;
      } else {
        characterX = max(characterX - moveSpeed, halfWidth);
      }
    }
  }

  imageMode(CORNER);
  const renderWidth = bgDisplayWidth + 1;
  const x1 = Math.round(bgX);
  const x2 = Math.round(bgX + bgDisplayWidth);
  const x3 = Math.round(bgX + bgDisplayWidth * 2);

  if (bgImg && bgImg.width > 0) {
    image(bgImg, x1, 0, renderWidth, bgDisplayHeight);
    image(bgImg, x2, 0, renderWidth, bgDisplayHeight);
    image(bgImg, x3, 0, renderWidth, bgDisplayHeight);
  }
  imageMode(CENTER);

  const p2ScreenX = x1 + bgDisplayWidth / 2;
  const isNearP2 = Math.abs(characterX - p2ScreenX) < p2TriggerDistance;
  if (isNearP2 !== prevNearP2) {
    p2Frame = 0;
    prevNearP2 = isNearP2;
  }

  const p2ActiveFrames = isNearP2 ? p2AttackFrames : p2StandFrames;
  const p2CurrentFrameWidth = isNearP2 ? p2AttackFrameWidth : p2StandFrameWidth;
  const p2DisplayHeight = displayHeight * (p2SheetHeight / stopSheetHeight);
  const p2DisplayWidth = p2DisplayHeight * (p2CurrentFrameWidth / p2SheetHeight);
  const p2PosY = height - p2DisplayHeight / 2;
  const p2TargetDir = characterX >= p2ScreenX ? 1 : -1;
  const p2Facing = p2TargetDir * p2DefaultDir;

  if (p2ActiveFrames.length > 0 && p2ActiveFrames[p2Frame % p2ActiveFrames.length]) {
    push();
    translate(p2ScreenX, p2PosY);
    scale(p2Facing, 1);
    image(p2ActiveFrames[p2Frame % p2ActiveFrames.length], 0, 0, p2DisplayWidth, p2DisplayHeight);
    pop();
  }

  const effectImage = magicEffectFrames[effectFrame];
  const effectWidth = displayHeight * (magicFrameWidth / stopSheetHeight);
  const effectHeight = displayHeight * (magicSheetHeight / stopSheetHeight);
  let effectReachedEdge = false;

  if (effectActive) {
    effectX += effectDirection * min(width, height) * 0.015;
    if (effectDirection > 0 && effectX >= width - effectWidth / 2) {
      effectX = width - effectWidth / 2;
      effectReachedEdge = true;
    }
    if (effectDirection < 0 && effectX <= effectWidth / 2) {
      effectX = effectWidth / 2;
      effectReachedEdge = true;
    }
  }

  const posY = height - characterDisplayHeight / 2;
  const activeFrames = isCastingMagic ? magicFrames : isWalking ? walkFrames : stopFrames;
  const activeFrame = isCastingMagic ? magicFrame : currentFrame;

  if (effectActive && effectImage) {
    push();
    translate(effectX, height - displayHeight / 2);
    scale(effectDirection, 1);
    image(effectImage, 0, 0, effectWidth, effectHeight);
    pop();
    if (effectReachedEdge) effectActive = false;
  }

  if (activeFrames.length > 0 && activeFrames[activeFrame % activeFrames.length]) {
    push();
    translate(characterX, posY);
    scale(facingDirection, 1);
    image(activeFrames[activeFrame % activeFrames.length], 0, 0, displayWidth, characterDisplayHeight);
    pop();
  }

  if (isNearP2) {
    drawEnglishQuestionBox();
  }

  if (frameCount % animSpeed === 0) {
    p2Frame = (p2Frame + 1) % p2FrameCount;
    if (effectActive) effectFrame = (effectFrame + 1) % magicEffectFrameCount;
    if (isCastingMagic) {
      if (magicFrame < magicFrameCount - 1) magicFrame++;
      else {
        isCastingMagic = false;
        startMagicEffect();
        updateMovementState();
      }
    } else {
      currentFrame = (currentFrame + 1) % totalFrames;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}