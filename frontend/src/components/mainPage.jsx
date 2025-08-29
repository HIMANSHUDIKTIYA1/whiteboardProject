import React, { useEffect, useState } from "react";
import { redirect } from "react-router-dom";
import { useNavigate } from "react-router-dom";
const MainPage = ({ socket }) => {
  const [socketID, setSocketID] = useState(null);
  const [UserName, setUserName] = useState("");
  const [roomID, setRoomID] = useState("");
  const [message, setMessage] = useState("");

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


 

  return (
    <div className="p-6">
      <h1>Socket ID: {socketID}</h1>

      {/* JOIN ROOM */}
      <form
        onSubmit={handleJoin}
        className="flex gap-2 items-center mt-4"
      >
        <input
          type="text"
          name="username"
          value={UserName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name"
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="roomID"
          value={roomID}
          onChange={(e) => setRoomID(e.target.value)}
          placeholder="Enter room ID"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          style={{ cursor: "url(/cursor.png) , auto" }}
         
        >
          Join
        </button>
      </form>
 <div className="mt-4">
        {notifications.map((note, idx) => (
          <p key={idx} className="text-sm text-gray-500 italic">
            🔔 {note}
          </p>
        ))}
      </div>
    </div>
  );
};

export default MainPage;
