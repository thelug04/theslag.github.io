const micLayer = document.querySelector('.mic-layer');
const micCable = document.querySelector('.mic-cable');
const mic = document.querySelector('.mic');
const peeker = document.querySelector('.peeker');
const socialLinks = document.querySelectorAll('.links a');

let angle = 0;
let angVel = 0;
let angAcc = 0;

const damping = 0.995;
const gravity = 0.0025;
const maxAngle = Math.PI / 3;

let ropeLength = 0;
const minRope = 60;
const maxRope = 470;

let isDragging = false;

const PIXEL = 4;

function getAnchor() {
  return {
    x: window.innerWidth / 2,
    y: 0
  };
}

function updateFromScroll() {
  const scrollY = window.scrollY;
  ropeLength = Math.min(scrollY, maxRope);
  const opacity = Math.max(0, Math.min(1, (ropeLength - 20) / 80));
  micLayer.style.opacity = opacity;
  mic.style.opacity = opacity;
}

function render() {
  const anchor = getAnchor();
  let ax = Math.round(anchor.x / PIXEL) * PIXEL;
  let ay = Math.round(anchor.y / PIXEL) * PIXEL;

  if (angle > maxAngle) angle = maxAngle;
  if (angle < -maxAngle) angle = -maxAngle;

  if (ropeLength < 5) {
    micCable.innerHTML = "";
    mic.style.transform = "translate(-9999px, -9999px)";
    return;
  }

  const L = Math.max(ropeLength, minRope);

  let micXf = ax + L * Math.sin(angle);
  let micYf = ay + L * Math.cos(angle);

  let micX = Math.round(micXf / PIXEL) * PIXEL;
  let micY = Math.round(micYf / PIXEL) * PIXEL;

  const micWidth = mic.offsetWidth || 120;
  const micHeight = mic.offsetHeight || 120;
  const micTx = micX - Math.round(micWidth / 2);
  const micTy = micY - Math.round(micHeight / 2);

  mic.style.transform = `translate(${micTx}px, ${micTy}px)`;

  micCable.innerHTML = "";

  const dx = micX - ax;
  const dy = micY - ay;
  const length = Math.hypot(dx, dy);
  if (length < PIXEL) return;

  const steps = Math.max(1, Math.floor(length / PIXEL));
  const ux = (dx / length) * PIXEL;
  const uy = (dy / length) * PIXEL;

  let x = ax;
  let y = ay;

  for (let i = 0; i <= steps; i++) {
    const pxX = Math.round(x / PIXEL) * PIXEL;
    const pxY = Math.round(y / PIXEL) * PIXEL;
    const px = document.createElement("div");
    px.className = "cable-pixel";
    px.style.left = pxX - PIXEL / 2 + "px";
    px.style.top = pxY - PIXEL / 2 + "px";
    micCable.appendChild(px);
    x += ux;
    y += uy;
  }
}

function animate() {
  if (!isDragging && ropeLength > 20) {
    angAcc = -gravity * Math.sin(angle);
    angVel += angAcc;
    angVel *= damping;
    angle += angVel;
  }
  render();
  requestAnimationFrame(animate);
}

function getPointFromEvent(e) {
  if (e.touches && e.touches.length > 0)
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length > 0)
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function startDrag(e) {
  if (parseFloat(mic.style.opacity) < 0.05) return;
  e.preventDefault();
  isDragging = true;
  mic.style.cursor = "grabbing";
}

function moveDrag(e) {
  if (!isDragging) return;
  const point = getPointFromEvent(e);
  const anchor = getAnchor();
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  ropeLength = Math.max(minRope, Math.min(dist, maxRope));
  angle = Math.atan2(dx, dy);
  angVel = 0;
  render();
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  mic.style.cursor = "grab";
}

mic.addEventListener("dragstart", (e) => e.preventDefault());
mic.addEventListener("mousedown", startDrag);
mic.addEventListener("touchstart", startDrag, { passive: false });
window.addEventListener("mousemove", moveDrag);
window.addEventListener("touchmove", moveDrag, { passive: false });
window.addEventListener("mouseup", endDrag);
window.addEventListener("touchend", endDrag);
window.addEventListener("touchcancel", endDrag);

window.addEventListener("resize", render);

window.addEventListener("scroll", () => {
  updateFromScroll();
  render();
});

window.addEventListener("load", () => {
  updateFromScroll();
  render();
  animate();
  setupScrollRevealLinks();
  schedulePeeker();
});

function setupScrollRevealLinks() {
  if (!socialLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const link = entry.target;
        const index = Array.from(socialLinks).indexOf(link);
        const delay = index * 140;

        setTimeout(() => {
          link.classList.add("link-visible");
        }, delay);

        observer.unobserve(link);
      });
    },
    {
      threshold: 0.25,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  socialLinks.forEach((link) => observer.observe(link));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function showPeekerOnce() {
  if (!peeker) return;

  const side = Math.floor(Math.random() * 4);
  const w = window.innerWidth;
  const h = window.innerHeight;

  const size = randomBetween(80, 170);
  peeker.style.width = size + "px";

  peeker.style.transition = "none";
  peeker.style.opacity = "0";

  if (side === 0) {
    const y = randomBetween(h * 0.15, h * 0.7);
    peeker.style.left = "0";
    peeker.style.top = y + "px";
    peeker.style.right = "auto";
    peeker.style.bottom = "auto";
    peeker.style.transform = "translateX(-120%) rotate(90deg) scaleX(1)";
  } else if (side === 1) {
    const y = randomBetween(h * 0.15, h * 0.7);
    peeker.style.right = "0";
    peeker.style.top = y + "px";
    peeker.style.left = "auto";
    peeker.style.bottom = "auto";
    peeker.style.transform = "translateX(120%) rotate(-90deg) scaleX(-1)";
  } else if (side === 2) {
    const x = randomBetween(w * 0.15, w * 0.7);
    peeker.style.top = "0";
    peeker.style.left = x + "px";
    peeker.style.right = "auto";
    peeker.style.bottom = "auto";
    peeker.style.transform = "translateY(-120%) rotate(180deg)";
  } else {
    const x = randomBetween(w * 0.15, w * 0.7);
    peeker.style.bottom = "0";
    peeker.style.left = x + "px";
    peeker.style.top = "auto";
    peeker.style.right = "auto";
    peeker.style.transform = "translateY(120%) rotate(0deg)";
  }

  void peeker.offsetWidth;

  peeker.style.transition = "opacity 0.35s ease, transform 0.35s ease";

  setTimeout(() => {
    if (side === 0)
      peeker.style.transform = "translateX(-20%) rotate(90deg)";
    else if (side === 1)
      peeker.style.transform = "translateX(20%) rotate(-90deg) scaleX(-1)";
    else if (side === 2)
      peeker.style.transform = "translateY(-20%) rotate(180deg)";
    else
      peeker.style.transform = "translateY(20%) rotate(0deg)";
    peeker.style.opacity = "1";
  }, 20);

  setTimeout(() => {
    if (side === 0)
      peeker.style.transform = "translateX(-120%) rotate(90deg)";
    else if (side === 1)
      peeker.style.transform = "translateX(120%) rotate(-90deg) scaleX(-1)";
    else if (side === 2)
      peeker.style.transform = "translateY(-120%) rotate(180deg)";
    else
      peeker.style.transform = "translateY(120%) rotate(0deg)";
    peeker.style.opacity = "0";
  }, 1800);
}

function schedulePeeker() {
  const delay = randomBetween(3000, 9000);
  setTimeout(() => {
    showPeekerOnce();
    schedulePeeker();
  }, delay);
}

function handlePeekerPress(e) {
  e.preventDefault();
  const s = new Audio("sounds/ccrm.mp3");
  s.play();
}

const hasTouch =
  "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

if (hasTouch) {
  peeker.addEventListener("touchstart", handlePeekerPress, { passive: false });
} else {
  peeker.addEventListener("click", handlePeekerPress);
}
