let audioContext, analyser, dataArray;
let activeNodeId = null;

const bodyState = {
    "node-L-Shoulder": { label: "Left Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 80 },
    "node-R-Shoulder": { label: "Right Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 80 },
    "node-Chest": { label: "Chest", bass: 1.0, mid: 0.1, high: 0.0, threshold: 60 },
    "node-Ribs": { label: "Ribs", bass: 0.5, mid: 0.7, high: 0.2, threshold: 90 },
    "node-Stomach": { label: "Stomach", bass: 0.9, mid: 0.3, high: 0.0, threshold: 70 },
    "node-Back": { label: "Back", bass: 0.7, mid: 0.5, high: 0.5, threshold: 80 }
};

// --- CORE ENGINE ---
async function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('status-tag').innerText = "LIVE";
        render();
    } catch (err) {
        console.error("Mic failed:", err);
    }
}

// Helper to calculate color based on frequency dominance
// Blue (240deg) for Bass, Red (0deg) for Highs
function getHapticColor(b, m, h) {
    const total = b + m + h;
    if (total === 0) return '#334155';
    
    // Weight the hue: Bass moves it toward 240, Highs move it toward 0/360
    const hue = ((b * 240) + (m * 120) + (h * 0)) / total;
    return `hsl(${hue}, 80%, 60%)`;
}

function render() {
    requestAnimationFrame(render);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    const b = getAvg(0, 8);
    const m = getAvg(9, 45);
    const h = getAvg(46, 100);

    Object.keys(bodyState).forEach(id => {
        const s = bodyState[id];
        const mixed = (b * s.bass) + (m * s.mid) + (h * s.high);
        const el = document.getElementById(id);
        
        if (el) {
            if (mixed > s.threshold) {
                const color = getHapticColor(b * s.bass, m * s.mid, h * s.high);
                el.style.fill = color;
                el.style.filter = `drop-shadow(0 0 8px ${color})`;
                el.setAttribute('r', 12 + (mixed / 50)); 
            } else {
                el.style.fill = "#334155";
                el.style.filter = "none";
                el.setAttribute('r', 10);
            }
        }
    });
}

function getAvg(start, end) {
    const slice = dataArray.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// --- UI EVENT BINDING ---
window.onload = () => {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.onclick = initAudio;

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('node')) {
            activeNodeId = e.target.id;
            const s = bodyState[activeNodeId];
            
            document.getElementById('activeNodeLabel').innerText = s.label;
            document.getElementById('mix-bass').value = s.bass;
            document.getElementById('mix-mid').value = s.mid;
            document.getElementById('mix-high').value = s.high;
            document.getElementById('node-threshold').value = s.threshold;
            
            document.getElementById('bodyView').classList.add('hidden');
            document.getElementById('mixerView').classList.remove('hidden');
        }
    });

    document.getElementById('backBtn').onclick = () => {
        document.getElementById('mixerView').classList.add('hidden');
        document.getElementById('bodyView').classList.remove('hidden');
    };
};

// Sync sliders to state
['bass', 'mid', 'high'].forEach(key => {
    const slider = document.getElementById(`mix-${key}`);
    if (slider) {
        slider.oninput = (e) => {
            if (activeNodeId) bodyState[activeNodeId][key] = parseFloat(e.target.value);
        };
    }
});iveNodeId].threshold = parseInt(e.target.value);
};
