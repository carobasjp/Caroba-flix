// session-manager.js
class SessionManager {
  constructor() {
    this.sessions = new Map(); // Map de sessionId -> dados da sessão
    this.sessionsByCode = new Map(); // Map de código -> sessionId
  }
  
  createSession() {
    const sessionId = this.generateSessionId();
    const sessionCode = this.generateSessionCode();
    
    const session = {
      id: sessionId,
      code: sessionCode,
      clients: new Set(),
      createdAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    this.sessionsByCode.set(sessionCode, sessionId);
    
    return session;
  }
  
  findSessionById(sessionId) {
    return this.sessions.get(sessionId) || null;
  }
  
  findSessionByCode(code) {
    const sessionId = this.sessionsByCode.get(code);
    if (!sessionId) return null;
    
    return this.findSessionById(sessionId);
  }
  
  addClientToSession(sessionId, client) {
    const session = this.findSessionById(sessionId);
    if (!session) return false;
    
    session.clients.add(client);
    return true;
  }
  
  removeClientFromSession(sessionId, client) {
    const session = this.findSessionById(sessionId);
    if (!session) return false;
    
    return session.clients.delete(client);
  }
  
  getSessionClients(sessionId) {
    const session = this.findSessionById(sessionId);
    if (!session) return [];
    
    return Array.from(session.clients);
  }
  
  getSessionClientCount(sessionId) {
    const session = this.findSessionById(sessionId);
    if (!session) return 0;
    
    return session.clients.size;
  }
  
  removeSession(sessionId) {
    const session = this.findSessionById(sessionId);
    if (!session) return false;
    
    this.sessionsByCode.delete(session.code);
    return this.sessions.delete(sessionId);
  }
  
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }
  
  generateSessionCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres ambíguos
    let code = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars.charAt(randomIndex);
    }
    
    // Verificar se o código já existe
    if (this.sessionsByCode.has(code)) {
      return this.generateSessionCode(length); // Gerar novo código recursivamente
    }
    
    return code;
  }
  
  // Métodos de manutenção
  
  cleanupInactiveSessions(maxAgeMs = 24 * 60 * 60 * 1000) { // Padrão: 24 horas
    const now = new Date();
    let cleanupCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.createdAt;
      
      // Remover sessões antigas ou sem clientes
      if (sessionAge > maxAgeMs || session.clients.size === 0) {
        this.sessionsByCode.delete(session.code);
        this.sessions.delete(sessionId);
        cleanupCount++;
      }
    }
    
    return cleanupCount;
  }
  
  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      totalClients: Array.from(this.sessions.values()).reduce((sum, session) => sum + session.clients.size, 0)
    };
  }
}

module.exports = SessionManager;
