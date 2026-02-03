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

// --- AUDIO INITIALIZATION ---
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
    } catch (e) { 
        console.error(e);
        alert("Microphone access denied."); 
    }
}

// --- INTIFACE / BUTTPLUG CONNECTION (v3.0.0 FIX) ---
async function initIntiface() {
    const btn = document.getElementById('intifaceBtn');
    btn.innerText = "Connecting...";
    
    try {
        // In v3.0, we use ButtplugClient and the Websocket Connector directly
        bpClient = new Buttplug.ButtplugClient("Haptic Mapper");

        // The connector class name updated in v3
        const connector = new Buttplug.ButtplugBrowserWebsocketClientConnector("ws://localhost:12345");

        await bpClient.connect(connector);
        
        btn.innerText = "CONNECTED";
        btn.style.background = "var(--green)";
        
        // Start scanning for hardware
        await bpClient.startScanning();
        
        console.log("Intiface Connected. Scanning for devices...");
    } catch (e) {
        console.error("Connection Error:", e);
        btn.innerText = "RETRY INTIFACE";
        btn.style.background = "var(--red)";
        alert("Could not connect. Is Intiface Central running with the Server STARTED?");
    }
}

// --- COLOR ENGINE ---
function getDynamicColor(b, m, h) {
    const bW = b * 1.0;
    const mW = m * 2.0;
    const hW = h * 4.0;
    const max = Math.max(bW, mW, hW);
    if (max < 2) return '#334155';
    if (max === bW) return `hsl(220, 90%, 60%)`; 
    if (max === mW) return `hsl(150, 90%, 60%)`; 
    return `hsl(0, 95%, 60%)`; 
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
                el.classList.add('active-glow');
                el.setAttribute('r', 10 + (intensity/25));
                
                // --- PHYSICAL HAPTIC OUTPUT ---
                if (bpClient && bpClient.connected && bpClient.devices.length > 0) {
                    const power = Math.min(intensity / 255, 1.0);
                    bpClient.devices.forEach(d => {
                        // Check if device supports vibration
                        if (d.vibrateAttributes.length > 0) {
                            d.vibrate(power).catch(() => {}); // Send and ignore errors
                        }
                    });
                }
            } else {
                el.style.fill = "#334155";
                el.classList.remove('active-glow');
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

// --- UI FLOW ---
function openMixer(id) {
    activeNodeId = id;
    const s = bodyState[id];
    document.getElementById('activeNodeLabel').innerText = s.label;
    document.getElementById('mix-bass').value = s.bass;
    document.getElementById('mix-mid').value = s.mid;
    document.getElementById('mix-high').value = s.high;
    document.getElementById('node-threshold').value = s.threshold;

    document.getElementById('bodyView').classList.add('hidden');
    document.getElementById('mixerView').classList.remove('hidden');
}

window.onload = () => {
    document.getElementById('startBtn').onclick = initAudio;
    document.getElementById('intifaceBtn').onclick = initIntiface;
    document.getElementById('backBtn').onclick = () => {
        document.getElementById('mixerView').classList.add('hidden');
        document.getElementById('bodyView').classList.remove('hidden');
    };

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('node')) openMixer(e.target.id);
    });

    ['bass', 'mid', 'high'].forEach(key => {
        const el = document.getElementById(`mix-${key}`);
        if(el) {
            el.oninput = (e) => {
                if (activeNodeId) bodyState[activeNodeId][key] = parseFloat(e.target.value);
            };
        }
    });
    
    const thresh = document.getElementById('node-threshold');
    if(thresh) {
        thresh.oninput = (e) => {
            if (activeNodeId) bodyState[activeNodeId].threshold = parseInt(e.target.value);
        };
    }
};
