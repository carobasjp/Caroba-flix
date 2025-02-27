// websocket-client.js
// Exemplo simples de cliente WebSocket para o Netflix Sync

class WebSocketClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.isConnected = false;
  }
  
  connect(params = {}) {
    const urlParams = new URLSearchParams(params);
    const fullUrl = `${this.serverUrl}?${urlParams.toString()}`;
    
    this.ws = new WebSocket(fullUrl);
    
    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('WebSocket conectado ao servidor:', fullUrl);
      if (this.onOpen) this.onOpen();
    };
    
    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error('Erro ao parsear mensagem:', event.data);
        return;
      }
      if (this.onMessage) this.onMessage(data);
    };
    
    this.ws.onclose = () => {
      this.isConnected = false;
      console.log('WebSocket desconectado do servidor:', fullUrl);
      if (this.onClose) this.onClose();
    };
    
    this.ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
      if (this.onError) this.onError(error);
    };
  }
  
  send(data) {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(JSON.stringify(data));
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
