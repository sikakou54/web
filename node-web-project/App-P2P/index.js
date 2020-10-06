const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

// https://socket.io/docs/#Using-with-Express
const app = express();
const server = http.Server(app);

// '/socket.io/socket.io.js' でクライアント用の JavaScript ファイルが取得できるようになる
const io = socketIo(server);  

app.get('/', (req, res) => {
  console.log('[/]');
  res.sendFile(__dirname + '/index.html');
});

let port = 3000;

server.listen(port, () => {
  console.log('Server Started : ' + port );
});

io.on('connection', (socket) => {
  console.log('A User Connected');
  
  socket.on('message', (message) => {
    console.log('On Message', message); 
    socket.broadcast.emit('message', message);
  });
  
  socket.on('disconnect', () => {
    console.log('User Disconnected');
  });
});
