const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

const stars = Array.from({ length: 100 }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  r: Math.random() * 2,
  d: Math.random() * 1
}));

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = "white";
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update() {
  stars.forEach(s => {
    s.y += s.d;
    if (s.y > innerHeight) s.y = 0;
  });
}

function animate() {
  draw();
  update();
  requestAnimationFrame(animate);
}
animate();
