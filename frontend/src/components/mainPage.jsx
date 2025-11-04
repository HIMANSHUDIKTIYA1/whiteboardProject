import React, { useEffect, useState } from "react";
 import  {motion} from "framer-motion";
import { useVideo } from "../context/videocontext";
import { useNavigate } from "react-router-dom";
const MainPage = ({ socket }) => {
  const { socketID, setSocketID, UserName, setUserName, roomID, setRoomID , setLocalName} = useVideo();


  const [notifications, setNotifications] = useState([]); // notifications
  const navigate = useNavigate(); 


  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("Connected to server", socket.id);
      setSocketID(socket.id);
    });

   
socket.on("user_notification", ({ UserName }) => {
      console.log(`User joined: ${UserName}`);
      setNotifications((prev) => [...prev, `${UserName} joined the chat!`]);
    });
    socket.on("disconnect", () => {
      console.log("Disconnected from server", socket.id);
    });

    return () => {
      socket.off("connect");
      socket.off("user_notification");
      socket.off("disconnect");
    };
  }, [socket]);

  // ✅ Join room
  const handleJoin = (e) => {
    e.preventDefault();
    if (UserName && roomID) {
       const username = UserName;
      socket.emit("join", {  username, roomID });
      console.log(`${username} joined room: ${roomID}`);
       navigate("/chat", {
        state: {
           UserName,
          roomID,
          socketID,
        },
      });
    } else {
      alert("Please enter username and room ID to join!");
    }
  };


  // useEffect(() => {
  //   if (!socket) return;
  //   alert("socket a gya bhai ")
  //   socket.on("connect", () => {
  //     console.log("Connected to server", socket.id);
  //     setSocketID(socket.id);
  //   });


 

  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black text-white">
      {/* Heading with Animation */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-2xl sm:text-3xl font-bold text-red-500 tracking-wide"
      >
        ⚡ Socket ID: <span className="text-white">{socketID}</span>
      </motion.h1>

      {/* Join Form */}
      <motion.form
        onSubmit={handleJoin}
        className="flex flex-col sm:flex-row gap-3 items-center mt-8 bg-neutral-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-md border border-neutral-700"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Username Input */}
        <input
          type="text"
          name="username"
          value={UserName}
          onChange={(e) => {setUserName(e.target.value); setLocalName(e.target.value); }}
          placeholder="Enter your name"
          className="border border-neutral-700 bg-black/40 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition w-56"
        />

        {/* Room ID Input */}
        <input
          type="text"
          name="roomID"
          value={roomID}
          onChange={(e) => setRoomID(e.target.value)}
          placeholder="Enter room ID"
          className="border border-neutral-700 bg-black/40 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition w-56"
        />

        {/* Button */}
        <motion.button
          type="submit"
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl shadow-md transition transform hover:scale-105"
          style={{ cursor: "url(/cursor.png) , auto" }}
          whileTap={{ scale: 0.9 }}
        >
          Join 🚀
        </motion.button>
      </motion.form>

      {/* Notifications */}
      <motion.div
        className="mt-6 w-full max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {notifications.map((note, idx) => (
          <motion.p
            key={idx}
            className="text-sm text-neutral-400 italic flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            🔔 <span className="text-red-400">{note}</span>
          </motion.p>
        ))}
      </motion.div>
    </div>
  );
};

export default MainPage;
