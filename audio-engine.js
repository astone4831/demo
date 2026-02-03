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

// --- AUDIO ENGINE ---
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

// --- INTIFACE v3.2.2 FINAL STABLE CONNECT ---
async function initIntiface() {
    const btn = document.getElementById('intifaceBtn');
    
    // FAILSAFE: Find the library regardless of casing
    const bpLib = window.Buttplug || window.buttplug;
    
    if (!bpLib) {
        console.error("Buttplug library not found in window object.");
        alert("Library error: Try refreshing. If you're offline, this won't work.");
        return;
    }

    btn.innerText = "Connecting...";
    
    try {
        // Instantiate using the library we found
        bpClient = new bpLib.ButtplugClient("Haptic Mapper");

        const address = "ws://localhost:12345/buttplug";
        const connector = new bpLib.ButtplugBrowserWebsocketClientConnector(address);

        await bpClient.connect(connector);
        
        btn.innerText = "CONNECTED";
        btn.style.background = "#10b981";
        await bpClient.startScanning();
    } catch (e) {
        console.error("Intiface Error:", e);
        btn.innerText = "RETRY";
        btn.style.background = "#ef4444";
    }
}

function getDynamicColor(b, m, h) {
    const bW = b * 1.0; const mW = m * 2.0; const hW = h * 4.0;
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
        if (el && intensity > s.threshold) {
            const color = getDynamicColor(nB, nM, nH);
            el.style.fill = color;
            el.classList.add('active-glow');
            el.setAttribute('r', 10 + (intensity/25));
            
            if (bpClient && bpClient.connected) {
                const power = Math.min(intensity / 255, 1.0);
                bpClient.devices.forEach(d => {
                    if (d.vibrateAttributes.length > 0) d.vibrate(power).catch(()=>{});
                });
            }
        } else if (el) {
            el.style.fill = "#334155";
            el.classList.remove('active-glow');
            el.setAttribute('r', 10);
        }
    });
}

function getAvg(s, e) {
    let sum = 0;
    for (let i = s; i <= e; i++) sum += dataArray[i];
    return sum / (e - s + 1);
}

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

    ['bass', 'mid', 'high'].forEach(k => {
        const slider = document.getElementById(`mix-${k}`);
        if (slider) {
            slider.oninput = (e) => {
                if (activeNodeId) bodyState[activeNodeId][k] = parseFloat(e.target.value);
            };
        }
    });
    
    const thresh = document.getElementById('node-threshold');
    if (thresh) {
        thresh.oninput = (e) => {
            if (activeNodeId) bodyState[activeNodeId].threshold = parseInt(e.target.value);
        };
    }
};
