// signaling_server.js
const WebSocket = require('ws');

// We'll run our server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log('OopisOS Signaling Server is running on port 8080...');

// This will keep track of all connected clients
wss.on('connection', function connection(ws) {
    console.log('A new client has connected.');

    // When a client sends a message...
    ws.on('message', function incoming(message) {
        console.log('Received message => %s', message);

        // ...we send that message to every *other* client.
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('A client has disconnected.');
    });

    ws.on('error', (error) => {
        console.error('A client connection had an error:', error);
    });
});