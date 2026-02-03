let audioContext, analyser, dataArray, bpClient;
let activeNodeId = null;

const bodyState = {
    "node-L-Shoulder": { label: "Left Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 50 },
    "node-R-Shoulder": { label: "Right Shoulder", bass: 0.8, mid: 0.2, high: 0.1, threshold: 50 },
    "node-Chest": { label: "Chest", bass: 1.0, mid: 0.1, high: 0.0, threshold: 40 },
    "node-Ribs": { label: "Ribs", bass: 0.5, mid: 0.7, high: 0.2, threshold: 60 },
    "node-Stomach": { label: "Stomach", bass: 0.9, mid: 0.3, high: 0.0, threshold: 50 },
    "node-Back": { label: "Back", bass: 0.7, mid: 0.5, high: 0.5, threshold: 50 }
};

// --- BUTTPLUG / INTIFACE SETUP ---
async function initIntiface() {
    const connector = new Buttplug.ButtplugBrowserWebsocketConnectorOptions("ws://localhost:12345/buttplug");
    bpClient = new Buttplug.ButtplugClient("Haptic Mapper");
    try {
        await bpClient.connect(connector);
        document.getElementById('intifaceBtn').innerText = "CONNECTED";
        document.getElementById('intifaceBtn').style.background = "#10b981";
        await bpClient.startScanning();
    } catch (e) {
        alert("Intiface Central not found. Make sure it's running on port 12345.");
    }
}

// --- COLOR MATH ---
function getDynamicColor(b, m, h) {
    const total = b + m + h;
    if (total < 5) return '#334155';

    // Normalize values to find the winner
    // We boost Highs (h * 2) because mics are usually weak there
    const bWeight = b;
    const mWeight = m * 1.5;
    const hWeight = h * 3.0; 

    const max = Math.max(bWeight, mWeight, hWeight);
    
    if (max === bWeight) return `hsl(220, 90%, 60%)`; // Blue
    if (max === mWeight) return `hsl(150, 90%, 60%)`; // Green/Teal
    return `hsl(0, 95%, 60%)`; // Red
}

// --- ENGINE ---
async function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5; // Faster response
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    document.getElementById('startBtn').style.display = 'none';
    render();
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
                el.setAttribute('r', 10 + (intensity/30));
                
                // --- SEND TO INTIFACE ---
                if (bpClient && bpClient.devices.length > 0) {
                    const motorPower = Math.min(intensity / 200, 1.0);
                    bpClient.devices.forEach(d => d.vibrate(motorPower));
                }
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

// --- UI ---
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').onclick = initAudio;
    if(document.getElementById('intifaceBtn')) {
        document.getElementById('intifaceBtn').onclick = initIntiface;
    }

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
});
