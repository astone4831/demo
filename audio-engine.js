let audioContext, analyser, dataArray;
let activeNodeId = null;

// The "Brain" - Stores mix settings for every part of the body
const bodyState = {
    "node-L-Shoulder": { label: "Left Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 80 },
    "node-R-Shoulder": { label: "Right Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 80 },
    "node-Chest": { label: "Chest", bass: 1.0, mid: 0.1, high: 0.0, threshold: 60 },
    "node-Stomach": { label: "Stomach", bass: 0.9, mid: 0.3, high: 0.0, threshold: 70 },
    "node-Ribs": { label: "Ribs", bass: 0.5, mid: 0.7, high: 0.2, threshold: 90 },
    "node-Back": { label: "Back", bass: 0.7, mid: 0.5, high: 0.5, threshold: 80 }
};

// UI Selectors
const bodyView = document.getElementById('bodyView');
const mixerView = document.getElementById('mixerView');

// 1. NAVIGATION LOGIC
document.querySelectorAll('.node').forEach(node => {
    node.addEventListener('click', () => {
        activeNodeId = node.id;
        showMixer(activeNodeId);
    });
});

document.getElementById('backBtn').addEventListener('click', () => {
    mixerView.classList.add('hidden');
    bodyView.classList.remove('hidden');
});

function showMixer(id) {
    const settings = bodyState[id];
    document.getElementById('activeNodeLabel').innerText = settings.label;
    document.getElementById('mix-bass').value = settings.bass;
    document.getElementById('mix-mid').value = settings.mid;
    document.getElementById('mix-high').value = settings.high;
    document.getElementById('node-threshold').value = settings.threshold;
    
    bodyView.classList.add('hidden');
    mixerView.classList.remove('hidden');
}

// Update state when sliders move
['bass', 'mid', 'high', 'threshold'].forEach(key => {
    const el = document.getElementById(key === 'threshold' ? `node-threshold` : `mix-${key}`);
    el.addEventListener('input', (e) => {
        if (activeNodeId) bodyState[activeNodeId][key] = parseFloat(e.target.value);
    });
});

// 2. AUDIO ENGINE
document.getElementById('startBtn').addEventListener('click', async () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    document.getElementById('startBtn').style.display = 'none';
    render();
});

function render() {
    requestAnimationFrame(render);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    // Get basic band energy
    const b = getAvg(0, 8);
    const m = getAvg(9, 45);
    const h = getAvg(46, 100);

    // Pulse the body nodes based on their specific mix settings
    Object.keys(bodyState).forEach(id => {
        const s = bodyState[id];
        const mixedIntensity = (b * s.bass) + (m * s.mid) + (h * s.high);
        const nodeEl = document.getElementById(id);
        
        if (mixedIntensity > s.threshold) {
            const scale = 1 + (mixedIntensity / 512);
            nodeEl.style.transformOrigin = "center";
            nodeEl.setAttribute('r', 8 * scale);
            nodeEl.classList.add('active-glow');
        } else {
            nodeEl.setAttribute('r', 8);
            nodeEl.classList.remove('active-glow');
        }
    });
}

function getAvg(start, end) {
    const slice = dataArray.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}