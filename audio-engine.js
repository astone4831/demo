let audioContext, analyser, dataArray, biquadFilter;

// UI Elements
const startBtn = document.getElementById('startBtn');
const pulseCircle = document.getElementById('pulseCircle');
const thresholdSlider = document.getElementById('threshold');
const thresholdValDisplay = document.getElementById('thresholdVal');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

thresholdSlider.addEventListener('input', () => {
    thresholdValDisplay.innerText = thresholdSlider.value;
});

startBtn.addEventListener('click', async () => {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        // 1. THE FILTER: Block high-frequency noise (fan hiss/chatter)
        // We set it to 150Hz to focus purely on "thump" frequencies
        biquadFilter = audioContext.createBiquadFilter();
        biquadFilter.type = "lowpass";
        biquadFilter.frequency.setValueAtTime(150, audioContext.currentTime);
        biquadFilter.Q.setValueAtTime(1, audioContext.currentTime); // Slight resonance

        // 2. THE ANALYSER: For visualization and data extraction
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        analyser.smoothingTimeConstant = 0.8; // Makes the pulse less "jittery"

        // ROUTING: Mic -> Filter -> Analyser
        source.connect(biquadFilter);
        biquadFilter.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        startBtn.style.display = 'none';
        document.getElementById('status').innerText = "Filtered Live";
        
        render();
    } catch (err) {
        console.error("Setup failed:", err);
    }
});

function render() {
    requestAnimationFrame(render);
    const startTime = performance.now();
    analyser.getByteFrequencyData(dataArray);

    // 1. Draw Visualizer (Notice the bars on the right will now be flat)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2;
    dataArray.forEach((val, i) => {
        // We color the "Active" haptic range differently
        ctx.fillStyle = i < 10 ? '#3b82f6' : '#1e293b'; 
        const x = barWidth * i;
        ctx.fillRect(x, canvas.height - val / 2, barWidth - 1, val / 2);
    });

    // 2. THE NOISE GATE: Isolate Bass and apply threshold
    // We average the first 4 bins (the deepest sub-bass)
    const rawBass = dataArray.slice(0, 4).reduce((a, b) => a + b) / 4;
    const threshold = parseInt(thresholdSlider.value);
    
    // 3. Trigger Virtual Haptic
    // Logic: If below threshold, output is 0. If above, we scale the intensity.
    if (rawBass > threshold) {
        const dynamicRange = 255 - threshold;
        const intensity = (rawBass - threshold) / dynamicRange;
        const scale = 1 + (intensity * 1.8); // High-impact scaling
        
        pulseCircle.style.transform = `scale(${scale})`;
        pulseCircle.style.opacity = "1";
        pulseCircle.style.background = `rgba(59, 130, 246, ${0.5 + intensity})`;
        pulseCircle.style.boxShadow = `0 0 ${30 * intensity}px #3b82f6`;
    } else {
        // Hard Gate: No movement if below threshold
        pulseCircle.style.transform = `scale(1)`;
        pulseCircle.style.opacity = "0.1";
        pulseCircle.style.boxShadow = "none";
    }

    // 4. Telemetry
    document.getElementById('bassVal').innerText = Math.round(