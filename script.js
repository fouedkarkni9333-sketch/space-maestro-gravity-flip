const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const menuOverlay = document.getElementById('menu-overlay');
const diffBtns = document.querySelectorAll('.diff-btn');

let gameStarted = false;
let score = 0;
let currentSpeed = 5;
let spawnRate = 0.035;

// إعداد نظام الأصوات التفاعلية (Web Audio API) لتجنب بطء التحميل
let audioCtx = null;
function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'start') {
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch(e) {}
}

// اختيار مستوى الصعوبة
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSpeed = parseFloat(btn.getAttribute('data-speed'));
        spawnRate = parseFloat(btn.getAttribute('data-spawn'));
    });
});

// إحداثيات شخصية اللاعب
let player = {
    x: 200,
    y: 400,
    size: 25,
    color: '#00ffcc'
};

let obstacles = [];
let stars = [];

// إنشاء نجوم خلفية لإعطاء عمق بصري للعبة
function initStars() {
    stars = [];
    for (let i = 0; i < 40; i++) {
        stars.push({
            x: Math.random() * canvasElement.width,
            y: Math.random() * canvasElement.height,
            size: Math.random() * 2,
            speed: Math.random() * 2 + 0.5
        });
    }
}

function resizeCanvas() {
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
    player.x = canvasElement.width / 2;
    player.y = canvasElement.height - 100;
    initStars();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// تتبع الوجه باستخدام MediaPipe FaceMesh وتحسين الأداء
function onResults(results) {
    if (!gameStarted) return;

    // مسح الشاشة
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // رسم الخلفية والنجوم المتحركة
    canvasCtx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvasElement.height) star.y = 0;
        canvasCtx.fillRect(star.x, star.y, star.size, star.size);
    });

    // رسم اللاعب بتأثير النيون
    canvasCtx.shadowBlur = 15;
    canvasCtx.shadowColor = player.color;
    canvasCtx.fillStyle = player.color;
    canvasCtx.beginPath();
    canvasCtx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.closePath();
    canvasCtx.shadowBlur = 0; // إلغاء التأثير لبقية العناصر تحسينًا للأداء

    // تتبع الوجه بدقة وسلاسة
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        let targetX = (1 - nose.x) * canvasElement.width;
        // جعل الحركة سلسة جداً بدون لاج
        player.x += (targetX - player.x) * 0.25;
        
        // الحفاظ على اللاعب داخل حدود الشاشة
        if (player.x < player.size) player.x = player.size;
        if (player.x > canvasElement.width - player.size) player.x = canvasElement.width - player.size;
    }

    updateObstacles();
    
    score++;
    scoreElement.innerText = `النقاط: ${Math.floor(score / 10)}`;
}

// إدارة الكويكبات والعقبات
function updateObstacles() {
    if (Math.random() < spawnRate) {
        obstacles.push({
            x: Math.random() * (canvasElement.width - 40),
            y: -50,
            width: 35,
            height: 35,
            speed: currentSpeed + Math.floor(score / 300)
        });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += obs.speed;

        // رسم كويكب بتصميم أفضل
        canvasCtx.fillStyle = '#ff3366';
        canvasCtx.fillRect(obs.x, obs.y, obs.width, obs.height);
        canvasCtx.strokeStyle = '#ffffff';
        canvasCtx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // التحقق من الاصطدام بدقة دائرية
        let distX = Math.abs(player.x - (obs.x + obs.width / 2));
        let distY = Math.abs(player.y - (obs.y + obs.height / 2));
        if (distX < player.size + obs.width / 3 && distY < player.size + obs.height / 3) {
            playSound('hit');
            alert(`انتهت اللعبة! مجموع نقاطك: ${Math.floor(score / 10)}`);
            gameStarted = false;
            score = 0;
            obstacles = [];
            menuOverlay.style.display = 'flex';
        }

        if (obs.y > canvasElement.height) {
            obstacles.splice(i, 1);
        }
    }
}

// إعداد نظام الذكاء الاصطناعي للوجه بكفاءة عالية للهواتف
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false, // تعطيل النقاط الدقيقة جداً لتقليل استهلاك المعالج (اللاج)
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
    width: 320,  // تقليل دقة الكاميرا الداخلية لمنع التقطيع واللاج على الهواتف
    height: 480
});

// بدء اللعبة
startBtn.addEventListener('click', () => {
    playSound('start');
    menuOverlay.style.display = 'none';
    gameStarted = true;
    score = 0;
    obstacles = [];
    camera.start();
});
