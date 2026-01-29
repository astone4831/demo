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

// INITIALIZE CLICK LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(node => {
        node.onclick = function() {
            activeNodeId = this.id;
            const settings = bodyState[activeNodeId];
            
            document.getElementById('activeNodeLabel').innerText = settings.label;
            document.getElementById('mix-bass').value = settings.bass;
            document.getElementById('mix-mid').value = settings.mid;
            document.getElementById('mix-high').value = settings.high;
            document.getElementById('node-threshold').value = settings.threshold;
            
            document.getElementById('bodyView').classList.add('hidden');
            document.getElementById('mixerView').classList.remove('hidden');
        };
    });
});

document.getElementById('backBtn').onclick = () => {
    document.getElementById('mixerView').classList.add('hidden');
    document.getElementById('bodyView').classList.remove('hidden');
};

// SLIDER UPDATES
['bass', 'mid', 'high'].forEach(key => {
    document.getElementById(`mix-${key}`).oninput = (e) => {
        if (activeNodeId) bodyState[activeNodeId][key] = parseFloat(e.target.value);
    };
});
document.getElementById('node-threshold').oninput = (e) => {
    if (activeNodeId) bodyState[activeNodeId].threshold = parseInt(e.target.value);
};

// AUDIO ENGINE
document.getElementById('startBtn').onclick = async () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    document.getElementById('startBtn').style.display = 'none';
    render();
};

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
        
        if (mixed > s.threshold) {
            el.classList.add('active-glow');
            el.setAttribute('r', 12); 
        } else {
            el.classList.remove('active-glow');
            el.setAttribute('r', 10);
        }
    });
}

function getAvg(start, end) {
    const slice = dataArray.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}