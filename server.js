const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = {};      // { socket.id: {name, color, room} }
const colors = ["#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4","#46f0f0","#f032e6","#bcf60c","#fabebe"];

io.on("connection", (socket) => {

  // User joins a room
  socket.on("join", ({username, room}) => {

    const color = colors[Math.floor(Math.random() * colors.length)];
    users[socket.id] = { name: username, color, room };
    socket.join(room);

    io.to(room).emit("system message", `${username} joined ${room}`);
  });

  // Chat message
  socket.on("chat message", (msg) => {
    const user = users[socket.id];
    if(!user) return;

    const time = new Date().toLocaleTimeString();
    io.to(user.room).emit("chat message", {
      user: user.name,
      text: msg,
      time,
      color: user.color
    });
  });

  // Typing
  socket.on("typing", () => {
    const user = users[socket.id];
    if(user) socket.to(user.room).emit("typing", user.name);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if(user) {
      io.to(user.room).emit("system message", `${user.name} left ${user.room}`);
      delete users[socket.id];
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});