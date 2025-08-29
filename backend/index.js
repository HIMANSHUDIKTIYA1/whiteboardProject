import express from "express";
import dotenv from "dotenv";

import {createServer} from "http";
import { join } from "path";
const app = express();
const server = createServer(app);
import {Server} from "socket.io";
const io = new Server(server, {
  cors: {
    origin: [  "https://hdwhiteboard.netlify.app" ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

dotenv.config();
const PORT = process.env.PORT ;
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
socket.on("join", ({username, roomID }) => {
  socket.join(roomID);
  socket.username = username;
  console.log(`${username} joined room ${roomID}`);
  socket.to(roomID).emit("user_notification", {username});

  socket.broadcast.emit("new-user", { id: socket.id, username });
});

  socket.on("drawing", ({ roomID, line }) => {
    // Send to sabhi except jisne draw kiya
    socket.to(roomID).emit("drawing", line);
  });
  socket.on("signal", ({ to, data }) => {
    socket.to(to).emit("signal", { from: socket.id, username: socket.username, data });
  });
socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
    });
});
app.get("/", (req, res) => {
  res.send("Hello World");
}); 


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
