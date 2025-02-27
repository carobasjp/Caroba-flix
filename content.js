// content.js
console.log('Netflix Sync Content Script carregado');

let netflixController = null;
let isInitialized = false;
let isInPlayer = false;
let ignoreEvents = false;
let lastAction = null;
let lastTime = null;

// Verificar se estamos na página de reprodução do Netflix
function checkIfInPlayer() {
  const videoPlayer = document.querySelector('.VideoContainer video');
  const newIsInPlayer = !!videoPlayer;
  
  if (newIsInPlayer !== isInPlayer) {
    isInPlayer = newIsInPlayer;
    
    if (isInPlayer) {
      console.log('Detectado player da Netflix');
      initializeController();
    } else {
      console.log('Saiu do player da Netflix');
      netflixController = null;
    }
  }
}

// Inicializar o controlador
function initializeController() {
  if (!isInPlayer || isInitialized) return;
  
  try {
    const videoElement = document.querySelector('.VideoContainer video');
    if (!videoElement) return;
    
    netflixController = new NetflixController(videoElement);
    isInitialized = true;
    
    console.log('Controlador do Netflix inicializado');
    
    // Eventos do player
    netflixController.onPlay = handlePlay;
    netflixController.onPause = handlePause;
    netflixController.onSeek = handleSeek;
  } catch (error) {
    console.error('Erro ao inicializar controlador:', error);
  }
}

// Manipuladores de eventos
function handlePlay() {
  if (ignoreEvents) return;
  console.log('Player: Play');
  sendPlayerEvent('play', netflixController.getCurrentTime());
}

function handlePause() {
  if (ignoreEvents) return;
  console.log('Player: Pause');
  sendPlayerEvent('pause', netflixController.getCurrentTime());
}

function handleSeek(time) {
  if (ignoreEvents) return;
  console.log('Player: Seek para', time);
  sendPlayerEvent('seek', time);
}

// Enviar evento do player ao background
function sendPlayerEvent(action, time) {
  lastAction = action;
  lastTime = time;
  
  chrome.runtime.sendMessage({
    type: 'PLAYER_EVENT',
    action: action,
    time: time
  });
}

// Aplicar ação recebida de outro cliente
function applyPlayerAction(action, time) {
  if (!netflixController) return;
  console.log('Aplicando ação:', action, time);
  
  // Ignorar eventos para evitar loops
  ignoreEvents = true;
  
  try {
    switch(action) {
      case 'play':
        netflixController.play();
        break;
        
      case 'pause':
        netflixController.pause();
        break;
        
      case 'seek':
        netflixController.seekTo(time);
        break;
    }
  } catch (error) {
    console.error('Erro ao aplicar ação:', error);
  }
  
  setTimeout(() => {
    ignoreEvents = false;
  }, 500);
}

// Verificar periodicamente se estamos no player
setInterval(checkIfInPlayer, 1000);

// Escutar mensagens do background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'APPLY_PLAYER_ACTION') {
    applyPlayerAction(message.action, message.time);
  }
  
  return true;
});

// Classe NetflixController (poderia estar no netflix-controller.js e ser importada)
class NetflixController {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Play
    this.videoElement.addEventListener('play', () => {
      if (this.onPlay) this.onPlay();
    });
    
    // Pause
    this.videoElement.addEventListener('pause', () => {
      if (this.onPause) this.onPause();
    });
    
    // Seek
    this.videoElement.addEventListener('seeked', () => {
      if (this.onSeek) this.onSeek(this.getCurrentTime());
    });
    
    console.log('Event listeners inicializados para o player Netflix');
  }
  
  play() {
    try {
      this.videoElement.play();
    } catch (error) {
      console.error('Erro ao reproduzir vídeo:', error);
    }
  }
  
  pause() {
    try {
      this.videoElement.pause();
    } catch (error) {
      console.error('Erro ao pausar vídeo:', error);
    }
  }
  
  seekTo(timeInSeconds) {
    try {
      this.videoElement.currentTime = timeInSeconds;
    } catch (error) {
      console.error('Erro ao buscar posição no vídeo:', error);
    }
  }
  
  getCurrentTime() {
    return this.videoElement.currentTime;
  }
  
  getDuration() {
    return this.videoElement.duration;
  }
}
