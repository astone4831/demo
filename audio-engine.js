let audioContext, analyser, dataArray;

// UI Elements
const startBtn = document.getElementById('startBtn');
const pulseCircle = document.getElementById('pulseCircle');
const thresholdSlider = document.getElementById('threshold');
const thresholdValDisplay = document.getElementById('thresholdVal');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Sync Slider Value
thresholdSlider.addEventListener('input', () => {
    thresholdValDisplay.innerText = thresholdSlider.value;
});

startBtn.addEventListener('click', async () => {
    try {
        // Initialize Web Audio
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Update UI
        startBtn.style.display = 'none';
        document.getElementById('status').innerText = "Live";
        
        render();
    } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Please allow microphone access to use the haptic portal.");
    }
});

function render() {
    requestAnimationFrame(render);
    const startTime = performance.now();
    
    analyser.getByteFrequencyData(dataArray);

    // 1. Draw Frequency Visualizer
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3b82f6';
    const barWidth = (canvas.width / dataArray.length) * 2;
    dataArray.forEach((val, i) => {
        const x = barWidth * i;
        ctx.fillRect(x, canvas.height - val / 2, barWidth - 1, val / 2);
    });

    // 2. Process Bass for Haptics (Indices 0-4 = Sub/Low Bass)
    const bass = dataArray.slice(0, 5).reduce((a, b) => a + b) / 5;
    const threshold = parseInt(thresholdSlider.value);
    
    // 3. Trigger Virtual Haptic Pulse
    if (bass > threshold) {
        const intensity = (bass - threshold) / (255 - threshold);
        const scale = 1 + (intensity * 1.5);
        pulseCircle.style.transform = `scale(${scale})`;
        pulseCircle.style.opacity = "1";
        pulseCircle.style.boxShadow = `0 0 ${20 + (intensity * 30)}px rgba(59, 130, 246, 0.8)`;
    } else {
        pulseCircle.style.transform = `scale(1)`;
        pulseCircle.style.opacity = "0.2";
        pulseCircle.style.boxShadow = "none";
    }

    // 4. Update Telemetry
    document.getElementById('bassVal').innerText = Math.round(bass);
    document.getElementById('latency').innerText = (performance.now() - startTime).toFixed(2);
}