import React, { useState, useEffect } from "react";

function App() {
    const [pin, setPin] = useState(null);
    const [status, setStatus] = useState("Not connected");
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState("");
    const [arduinoResponse, setArduinoResponse] = useState("");

    // Generate a PIN when requested
    const generatePin = async () => {
        try {
            const response = await fetch('http://localhost:3000/generate-pin'); // Add the backend URL with port
            const data = await response.json();
            setPin(data.pin);
        } catch (err) {
            console.error("Error generating PIN:", err);
        }
    };

    // Connect WebSocket when the PIN is set
    useEffect(() => {
        if (pin) {
            const ws = new WebSocket(`ws://localhost:3000?pin=${pin}`);
            setSocket(ws);

            ws.onopen = () => setStatus("Connected");
            ws.onmessage = (event) => setArduinoResponse(event.data);
            ws.onclose = () => setStatus("Disconnected");
            ws.onerror = (err) => console.error("WebSocket error:", err);

            return () => {
                ws.close();
            };
        }
    }, [pin]);

    // Send a message to the WebSocket server
    const sendMessage = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
            setMessage("");
        } else {
            alert("WebSocket is not connected");
        }
    };

    // Disconnect the WebSocket connection
    const disconnect = () => {
        if (socket) {
            socket.close();
            setSocket(null);
            setStatus("Not connected");
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>WebSocket with PIN Connection</h1>

            <div>
                <button onClick={generatePin}>Generate PIN</button>
                <p>Your PIN: <strong>{pin || "None"}</strong></p>
            </div>

            <div>
                <h3>Status: <span>{status}</span></h3>
                <input
                    type="text"
                    placeholder="Type a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={sendMessage}>Send</button>
                <button onClick={disconnect}>Disconnect</button>
            </div>

            <div>
                <h3>Arduino says: <span>{arduinoResponse}</span></h3>
            </div>
        </div>
    );
}

export default App;
