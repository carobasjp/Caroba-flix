// pairing-system.js
class PairingSystem {
  constructor() {
    this.sessionCode = null;
    this.isHost = false;
    this.participants = [];
    
    this.username = 'Usuário ' + Math.floor(Math.random() * 10000);
  }
  
  generateSessionCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars.charAt(randomIndex);
    }
    return code;
  }
  
  createSession() {
    this.sessionCode = this.generateSessionCode();
    this.isHost = true;
    this.participants = [{ id: 'self', username: this.username }];
    
    return {
      sessionCode: this.sessionCode,
      isHost: this.isHost,
      username: this.username
    };
  }
  
  joinSession(sessionCode) {
    this.sessionCode = sessionCode;
    this.isHost = false;
    this.participants = [{ id: 'self', username: this.username }];
    
    return {
      sessionCode: this.sessionCode,
      isHost: this.isHost,
      username: this.username
    };
  }
  
  addParticipant(id, username) {
    if (!this.participants.some(p => p.id === id)) {
      this.participants.push({ id, username });
    }
    return this.participants.length;
  }
  
  removeParticipant(id) {
    this.participants = this.participants.filter(p => p.id !== id);
    return this.participants.length;
  }
  
  getParticipants() {
    return [...this.participants];
  }
  
  isSessionHost() {
    return this.isHost;
  }
  
  leaveSession() {
    this.sessionCode = null;
    this.isHost = false;
    this.participants = [];
  }
  
  getSessionInfo() {
    return {
      sessionCode: this.sessionCode,
      isHost: this.isHost,
      username: this.username,
      participantCount: this.participants.length
    };
  }
  
  setUsername(username) {
    this.username = username;
  }
  
  isInSession() {
    return this.sessionCode !== null;
  }
}
