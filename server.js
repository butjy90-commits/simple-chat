const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = {};

io.on("connection", (socket) => {

    socket.on("join", (username) => {

        users[socket.id] = username;

        io.emit("system message", username + " joined the chat");

    });

    socket.on("chat message", (msg) => {

        const username = users[socket.id] || "Unknown";

        const time = new Date().toLocaleTimeString();

        io.emit("chat message", {
            user: username,
            text: msg,
            time: time
        });

    });

    socket.on("disconnect", () => {

        const username = users[socket.id];

        if(username){
            io.emit("system message", username + " left the chat");
        }

        delete users[socket.id];

    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});