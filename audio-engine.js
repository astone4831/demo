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
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        document.getElementById('startBtn').style.display = 'none';
        render();
    } catch (err) {
        console.error("Mic error:", err);
    }
}

// THE FIX: Direct color mapping based on dominance
function getDominantColor(b, m, h) {
    // If it's mostly bass, Hue = 220 (Blue)
    // If it's mostly mids, Hue = 140 (Green/Teal)
    // If it's mostly highs, Hue = 0 (Red)
    
    const maxVal = Math.max(b, m, h);
    if (maxVal < 5) return '#334155'; // Dead state

    let hue;
    if (maxVal === b) hue = 220; // Bass Blue
    else if (maxVal === m) hue = 140; // Mid Green
    else hue = 0; // High Red

    return `hsl(${hue}, 90%, 60%)`;
}

function render() {
    requestAnimationFrame(render);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    // Get Raw Band Energy
    const rawB = getAvg(0, 6);
    const rawM = getAvg(7, 30);
    const rawH = getAvg(31, 100);

    Object.keys(bodyState).forEach(id => {
        const s = bodyState[id];
        
        // Calculate the specific energy for THIS node's settings
        const nodeB = rawB * s.bass;
        const nodeM = rawM * s.mid;
        const nodeH = rawH * s.high;
        
        const mixedTotal = nodeB + nodeM + nodeH;
        const el = document.getElementById(id);
        
        if (el) {
            if (mixedTotal > s.threshold) {
                const color = getDominantColor(nodeB, nodeM, nodeH);
                el.style.fill = color;
                el.style.filter = `drop-shadow(0 0 12px ${color})`;
                el.setAttribute('r', 10 + (mixedTotal / 40)); 
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
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').onclick = initAudio;

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

    // Sliders Sync
    ['bass', 'mid', 'high'].forEach(key => {
        document.getElementById(`mix-${key}`).oninput = (e) => {
            if (activeNodeId) bodyState[activeNodeId][key] = parseFloat(e.target.value);
        };
    });
    document.getElementById('node-threshold').oninput = (e) => {
        if (activeNodeId) bodyState[activeNodeId].threshold = parseInt(e.target.value);
    };
});
