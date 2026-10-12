const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreText = document.getElementById('final-score-text');
const restartBtn = document.getElementById('restartBtn');
const recordBtn = document.getElementById('recordBtn');
const downloadBtn = document.getElementById('downloadBtn');

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

// متغيرات تسجيل الفيديو
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// ضبط أبعاد لوحة الرسم لتناسب الشاشة بدقة على أي جهاز
function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
    if (!gameStarted) {
        player.x = canvasElement.width / 2;
        player.y = canvasElement.height - 100;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startRecording() {
    try {
        const stream = canvasElement.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.start();
        isRecording = true;
        recordBtn.innerText = "إيقاف التسجيل";
    } catch (err) {
        console.log("التسجيل غير مدعوم:", err);
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.innerText = "تسجيل فيديو";
    }
}

recordBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

downloadBtn.addEventListener('click', () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'space-maestro-game.webm';
    a.click();
});

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
        const nose = landmarks[1];
        
        let targetX = (1 - nose.x) * canvasElement.width;
        player.x += (targetX - player.x) * 0.2;
    }

    // تحديث ورسم الكويكبات
    updateObstacles();
    
    // زيادة النقاط مع مرور الوقت
    score++;
    scoreElement.innerText = `النقاط: ${score}`;
}

// إنشاء وإدارة الكويكبات المعترضة
function updateObstacles() {
    if (Math.random() < 0.03) {
        obstacles.push({
            x: Math.random() * (canvasElement.width - 40),
            y: -50,
            width: 40,
            height: 40,
            speed: 5 + Math.floor(score / 200)
        });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += obs.speed;

        canvasCtx.fillStyle = '#ff3366';
        canvasCtx.fillRect(obs.x, obs.y, obs.width, obs.height);

        let distX = Math.abs(player.x - (obs.x + obs.width / 2));
        let distY = Math.abs(player.y - (obs.y + obs.height / 2));
        if (distX < player.size + obs.width / 2 && distY < player.size + obs.height / 2) {
            // انتهاء اللعبة
            gameStarted = false;
            if (isRecording) stopRecording();
            finalScoreText.innerText = `مجموع نقاطك: ${score}`;
            gameOverScreen.style.display = 'block';
            recordBtn.style.display = 'none';
        }

        if (obs.y > canvasElement.height) {
            obstacles.splice(i, 1);
        }
    }
}

// إعداد تشغيل الكاميرا ونظام الذكاء الاصطناعي للوجه
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
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

// بدء اللعبة
startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    recordBtn.style.display = 'inline-block';
    gameOverScreen.style.display = 'none';
    gameStarted = true;
    score = 0;
    obstacles = [];
    resizeCanvas();
    camera.start();
});

// إعادة المحاولة
restartBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    recordBtn.style.display = 'inline-block';
    gameStarted = true;
    score = 0;
    obstacles = [];
    resizeCanvas();
});
