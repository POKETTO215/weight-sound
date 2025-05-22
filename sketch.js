let textLines = `
文字从页面中缓缓浮现，漂浮起来。
熟悉的字符变得陌生，总是逃脱视线；
你尝试抓住它们，却又无可奈何地任其流逝。
这种瞬间的迷茫，或许正是他们日常经历的阅读困境。
此刻，我们希望通过动态视觉效果，让你感同身受，
更理解并关注阅读障碍者的文字世界。
`.trim().split('\n');

let chars = [];
let currentCharIndex = 0;
let allTextDisplayed = false;
let floatSpeed = 7;
let floatAmount = 50;
let returnToHomeSpeed = 0.1;
let LOCK_DELAY  = 800;
let RESET_DELAY = 5000;

let hoveredLine = -1;
let touchedLine = -1;
let touchStartTime = 0;
let lineLockTimers = [];
let lineLocked = [];
let totalLines = 0;
let lockAllTime = 0;
let myFont;

// 音乐相关
let bgm;
let musicVol = 1.0;
let targetVol = 1.0;
const fadeDuration = 2000;
let musicReady = false;
let musicStarted = false;

function preload() {
  myFont = loadFont('JianHeSans-Optimized.ttf');
  soundFormats('mp3', 'ogg');
  bgm = loadSound('Harbours & Oceans - Lakes.mp3', () => {
    musicReady = true;
    bgm.setVolume(1.0);
    bgm.loop();
    bgm.pause();
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(myFont);
  frameRate(60);
  initLayout();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initLayout();
}

function initLayout() {
  chars = [];
  currentCharIndex = 0;
  allTextDisplayed = false;
  lockAllTime = 0;
  let baseSize = min(windowWidth, windowHeight) / 40;
  let fontSize = max(15, baseSize);
  let lineSpacing = fontSize * 1.5;
  let charSpacing = fontSize * 1.2;
  textSize(fontSize);
  textLeading(lineSpacing);
  textAlign(CENTER, CENTER);

  let marginX = width * 0.10;
  let marginY = height * 0.10;
  let availW  = width - marginX * 2;
  let availH  = height - marginY * 2;
  let temp = [];
  let x = marginX;
  let displayLine = 0;

  for (let line of textLines) {
    for (let ch of line) {
      if (ch === ' ' || ch === '\u3000') {
        x += charSpacing;
        continue;
      }
      if (x + charSpacing > marginX + availW) {
        displayLine++;
        x = marginX;
      }
      temp.push({ char: ch, line: displayLine, xOff: x });
      x += charSpacing;
    }
    displayLine++;
    x = marginX;
  }
  totalLines = displayLine;
  let blockHeight = totalLines * lineSpacing;
  let startY = marginY + (availH - blockHeight) / 2 + fontSize / 2;
  lineLockTimers = Array(totalLines).fill(0);
  lineLocked     = Array(totalLines).fill(false);

  for (let obj of temp) {
    let x0 = obj.xOff;
    let y0 = startY + obj.line * lineSpacing;
    chars.push({
      char: obj.char,
      homeX: x0, homeY: y0,
      x: x0,      y: y0,
      line: obj.line,
      isVisible: false,
      floatOffsetX: 0, floatOffsetY: 0,
      floatSpeedX: random(-0.1, 0.1),
      floatSpeedY: random(-0.1, 0.1),
      isLocked: false
    });
  }
}

function draw() {
  background(0);
  detectHoveredLine();
  updateLockTimers();

  if (!allTextDisplayed) {
    chars[currentCharIndex].isVisible = true;
    currentCharIndex = min(currentCharIndex + 1, chars.length);
    if (currentCharIndex === chars.length) allTextDisplayed = true;
  }

  for (let c of chars) {
    if (!c.isVisible) continue;
    if (c.isLocked) {
      c.x = c.homeX; c.y = c.homeY;
    } else if (hoveredLine === c.line || touchedLine === c.line) {
      c.floatOffsetX = lerp(c.floatOffsetX, 0, returnToHomeSpeed);
      c.floatOffsetY = lerp(c.floatOffsetY, 0, returnToHomeSpeed);
      c.x = c.homeX + c.floatOffsetX;
      c.y = c.homeY + c.floatOffsetY;
    } else {
      c.floatOffsetX += c.floatSpeedX * floatSpeed;
      c.floatOffsetY += c.floatSpeedY * floatSpeed;
      if (abs(c.floatOffsetX) > floatAmount) c.floatSpeedX *= -1;
      if (abs(c.floatOffsetY) > floatAmount) c.floatSpeedY *= -1;
      c.x = c.homeX + c.floatOffsetX;
      c.y = c.homeY + c.floatOffsetY;
    }
  }

  let allLocked = allTextDisplayed && lineLocked.every(l => l);
  if (allLocked && lockAllTime === 0) lockAllTime = millis();
  if (allLocked && millis() - lockAllTime > RESET_DELAY) {
    resetAllLines();
    lockAllTime = 0;
  }

  if (musicReady && musicStarted) {
    if (allLocked) {
      let elapsed = millis() - lockAllTime;
      if (elapsed <= fadeDuration) {
        targetVol = map(elapsed, 0, fadeDuration, 1, 0, true);
      } else {
        targetVol = 0;
        if (!bgm.isPaused()) bgm.pause();
      }
    } else {
      if (bgm.isPaused()) bgm.loop();
      targetVol = 1;
      lockAllTime = 0;
    }
    musicVol = lerp(musicVol, targetVol, 0.08);
    bgm.setVolume(musicVol);
  }

  fill(255);
  noStroke();
  for (let c of chars) {
    if (c.isVisible) text(c.char, c.x, c.y);
  }
}

function detectHoveredLine() {
  hoveredLine = -1;
  if (!allTextDisplayed) return;
  let marginY = height * 0.10;
  let availH  = height - marginY * 2;
  let ls      = textLeading();
  let halfH   = textAscent() / 2;
  let startY  = marginY + (availH - totalLines * ls) / 2 + textSize() / 2;
  for (let i = 0; i < totalLines; i++) {
    let y = startY + i * ls;
    if (mouseY > y - halfH && mouseY < y + halfH) {
      hoveredLine = i;
      break;
    }
  }
}

function updateLockTimers() {
  if (!allTextDisplayed) return;
  let active = hoveredLine;
  if (touchedLine >= 0) active = touchedLine;
  if (active >= 0 && !lineLocked[active]) {
    lineLockTimers[active] += deltaTime;
    if (lineLockTimers[active] > LOCK_DELAY) lockLine(active);
  } else {
    for (let i = 0; i < lineLockTimers.length; i++) {
      if (i !== active && !lineLocked[i]) lineLockTimers[i] = 0;
    }
  }
}

function lockLine(line) {
  lineLocked[line] = true;
  chars.forEach(c => { if (c.line === line) c.isLocked = true; });
}

function resetAllLines() {
  for (let i = 0; i < totalLines; i++) {
    lineLocked[i]     = false;
    lineLockTimers[i] = 0;
  }
  chars.forEach(c => {
    c.isLocked     = false;
    c.floatOffsetX = 0;
    c.floatOffsetY = 0;
    c.floatSpeedX  = random(-0.1, 0.1);
    c.floatSpeedY  = random(-0.1, 0.1);
  });
}

function touchStarted() {
  if (musicReady && !musicStarted) {
    bgm.loop();
    musicStarted = true;
  }
  detectHoveredLine();
  touchedLine    = hoveredLine;
  touchStartTime = millis();
  return false;
}
function touchEnded() {
  touchedLine    = -1;
  touchStartTime = 0;
  return false;
}
function mousePressed() {
  if (musicReady && !musicStarted) {
    bgm.loop();
    musicStarted = true;
  }
}
