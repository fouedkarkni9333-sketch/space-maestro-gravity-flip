const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const videoElement = document.getElementById('video-element');

// Adaptive dimensions for all devices
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
    radius: 20,
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
        console.log("Recording not supported on this device/browser:", e);
    }
}

function toggleRecording() {
    if (!isRecording) {
        startRecording();
        alert("Recording started...");
    } else {
        stopRecording();
        alert("Recording stopped! Ready to download.");
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

// MediaPipe FaceMesh Tracking
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

    // Smooth movement interpolation
    player.x += (player.targetX - player.x) * 0.18;
    
    if (player.x < player.radius) player.x = player.radius;
    if (player.x > canvasWidth - player.radius) player.x = canvasWidth - player.radius;

    obstacleTimer++;
    if (obstacleTimer > 50) {
        obstacles.push({
            x: Math.random() * (canvasWidth - 50) + 25,
            y: -50,
            width: 40,
            height: 40,
            speed: 4.5 + Math.floor(score / 8)
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
    ctx.clearRect(0, 0, canvasWidth, canvasWidth);

    // Background space grid effect
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Obstacles (Neon Red)
    for (let obs of obstacles) {
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 12;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.shadowBlur = 0;
    }

    // Draw Player (Neon Cyan spaceship/avatar with eyes)
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player expressive eyes
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(player.x - 7, player.y - 5, 4, 5);
    ctx.fillRect(player.x + 3, player.y - 5, 4, 5);
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
