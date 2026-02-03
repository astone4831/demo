let audioContext, analyser, dataArray, bpClient;
let activeNodeId = null;

// Initial State / Defaults
const bodyState = {
    "node-L-Shoulder": { label: "Left Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 50 },
    "node-R-Shoulder": { label: "Right Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 50 },
    "node-Chest": { label: "Chest", bass: 1.0, mid: 0.1, high: 0.0, threshold: 40 },
    "node-Ribs": { label: "Ribs", bass: 0.5, mid: 0.7, high: 0.2, threshold: 60 },
    "node-Stomach": { label: "Stomach", bass: 0.9, mid: 0.3, high: 0.0, threshold: 50 },
    "node-Back": { label: "Back", bass: 0.7, mid: 0.5, high: 0.5, threshold: 50 }
};

// --- ENGINE START ---
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        document.getElementById('startBtn').style.display = 'none';
        render();
    } catch (e) { alert("Mic Access Denied"); }
}

// --- COLOR ENGINE (With 0-value check) ---
function getDynamicColor(b, m, h) {
    const bW = b * 1.0;
    const mW = m * 1.8; // Boost mids for visibility
    const hW = h * 3.5; // Heavy boost for high-freq snaps

    const max = Math.max(bW, mW, hW);
    if (max < 2) return '#334155';

    if (max === bW) return `hsl(220, 90%, 60%)`; // Blue
    if (max === mW) return `hsl(150, 90%, 60%)`; // Green
    return `hsl(0, 95%, 60%)`; // Red
}

function render() {
    requestAnimationFrame(render);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    const rawB = getAvg(0, 4);
    const rawM = getAvg(10, 40);
    const rawH = getAvg(50, 100);

    Object.keys(bodyState).forEach(id => {
        const s = bodyState[id];
        const nB = rawB * s.bass;
        const nM = rawM * s.mid;
        const nH = rawH * s.high;
        const intensity = nB + nM + nH;
        
        const el = document.getElementById(id);
        if (el) {
            if (intensity > s.threshold) {
                const color = getDynamicColor(nB, nM, nH);
                el.style.fill = color;
                el.style.filter = `drop-shadow(0 0 10px ${color})`;
                el.setAttribute('r', 10 + (intensity/25));
            } else {
                el.style.fill = "#334155";
                el.style.filter = "none";
                el.setAttribute('r', 10);
            }
        }
    });
}

function getAvg(start, end) {
    let sum = 0;
    for (let i = start; i <= end; i++) sum += dataArray[i];
    return sum / (end - start + 1);
}

// --- UI / STATE MANAGEMENT ---

function openMixer(id) {
    activeNodeId = id;
    const s = bodyState[id];

    // CRITICAL: Set slider positions to MATCH the saved state
    document.getElementById('activeNodeLabel').innerText = s.label;
    document.getElementById('mix-bass').value = s.bass;
    document.getElementById('mix-mid').value = s.mid;
    document.getElementById('mix-high').value = s.high;
    document.getElementById('node-threshold').value = s.threshold;

    document.getElementById('bodyView').classList.add('hidden');
    document.getElementById('mixerView').classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').onclick = initAudio;

    // Node Selection
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('node')) {
            openMixer(e.target.id);
        }
    });

    // Back / Save
    document.getElementById('backBtn').onclick = () => {
        document.getElementById('mixerView').classList.add('hidden');
        document.getElementById('bodyView').classList.remove('hidden');
    };

    // Live State Sync (Updates object as you slide)
    ['bass', 'mid', 'high'].forEach(key => {
        document.getElementById(`mix-${key}`).oninput = (e) => {
            if (activeNodeId) {
                bodyState[activeNodeId][key] = parseFloat(e.target.value);
            }
        };
    });

    document.getElementById('node-threshold').oninput = (e) => {
        if (activeNodeId) {
            bodyState[activeNodeId].threshold = parseInt(e.target.value);
        }
    };
});
