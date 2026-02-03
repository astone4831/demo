async function initIntiface() {
    const btn = document.getElementById('intifaceBtn');
    btn.innerText = "Connecting...";

    try {
        // 1. Mandatory Buttplug initialization
        await Buttplug.buttplugInit();

        // 2. Create the connector to Intiface Central's default port
        // Note: We use 'ButtplugBrowserWebsocketClientConnector' for web apps
        const address = "ws://localhost:12345/buttplug";
        const connector = new Buttplug.ButtplugBrowserWebsocketClientConnector(address);
        
        bpClient = new Buttplug.ButtplugClient("Haptic Mapper");

        // 3. Set up event listeners BEFORE connecting
        bpClient.addListener("deviceadded", (device) => {
            console.log(`Device connected: ${device.name}`);
            btn.innerText = "DEVICE ACTIVE";
            btn.style.background = "#10b981";
        });

        // 4. Attempt the connection
        await bpClient.connect(connector);
        console.log("Connected to Intiface Central!");
        btn.innerText = "SEARCHING...";
        
        // 5. Start looking for your Bluetooth/USB devices
        await bpClient.startScanning();

    } catch (e) {
        console.error("Connection failed:", e);
        btn.innerText = "RETRY CONN";
        btn.style.background = "#ef4444";
        alert("Connection Failed: Ensure Intiface Central is running and the Server is STARTED (Big Play Button).");
    }
}
