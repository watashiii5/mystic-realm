class Network {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.listeners = {};
  }

  connect() {
    return new Promise((resolve) => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const port = window.location.port || (protocol === 'wss' ? 443 : 80);
      this.socket = io({
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.connected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
      });

      Object.keys(this.listeners).forEach((event) => {
        this.socket.on(event, this.listeners[event]);
      });
    });
  }

  on(event, callback) {
    this.listeners[event] = callback;
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    delete this.listeners[event];
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

window.Network = Network;
