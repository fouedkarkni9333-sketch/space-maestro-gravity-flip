const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const videoElement = document.getElementById('video-element');

let canvasWidth = 400;
let canvasHeight = 650;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let score = 0;
let isGameOver = false;
let gameStarted = true;

let player = {
    x: canvasWidth / 2,
    y: canvasHeight - 100,
    radius: 22,
    targetX: canvasWidth / 2
};

let obstacles = [];
let obstacleTimer = 0;

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

function startRecording() {
    try {
        const stream = canvas.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.start();
        isRecording = true;
    } catch (e) {
        console.log("التسجيل غير مدعوم على هذا المتصفح:", e);
    }
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
        alert("بدء تسجيل الفيديو...");
    } else {
        stopRecording();
        alert("تم إيقاف التسجيل وجاهز للتحميل!");
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'space-maestro-gameplay.webm';
    a.click();
}

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        player.targetX = (1 - nose.x) * canvasWidth;
    }
}

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
        await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();

function update() {
    if (!gameStarted || isGameOver) return;

    player.x += (player.targetX - player.x) * 0.15;
    
    if (player.x < player.radius) player.x = player.radius;
    if (player.x > canvasWidth - player.radius) player.x = canvasWidth - player.radius;

    obstacleTimer++;
    if (obstacleTimer > 55) {
        obstacles.push({
            x: Math.random() * (canvasWidth - 60) + 30,
            y: -50,
            width: 45,
            height: 45,
            speed: 4 + Math.floor(score / 10)
        });
        obstacleTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += obstacles[i].speed;

        let obs = obstacles[i];
        let distX = Math.abs(player.x - obs.x - obs.width / 2);
        let distY = Math.abs(player.y - obs.y - obs.height / 2);

        if (distX < (obs.width / 2 + player.radius) && distY < (obs.height / 2 + player.radius)) {
            triggerGameOver();
        }

        if (obstacles[i].y > canvasHeight) {
            obstacles.splice(i, 1);
            score += 1;
            document.getElementById('score-val').innerText = score;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let obs of obstacles) {
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(player.x - 8, player.y - 6, 5, 6);
    ctx.fillRect(player.x + 3, player.y - 6, 5, 6);
}

function mainLoop() {
    update();
    draw();
    requestAnimationFrame(mainLoop);
}

function triggerGameOver() {
    isGameOver = true;
    if (isRecording) stopRecording();
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-screen').style.display = 'block';
}

function restartGame() {
    score = 0;
    document.getElementById('score-val').innerText = score;
    obstacles = [];
    isGameOver = false;
    document.getElementById('game-over-screen').style.display = 'none';
}

requestAnimationFrame(mainLoop);
