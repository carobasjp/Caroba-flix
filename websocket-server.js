// websocket-server.js
const WebSocket = require('ws');
const url = require('url');
const SessionManager = require('./session-manager');

class WebSocketServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.server = null;
    this.sessions = new SessionManager();
  }
  
  start() {
    this.server = new WebSocket.Server({ port: this.port });
    
    console.log(`Servidor WebSocket iniciado na porta ${this.port}`);
    
    this.server.on('connection', (ws, req) => this.handleConnection(ws, req));
    
    this.server.on('error', (error) => {
      console.error('Erro no servidor WebSocket:', error);
    });
    
    return this;
  }
  
  stop() {
    if (this.server) {
      this.server.close();
      console.log('Servidor WebSocket encerrado');
    }
  }
  
  handleConnection(ws, req) {
    // Obter parâmetros da URL
    const params = url.parse(req.url, true).query;
    const action = params.action;
    const sessionCode = params.code;
    const username = params.username || 'Anônimo';
    
    // Associar dados ao WebSocket
    ws.clientData = {
      id: this.generateClientId(),
      username: username,
      sessionId: null,
      isConnected: true,
      joinedAt: new Date()
    };
    
    console.log(`Cliente conectado: ${ws.clientData.id} (${username})`);
    
    // Processar a ação solicitada
    if (action === 'create') {
      this.handleCreateSession(ws);
    } else if (action === 'join' && sessionCode) {
      this.handleJoinSession(ws, sessionCode);
    } else {
      // Ação inválida, fechar conexão
      ws.send(JSON.stringify({
        type: 'SESSION_ERROR',
        message: 'Ação inválida ou código de sessão não fornecido'
      }));
      ws.close();
      return;
    }
    
    // Configurar event handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    
    ws.on('close', () => this.handleDisconnect(ws));
    
    ws.on('error', (error) => {
      console.error(`Erro no cliente ${ws.clientData.id}:`, error);
    });
  }
  
  handleCreateSession(ws) {
    // Criar nova sessão
    const session = this.sessions.createSession();
    ws.clientData.sessionId = session.id;
    
    // Adicionar cliente à sessão
    this.sessions.addClientToSession(session.id, ws);
    
    // Notificar cliente
    ws.send(JSON.stringify({
      type: 'SESSION_CREATED',
      sessionCode: session.code,
      message: 'Sessão criada com sucesso'
    }));
    
    console.log(`Sessão criada: ${session.code} (${session.id}) por ${ws.clientData.username}`);
  }
  
  handleJoinSession(ws, sessionCode) {
    // Procurar sessão pelo código
    const session = this.sessions.findSessionByCode(sessionCode);
    
    if (!session) {
      // Sessão não encontrada
      ws.send(JSON.stringify({
        type: 'SESSION_ERROR',
        message: 'Sessão não encontrada'
      }));
      return;
    }
    
    // Adicionar cliente à sessão
    ws.clientData.sessionId = session.id;
    this.sessions.addClientToSession(session.id, ws);
    
    // Notificar o cliente que entrou
    ws.send(JSON.stringify({
      type: 'SESSION_JOINED',
      sessionCode: session.code,
      participantCount: this.sessions.getSessionClientCount(session.id),
      message: 'Você entrou na sessão com sucesso'
    }));
    
    // Notificar outros clientes na sessão
    this.broadcastToSession(session.id, {
      type: 'PARTICIPANT_JOINED',
      username: ws.clientData.username,
      participantCount: this.sessions.getSessionClientCount(session.id)
    }, ws);
    
    console.log(`Cliente ${ws.clientData.id} (${ws.clientData.username}) entrou na sessão ${session.code}`);
  }
  
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const sessionId = ws.clientData.sessionId;
      
      if (!sessionId) {
        console.error('Cliente tentou enviar mensagem sem estar em uma sessão');
        return;
      }
      
      // Processar mensagem baseado no tipo
      switch (data.type) {
        case 'CHAT_MESSAGE':
          this.handleChatMessage(ws, sessionId, data);
          break;
          
        case 'PLAYER_ACTION':
          this.handlePlayerAction(ws, sessionId, data);
          break;
          
        default:
          console.warn('Tipo de mensagem desconhecido:', data.type);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }
  
  handleChatMessage(ws, sessionId, data) {
    const message = {
      type: 'CHAT_MESSAGE',
      username: ws.clientData.username,
      content: data.content,
      timestamp: new Date().toISOString()
    };
    
    // Enviar para todos na sessão
    this.broadcastToSession(sessionId, message);
  }
  
  handlePlayerAction(ws, sessionId, data) {
    const message = {
      type: 'PLAYER_ACTION',
      username: ws.clientData.username,
      action: data.action,
      time: data.time,
      timestamp: new Date().toISOString()
    };
    
    // Enviar para todos na sessão
    this.broadcastToSession(sessionId, message);
  }
  
  handleDisconnect(ws) {
    const sessionId = ws.clientData.sessionId;
    
    if (sessionId) {
      // Remover cliente da sessão
      this.sessions.removeClientFromSession(sessionId, ws);
      
      // Verificar se a sessão ainda tem clientes
      const clientCount = this.sessions.getSessionClientCount(sessionId);
      
      if (clientCount > 0) {
        // Notificar outros clientes
        this.broadcastToSession(sessionId, {
          type: 'PARTICIPANT_LEFT',
          username: ws.clientData.username,
          participantCount: clientCount
        });
      } else {
        // Remover sessão se não houver mais clientes
        this.sessions.removeSession(sessionId);
      }
    }
    
    console.log(`Cliente desconectado: ${ws.clientData.id} (${ws.clientData.username})`);
  }
  
  broadcastToSession(sessionId, message, excludeClient = null) {
    const clients = this.sessions.getSessionClients(sessionId);
    const messageStr = JSON.stringify(message);
    
    for (const client of clients) {
      if (excludeClient && client === excludeClient) continue;
      
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }
  
  generateClientId() {
    return 'client_' + Math.random().toString(36).substring(2, 15);
  }
}

module.exports = WebSocketServer;
