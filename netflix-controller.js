// netflix-controller.js
class NetflixController {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.initEventListeners();
  }
  
  initEventListeners() {
    this.videoElement.addEventListener('play', () => {
      if (this.onPlay) this.onPlay();
    });
    
    this.videoElement.addEventListener('pause', () => {
      if (this.onPause) this.onPause();
    });
    
    this.videoElement.addEventListener('seeked', () => {
      if (this.onSeek) this.onSeek(this.getCurrentTime());
    });
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

