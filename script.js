onst videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

let gameStarted = false;
let score = 0;

// إحداثيات شخصية اللاعب (مدير السيرك الفضائي)
let player = {
x: 200,
y: 400,
size: 30,
color: '#00ffcc'
};

// مصفوفة الكويكبات الفضائية
let obstacles = [];

// ضبط أبعاد لوحة الرسم لتناسب الشاشة
function resizeCanvas() {
canvasElement.width = canvasElement.clientWidth;
canvasElement.height = canvasElement.clientHeight;
player.x = canvasElement.width / 2;
player.y = canvasElement.height - 100;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// تتبع الوجه باستخدام MediaPipe FaceMesh
function onResults(results) {
if (!gameStarted) return;

// مسح الشاشة في كل إطار
canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

// رسم اللاعب
canvasCtx.fillStyle = player.color;
canvasCtx.beginPath();
canvasCtx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
canvasCtx.fill();
canvasCtx.closePath();

// إذا تم اكتشاف الوجه، نستخدم إحداثياته لتحريك اللاعب يميناً ويساراً
if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
const landmarks = results.multiFaceLandmarks[0];
// نأخذ نقطة أنف اللاعب كمؤشر للحركة (النقطة رقم 1)
const nose = landmarks[1];

// تحويل إحداثيات الكاميرا إلى إحداثيات الشاشة (عكس اتجاه الأفق لأن الكاميرا مرآة)
let targetX = (1 - nose.x) * canvasElement.width;

// جعل حركة اللاعب سلسة نحو وجه المستخدم
player.x += (targetX - player.x) * 0.2;
}

// تحديث ورسم الكويكبات
updateObstacles();

// زيادة النقاط مع مرور الوقت
score++;
scoreElement.innerText = النقاط: ${score}`;
}

// إنشاء وإدارة الكويكبات المعترضة
function updateObstacles() {
// إضافة كويكب جديد عشوائياً
if (Math.random() < 0.03) {
obstacles.push({
x: Math.random() * (canvasElement.width - 40),
y: -50,
width: 40,
height: 40,
speed: 5 + Math.floor(score / 200) // تزداد السرعة كلما زادت النقاط
});
}

for (let i = obstacles.length - 1; i >= 0; i--) {
let obs = obstacles[i];
obs.y += obs.speed;

// رسم الكويكب
canvasCtx.fillStyle = '#ff3366';
canvasCtx.fillRect(obs.x, obs.y, obs.width, obs.height);

// التحقق من الاصطدام بين اللاعب والكويكب
let distX = Math.abs(player.x - (obs.x + obs.width / 2));
let distY = Math.abs(player.y - (obs.y + obs.height / 2));
if (distX < player.size + obs.width / 2 && distY < player.size + obs.height / 2) {
alert(انتهت اللعبة! مجموع نقاطك:${score}`);
gameStarted = false;
score = 0;
obstacles = [];
startBtn.style.display = 'block';
}

// إزالة الكويكبات التي تجاوزت الشاشة
if (obs.y > canvasElement.height) {
obstacles.splice(i, 1);
}
}
}

// إعداد تشغيل الكاميرا ونظام الذكاء الاصطناعي للوجه
const faceMesh = new FaceMesh({
locateFile: (file) => https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}
});

faceMesh.setOptions({
maxNumFaces: 1,
refineLandmarks: true,
minDetectionConfidence: 0.5,
minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
onFrame: async () => {
if (gameStarted) {
await faceMesh.send({ image: videoElement });
}
},
width: 480,
height: 640
});

// بدء اللعبة عند الضغط على الزر
startBtn.addEventListener('click', () => {
startBtn.style.display = 'none';
gameStarted = true;
score = 0;
obstacles = [];
camera.start();
});
