// popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Elementos
  const connectionStatus = document.getElementById('connection-status');
  const statusText = document.getElementById('status-text');
  const notConnectedContainer = document.getElementById('not-connected-container');
  const connectedContainer = document.getElementById('connected-container');
  const netflixWarning = document.getElementById('netflix-warning');
  
  const createSessionBtn = document.getElementById('create-session-btn');
  const sessionCodeInput = document.getElementById('session-code-input');
  const joinSessionBtn = document.getElementById('join-session-btn');
  const currentSessionCode = document.getElementById('current-session-code');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const participantCount = document.getElementById('participant-count');
  
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendMessageBtn = document.getElementById('send-message-btn');
  const openNetflixBtn = document.getElementById('open-netflix-btn');
  
  // Estado
  let isConnected = false;
  let isNetflixTab = false;
  
  // Verificar se a aba é Netflix
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    isNetflixTab = currentUrl && currentUrl.includes('netflix.com');
    
    if (!isNetflixTab) {
      notConnectedContainer.style.display = 'none';
      connectedContainer.style.display = 'none';
      netflixWarning.style.display = 'block';
    }
  });
  
  // Verificar estado de conexão salvo
  chrome.storage.local.get(['isConnected', 'sessionCode', 'participantCount'], function(result) {
    if (result.isConnected) {
      isConnected = true;
      showConnectedState(result.sessionCode, result.participantCount);
    }
  });
  
  // Botões
  createSessionBtn.addEventListener('click', createSession);
  joinSessionBtn.addEventListener('click', joinSession);
  disconnectBtn.addEventListener('click', disconnect);
  copyCodeBtn.addEventListener('click', copySessionCode);
  sendMessageBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  openNetflixBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'https://www.netflix.com'});
  });
  
  // Mensagens do background
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('Popup received message:', message);
    
    switch(message.type) {
      case 'SESSION_CREATED':
        isConnected = true;
        showConnectedState(message.sessionCode, 1);
        addChatMessage('Sistema', 'Sessão criada com sucesso. Compartilhe o código para que outros possam entrar.', 'system');
        break;
        
      case 'SESSION_JOINED':
        isConnected = true;
        showConnectedState(message.sessionCode, message.participantCount);
        addChatMessage('Sistema', 'Você entrou na sessão.', 'system');
        break;
        
      case 'CONNECTION_ERROR':
        setStatus('disconnected', 'Erro na conexão');
        addChatMessage('Sistema', `Erro: ${message.error}`, 'system');
        break;
        
      case 'PARTICIPANT_JOINED':
        participantCount.textContent = message.participantCount;
        addChatMessage('Sistema', `${message.username} entrou na sessão.`, 'system');
        break;
        
      case 'PARTICIPANT_LEFT':
        participantCount.textContent = message.participantCount;
        addChatMessage('Sistema', `${message.username} saiu da sessão.`, 'system');
        break;
        
      case 'CHAT_MESSAGE':
        addChatMessage(message.username, message.content, message.isSelf ? 'self' : 'remote');
        break;
        
      case 'DISCONNECTED':
        isConnected = false;
        showDisconnectedState();
        addChatMessage('Sistema', 'Desconectado da sessão.', 'system');
        break;
    }
    
    return true;
  });
  
  // Interface
  function showConnectedState(sessionCode, count) {
    setStatus('connected', 'Conectado');
    notConnectedContainer.style.display = 'none';
    connectedContainer.style.display = 'block';
    currentSessionCode.textContent = sessionCode;
    participantCount.textContent = count || 1;
  }
  
  function showDisconnectedState() {
    setStatus('disconnected', 'Desconectado');
    notConnectedContainer.style.display = 'block';
    connectedContainer.style.display = 'none';
    chatMessages.innerHTML = '';
  }
  
  function setStatus(statusClass, text) {
    connectionStatus.className = 'status-indicator ' + statusClass;
    statusText.textContent = text;
  }
  
  function addChatMessage(username, content, type) {
    const message = document.createElement('div');
    message.className = 'chat-message ' + type;
    message.textContent = `${username}: ${content}`;
    
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Ações
  function createSession() {
    if (!isNetflixTab) {
      alert('Por favor, abra a Netflix primeiro!');
      return;
    }
    
    setStatus('connecting', 'Criando sessão...');
    
    chrome.runtime.sendMessage({
      type: 'CREATE_SESSION'
    });
  }
  
  function joinSession() {
    if (!isNetflixTab) {
      alert('Por favor, abra a Netflix primeiro!');
      return;
    }
    
    const sessionCode = sessionCodeInput.value.trim();
    if (!sessionCode) {
      alert('Por favor, insira um código de sessão válido.');
      return;
    }
    
    setStatus('connecting', 'Conectando...');
    
    chrome.runtime.sendMessage({
      type: 'JOIN_SESSION',
      sessionCode: sessionCode
    });
  }
  
  function disconnect() {
    chrome.runtime.sendMessage({
      type: 'DISCONNECT'
    });
  }
  
  function copySessionCode() {
    const code = currentSessionCode.textContent;
    navigator.clipboard.writeText(code).then(function() {
      addChatMessage('Sistema', 'Código copiado para a área de transferência.', 'system');
    }, function() {
      alert('Não foi possível copiar o código. Por favor, copie manualmente: ' + code);
    });
  }
  
  function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    chrome.runtime.sendMessage({
      type: 'SEND_CHAT_MESSAGE',
      content: message
    });
    
    chatInput.value = '';
  }
});
