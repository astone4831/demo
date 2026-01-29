let audioContext, analyser, dataArray, gainNode;

const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Sliders
const gSlider = document.getElementById('gainSlider');
const gDisp = document.getElementById('gainDisp');
const tBass = document.getElementById('thresholdBass');
const tMid = document.getElementById('thresholdMid');
const tHigh = document.getElementById('thresholdHigh');

// UI Circles
const pBass = document.getElementById('pulseBass');
const pMid = document.getElementById('pulseMid');
const pHigh = document.getElementById('pulseHigh');

startBtn.addEventListener('click', async () => {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);

        // Pre-processing: Gain
        gainNode = audioContext.createGain();
        source.connect(gainNode);

        // Analysis
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        gainNode.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        startBtn.style.display = 'none';
        document.getElementById('status').innerText = "Active";
        
        render();
    } catch (e) {
        alert("Microphone access is required for this app.");
    }
});

function render() {
    requestAnimationFrame(render);
    const start = performance.now();

    // 1. Update Gain from Slider
    if (gainNode) {
        gainNode.gain.value = gSlider.value;
        gDisp.innerText = gSlider.value;
    }

    analyser.getByteFrequencyData(dataArray);

    // 2. Draw Visualizer
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barW = (canvas.width / dataArray.length) * 2;
    dataArray.forEach((v, i) => {
        ctx.fillStyle = i < 10 ? '#3b82f6' : i < 50 ? '#10b981' : '#f59e0b';
        ctx.fillRect(barW * i, canvas.height - v/2, barW - 1, v/2);
    });

    // 3. Process 3 Bands
    // Bass: 0-150Hz, Mids: 150Hz-2kHz, Highs: 2kHz+
    const bVal = getAvg(0, 8);
    const mVal = getAvg(9, 45);
    const hVal = getAvg(46, 100);

    updateUI(pBass, bVal, tBass.value);
    updateUI(pMid, mVal, tMid.value);
    updateUI(pHigh, hVal, tHigh.value);

    // 4. Performance Telemetry
    document.getElementById('latency').innerText = (performance.now() - start).toFixed(2);
}

function getAvg(start, end) {
    const slice = dataArray.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function updateUI(el, val, threshold) {
    if (val > threshold) {
        const intensity = (val - threshold) / (255 - threshold);
        el.style.transform = `scale(${1 + intensity * 1.6})`;
        el.style.opacity = "1";
    } else {
        el.style.transform = "scale(1)";
        el.style.opacity = "0.1";
    }
}