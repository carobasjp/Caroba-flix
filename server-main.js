const WebSocketServer = require('./websocket-server');
const http = require('http');

// Converta process.env.PORT em número. Se não existir, use 8080.
const numericPort = parseInt(process.env.PORT, 10) || 8080;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora

// Iniciar servidor WebSocket na porta principal
const wsServer = new WebSocketServer({ port: numericPort });
wsServer.start();
console.log(`Servidor Netflix Sync iniciado na porta ${numericPort}`);

// Configurar limpeza periódica de sessões inativas
setInterval(() => {
  const cleanupCount = wsServer.sessions.cleanupInactiveSessions();
  if (cleanupCount > 0) {
    console.log(`Limpeza automática: ${cleanupCount} sessões removidas`);
  }
  
  const stats = wsServer.sessions.getSessionStats();
  console.log(`Estatísticas: ${stats.totalSessions} sessões ativas, ${stats.totalClients} clientes conectados`);
}, CLEANUP_INTERVAL);

// Servidor HTTP básico para monitoramento de status
const httpServer = http.createServer((req, res) => {
  if (req.url === '/status') {
    const stats = wsServer.sessions.getSessionStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      uptime: process.uptime(),
      sessions: stats.totalSessions,
      clients: stats.totalClients
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Subir o servidor HTTP na porta principal + 1
httpServer.listen(numericPort + 1);
console.log(`Servidor de status HTTP iniciado na porta ${numericPort + 1}`);

// Tratamento de encerramento (Ctrl+C, etc.)
process.on('SIGINT', () => {
  console.log('Encerrando servidores...');
  
  wsServer.stop();
  httpServer.close();
  
  process.exit(0);
});
