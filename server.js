const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS for React frontend (only during development)
app.use(cors());

// Serve static files (React build in production)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for PIN-based sessions
const sessions = {}; // { pin: { userSocket: WebSocket, arduinoSocket: WebSocket } }

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, request, pin) => {
    if (!sessions[pin]) {
        ws.close(); // Close connection if the PIN is invalid
        return;
    }

    const session = sessions[pin];
    if (!session.userSocket) {
        // Assign WebSocket as the user
        session.userSocket = ws;
        console.log(`User connected with PIN: ${pin}`);

        ws.on('message', (message) => {
            console.log(`Message from user [PIN ${pin}]: ${message}`);
            if (session.arduinoSocket) {
                session.arduinoSocket.send(message); // Forward to Arduino
            }
        });

        ws.on('close', () => {
            console.log(`User disconnected [PIN ${pin}]`);
            if (session.arduinoSocket) {
                session.arduinoSocket.send('DISCONNECT');
                session.arduinoSocket.close();
            }
            delete sessions[pin];
        });
    } else if (!session.arduinoSocket) {
        // Assign WebSocket as the Arduino
        session.arduinoSocket = ws;
        console.log(`Arduino connected with PIN: ${pin}`);

        ws.on('message', (message) => {
            console.log(`Message from Arduino [PIN ${pin}]: ${message}`);
            if (session.userSocket) {
                session.userSocket.send(`Arduino says: ${message}`); // Forward to user
            }
        });

        ws.on('close', () => {
            console.log(`Arduino disconnected [PIN ${pin}]`);
            if (session.userSocket) {
                session.userSocket.send('Arduino disconnected');
            }
            delete sessions[pin];
        });
    }
});

// Handle WebSocket upgrades
app.server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pin = url.searchParams.get('pin');

    if (!sessions[pin]) {
        socket.destroy(); // Reject invalid connections
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, pin);
    });
});

// API endpoint to generate a PIN
app.get('/generate-pin', (req, res) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit PIN
    sessions[pin] = { userSocket: null, arduinoSocket: null }; // Initialize session
    res.json({ pin });
});
