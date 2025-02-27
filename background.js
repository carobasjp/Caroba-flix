// background.js
let websocket = null;
let sessionInfo = {
  isConnected: false,
  sessionCode: null,
  username: 'Usuário ' + Math.floor(Math.random() * 1000),
  participantCount: 1
};

// URL do servidor WebSocket
const SERVER_URL = 'wss://your-websocket-server.com'; // Substitua pela URL real do seu servidor

// Inicialização
chrome.runtime.onInstalled.addListener(() => {
  console.log('Netflix Sync instalado');
  
  // Limpar qualquer estado anterior
  chrome.storage.local.set({
    isConnected: false,
    sessionCode: null,
    participantCount: 0
  });
});

// Gerenciar mensagens da popup e do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'CREATE_SESSION':
      createSession();
      break;
      
    case 'JOIN_SESSION':
      joinSession(message.sessionCode);
      break;
      
    case 'DISCONNECT':
      disconnect();
      break;
      
    case 'SEND_CHAT_MESSAGE':
      sendChatMessage(message.content);
      break;
      
    case 'PLAYER_EVENT':
      handlePlayerEvent(message.action, message.time);
      break;
  }
  
  return true;
});

// Gerenciar conexão WebSocket
function connectWebSocket(sessionCode) {
  if (websocket) {
    websocket.close();
  }
  
  const url = sessionCode 
    ? `${SERVER_URL}?action=join&code=${sessionCode}&username=${encodeURIComponent(sessionInfo.username)}`
    : `${SERVER_URL}?action=create&username=${encodeURIComponent(sessionInfo.username)}`;
  
  websocket = new WebSocket(url);
  
  websocket.onopen = () => {
    console.log('WebSocket conectado');
  };
  
  websocket.onclose = (event) => {
    console.log('WebSocket desconectado:', event.code, event.reason);
    
    if (sessionInfo.isConnected) {
      // Tentar reconectar se a desconexão não foi intencional
      setTimeout(() => {
        if (sessionInfo.isConnected) {
          connectWebSocket(sessionInfo.sessionCode);
        }
      }, 3000);
    }
  };
  
  websocket.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
    broadcastToExtension({
      type: 'CONNECTION_ERROR',
      error: 'Erro de conexão com o servidor'
    });
  };
  
  websocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error, event.data);
    }
  };
}

// Manipular mensagens do servidor
function handleServerMessage(data) {
  console.log('Server message:', data);
  
  switch (data.type) {
    case 'SESSION_CREATED':
      sessionInfo.isConnected = true;
      sessionInfo.sessionCode = data.sessionCode;
      sessionInfo.participantCount = 1;
      
      chrome.storage.local.set({
        isConnected: true,
        sessionCode: data.sessionCode,
        participantCount: 1
      });
      
      broadcastToExtension({
        type: 'SESSION_CREATED',
        sessionCode: data.sessionCode
      });
      break;
      
    case 'SESSION_JOINED':
      sessionInfo.isConnected = true;
      sessionInfo.sessionCode = data.sessionCode;
      sessionInfo.participantCount = data.participantCount;
      
      chrome.storage.local.set({
        isConnected: true,
        sessionCode: data.sessionCode,
        participantCount: data.participantCount
      });
      
      broadcastToExtension({
        type: 'SESSION_JOINED',
        sessionCode: data.sessionCode,
        participantCount: data.participantCount
      });
      break;
      
    case 'SESSION_ERROR':
      broadcastToExtension({
        type: 'CONNECTION_ERROR',
        error: data.message
      });
      break;
      
    case 'PARTICIPANT_JOINED':
      sessionInfo.participantCount = data.participantCount;
      chrome.storage.local.set({
        participantCount: data.participantCount
      });
      broadcastToExtension({
        type: 'PARTICIPANT_JOINED',
        username: data.username,
        participantCount: data.participantCount
      });
      break;
      
    case 'PARTICIPANT_LEFT':
      sessionInfo.participantCount = data.participantCount;
      chrome.storage.local.set({
        participantCount: data.participantCount
      });
      broadcastToExtension({
        type: 'PARTICIPANT_LEFT',
        username: data.username,
        participantCount: data.participantCount
      });
      break;
      
    case 'CHAT_MESSAGE':
      broadcastToExtension({
        type: 'CHAT_MESSAGE',
        username: data.username,
        content: data.content,
        isSelf: data.username === sessionInfo.username
      });
      break;
      
    case 'PLAYER_ACTION':
      if (data.username !== sessionInfo.username) {
        // Enviar comando para o content script
        chrome.tabs.query({active: true, url: "*://*.netflix.com/*"}, function(tabs) {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'APPLY_PLAYER_ACTION',
              action: data.action,
              time: data.time
            });
          }
        });
      }
      break;
  }
}

// Criar uma nova sessão
function createSession() {
  connectWebSocket();
}

// Entrar em uma sessão existente
function joinSession(sessionCode) {
  connectWebSocket(sessionCode);
}

// Desconectar da sessão atual
function disconnect() {
  if (websocket) {
    websocket.close();
  }
  
  sessionInfo.isConnected = false;
  sessionInfo.sessionCode = null;
  
  chrome.storage.local.set({
    isConnected: false,
    sessionCode: null,
    participantCount: 0
  });
  
  broadcastToExtension({ type: 'DISCONNECTED' });
}

// Enviar mensagem de chat
function sendChatMessage(content) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  websocket.send(JSON.stringify({
    type: 'CHAT_MESSAGE',
    content: content
  }));
  
  // Mostrar localmente
  broadcastToExtension({
    type: 'CHAT_MESSAGE',
    username: sessionInfo.username,
    content: content,
    isSelf: true
  });
}

// Manipular eventos do player da Netflix
function handlePlayerEvent(action, time) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  websocket.send(JSON.stringify({
    type: 'PLAYER_ACTION',
    action: action,
    time: time
  }));
}

// Enviar mensagem para a popup e para as tabs
function broadcastToExtension(message) {
  // Popup
  chrome.runtime.sendMessage(message);
  
  // Tabs Netflix
  chrome.tabs.query({url: "*://*.netflix.com/*"}, function(tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  });
}
