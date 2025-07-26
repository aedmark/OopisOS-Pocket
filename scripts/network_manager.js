// scripts/network_manager.js
class NetworkManager {
    constructor() {
        this.instanceId = `oos-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.channel = new BroadcastChannel('oopisos-network');
        this.dependencies = {};
        this.listenCallback = null;

        // --- WebRTC Properties ---
        this.signalingServerUrl = 'wss://socketsbay.com/wss/v2/1/demo/';
        this.websocket = null;
        this.peers = new Map(); // Stores RTCPeerConnection objects
        this.remoteInstances = new Set(); // Stores IDs of discovered remote instances

        this.channel.onmessage = this._handleBroadcastMessage.bind(this);
        this._initializeSignaling();

        console.log(`NetworkManager initialized with ID: ${this.instanceId}`);
    }

    setDependencies(dependencies) {
        this.dependencies = dependencies;
    }

    getInstanceId() {
        return this.instanceId;
    }

    getRemoteInstances() {
        return Array.from(this.remoteInstances);
    }

    getPeers() {
        return this.peers;
    }

    setListenCallback(callback) {
        this.listenCallback = callback;
    }

    // --- BroadcastChannel (Local) Methods ---
    _handleBroadcastMessage(event) {
        const { sourceId, targetId, type, data } = event.data;
        if (targetId === this.instanceId || targetId === 'broadcast') {
            this._processIncomingMessage(sourceId, data);
        }
    }

    // --- Signaling Server (WebRTC) Methods ---
    _initializeSignaling() {
        this.websocket = new WebSocket(this.signalingServerUrl);

        this.websocket.onopen = () => {
            console.log('Connected to signaling server.');
            // Announce presence to the network
            const presencePayload = {
                type: 'discover',
                sourceId: this.instanceId
            };
            this.websocket.send(JSON.stringify(presencePayload));
        };

        this.websocket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.sourceId === this.instanceId) return; // Ignore our own messages

                switch (payload.type) {
                    case 'discover':
                        if (!this.remoteInstances.has(payload.sourceId)) {
                            this.remoteInstances.add(payload.sourceId);
                            // Announce ourselves back to the new instance
                            const presencePayload = { type: 'discover', sourceId: this.instanceId };
                            this.websocket.send(JSON.stringify(presencePayload));
                        }
                        break;
                    case 'offer':
                        this._handleOffer(payload);
                        break;
                    case 'answer':
                        this._handleAnswer(payload);
                        break;
                    case 'candidate':
                        this._handleCandidate(payload);
                        break;
                }
            } catch (error) {
                console.error('Error parsing signaling message:', error);
            }
        };

        this.websocket.onclose = () => {
            console.log('Disconnected from signaling server. Attempting to reconnect...');
            setTimeout(() => this._initializeSignaling(), 5000);
        };

        this.websocket.onerror = (error) => {
            console.error('Signaling server error:', error);
        };
    }

    _sendSignalingMessage(payload) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(payload));
        }
    }

    // --- WebRTC Peer Connection Logic ---
    async _createPeerConnection(targetId) {
        if (this.peers.has(targetId)) {
            return this.peers.get(targetId);
        }

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this._sendSignalingMessage({
                    type: 'candidate',
                    targetId: targetId,
                    sourceId: this.instanceId,
                    candidate: event.candidate
                });
            }
        };

        peerConnection.ondatachannel = (event) => {
            const dataChannel = event.channel;
            this._setupDataChannel(dataChannel, targetId);
        };


        this.peers.set(targetId, peerConnection);
        return peerConnection;
    }

    _setupDataChannel(dataChannel, peerId) {
        dataChannel.onopen = () => console.log(`Data channel with ${peerId} is open.`);
        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._processIncomingMessage(message.sourceId, message.data);
            } catch (e) {
                console.error("Error processing data channel message:", e);
            }
        };
        dataChannel.onclose = () => {
            console.log(`Data channel with ${peerId} closed.`);
            this.peers.delete(peerId);
            this.remoteInstances.delete(peerId);
        };
    }


    async _handleOffer(payload) {
        const { sourceId, offer } = payload;
        const peerConnection = await this._createPeerConnection(sourceId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        this._sendSignalingMessage({
            type: 'answer',
            targetId: sourceId,
            sourceId: this.instanceId,
            answer: answer
        });
    }

    async _handleAnswer(payload) {
        const { sourceId, answer } = payload;
        const peerConnection = this.peers.get(sourceId);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async _handleCandidate(payload) {
        const { sourceId, candidate } = payload;
        const peerConnection = this.peers.get(sourceId);
        if (peerConnection && candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding received ICE candidate', e);
            }
        }
    }


    // --- Unified Message Sending and Processing ---
    async sendMessage(targetId, type, data) {
        const payload = {
            sourceId: this.instanceId,
            targetId: targetId,
            type: type,
            data: data
        };

        // Try local broadcast first
        if (this.channel) {
            this.channel.postMessage(payload);
        }

        // Handle WebRTC for remote instances
        if (this.remoteInstances.has(targetId)) {
            let peerConnection = this.peers.get(targetId);

            if (!peerConnection || peerConnection.connectionState !== 'connected') {
                peerConnection = await this._createPeerConnection(targetId);
                const dataChannel = peerConnection.createDataChannel('oopisos-datachannel');
                this._setupDataChannel(dataChannel, targetId);

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                this._sendSignalingMessage({
                    type: 'offer',
                    targetId: targetId,
                    sourceId: this.instanceId,
                    offer: offer
                });
            }


            // Wait for the data channel to be ready before sending
            const dataChannel = Array.from(peerConnection.sctp.transport.transport.dataChannels).find(dc => dc.label === 'oopisos-datachannel');

            const waitForDataChannel = new Promise((resolve, reject) => {
                if (dataChannel && dataChannel.readyState === 'open') {
                    resolve(dataChannel);
                    return;
                }
                const maxAttempts = 10;
                let attempts = 0;
                const interval = setInterval(() => {
                    const freshDataChannel = Array.from(peerConnection.sctp.transport.transport.dataChannels).find(dc => dc.label === 'oopisos-datachannel');
                    if (freshDataChannel && freshDataChannel.readyState === 'open') {
                        clearInterval(interval);
                        resolve(freshDataChannel);
                    } else if (++attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error('Data channel did not open in time.'));
                    }
                }, 500);
            });

            try {
                const dc = await waitForDataChannel;
                dc.send(JSON.stringify(payload));
            } catch (error) {
                console.error(`Failed to send message to ${targetId}:`, error);
            }
        }
    }

    _processIncomingMessage(sourceId, data) {
        if (this.listenCallback) {
            this.listenCallback(`[NET] From ${sourceId}: ${data}`);
        } else {
            this.dependencies.OutputManager.appendToOutput(
                `[NET] From ${sourceId}: ${data}`
            );
        }
    }
}