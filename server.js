const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const users = {};
const colors = ["#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4","#46f0f0","#f032e6","#bcf60c","#fabebe"];
const storageFile = path.join(__dirname, "messages.json");

// Load stored messages
let storedMessages = {};
if (fs.existsSync(storageFile)) {
    storedMessages = JSON.parse(fs.readFileSync(storageFile, "utf-8"));
}

// Rooms with password and public/private
const rooms = {
    "General": { password: "", public: true },
    "Gaming": { password: "", public: true },
    "Music": { password: "", public: true },
    "Coding": { password: "", public: true }
};

// Save message
function saveMessage(room, message){
    if(!storedMessages[room]) storedMessages[room] = [];
    storedMessages[room].push(message);
    fs.writeFileSync(storageFile, JSON.stringify(storedMessages, null, 2));
}

// Owner reset key
const OWNER_KEY = "supersecret123";

io.on("connection", (socket) => {

    socket.on("join", ({username, room}) => {
        const userColor = colors[Math.floor(Math.random() * colors.length)];
        users[socket.id] = { name: username, color: userColor, room };
        socket.join(room);

        // Send previous messages for this room
        if(storedMessages[room]){
            storedMessages[room].forEach(msg => socket.emit("chat message", msg));
        }

        io.to(room).emit("system message", `${username} joined ${room}`);
    });

    // Chat message
    socket.on("chat message", (msg) => {
        const user = users[socket.id];
        if(!user) return;

        const time = new Date().toLocaleTimeString();
        const messageData = { user: user.name, text: msg, time, color: user.color };

        saveMessage(user.room, messageData);
        io.to(user.room).emit("chat message", messageData);
    });

    // Typing
    socket.on("typing", () => {
        const user = users[socket.id];
        if(user) socket.to(user.room).emit("typing", user.name);
    });

    // Create room
    socket.on("create room", ({name, password, isPublic}) => {
        if(rooms[name]){
            socket.emit("system message", "Room already exists!");
            return;
        }
        rooms[name] = { password: password || "", public: isPublic };
        if(isPublic) io.emit("new public room", name);
        socket.emit("system message", `Room "${name}" created!`);
    });

    // Reset storage
    socket.on("reset storage", (key) => {
        if(key === OWNER_KEY){
            storedMessages = {};
            fs.writeFileSync(storageFile, JSON.stringify(storedMessages, null, 2));
            io.emit("system message", "All messages have been reset by the owner!");
        }
    });

    socket.on("disconnect", () => {
        const user = users[socket.id];
        if(user){
            io.to(user.room).emit("system message", `${user.name} left ${user.room}`);
            delete users[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port " + PORT));