module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected to socket');
    
    socket.on('join-kitchen', () => {
      console.log('Client joined kitchen room');
      socket.join('kitchen');
    });
    
    socket.on('join-order-room', (orderId) => {
      console.log(`Client joined order room for ${orderId}`);
      socket.join(`order_${orderId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};