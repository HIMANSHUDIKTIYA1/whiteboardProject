import { useState , useRef , useEffect} from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaTimes,  FaComment, FaSyncAlt} from "react-icons/fa";
import { useVideo } from "../context/videocontext";

import { MdCallEnd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {motion} from "framer-motion";
const VideoCall = ({socket}) => {
 
   const { localName, remoteName, localVideoRef, remoteVideoRef , roomID } = useVideo();


  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [useFrontCamera, setUseFrontCamera] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const [messages, setMessages] = useState([
    { from: "remote", text: "Welcome to the chat!" }
   

  ]);
  const [input, setInput] = useState("");

  const chatInputRef = useRef(null);
 
  const navigate = useNavigate();
 const handleMic = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !micOn));
    }
    setMicOn(!micOn);
  };
 

 

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages([...messages, { roomID, from: "me" , text: input }]);
    socket.emit("chat-message", { roomID, from: localName, text: input });
    setInput("");
  };
useEffect(() => {
  socket.on("receive-message", ({ from , text  }) => {

    setMessages((prev) => [...prev, { from: "remote", text }]);
  });

  // cleanup (jab component unmount ho)
  return () => {
    socket.off("receive-message");
  };
}, [socket ]);

  // Camera toggle function
  const handleCam = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !camOn));
    }
    setCamOn(!camOn);
  };
  // Switch camera function
  const handleSwitchCamera = async () => {
    setUseFrontCamera(!useFrontCamera);
   const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFrontCamera ? "environment" : "user" },
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

  const handleEndCall = () => {
   navigate("/"); 
  };
  return (
    <div className="relative w-screen h-screen bg-black flex flex-col overflow-scroll">
      
      <video
        ref={remoteVideoRef}
        autoPlay={camOn}

        playsInline
        className={`absolute ${useFrontCamera ? "scale-x-[-1]" : ""} top-0 left-0 w-full h-full object-cover `}
      />
      {/* Remote User Name */}
      <div className="absolute top-3 left-3 text-white text-lg font-semibold bg-black/40 px-3 py-1 rounded-xl">
        {remoteName || "Remote User"}
      </div>

      {/* Local Video (small preview) */}
      <div className="absolute   bottom-28 right-4 w-40 h-28 rounded-xl overflow-hidden shadow-lg border border-gray-500">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full ${useFrontCamera ? "scale-x-[-1]" : ""}  object-cover`}
        />
        {/* Local User Name */}
        <div className="absolute bottom-1  left-1 text-xs text-white bg-black/40 px-2 py-0.5 rounded">
          {localName || "You"}
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-5 left-0 w-full flex justify-center gap-6">
        {/* Mic Toggle */}
        <button
          onClick={handleMic}
          className="bg-gray-800 p-4 rounded-full text-white hover:bg-gray-700 transition"
        >
          {micOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={handleCam}
          className="bg-gray-800 p-4 rounded-full text-white hover:bg-gray-700 transition"
        >
          {camOn ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
        </button>

        {/* Switch Camera */}
        <button
          onClick={handleSwitchCamera}
          className="bg-gray-800 p-4 rounded-full text-white hover:bg-gray-700 transition"
        >
          <FaSyncAlt size={20}  className=" text-yellow-500" />

        </button>
          {/*  chat button */}
          <button
          onClick={() => {
            window.focus();
            setChatOpen(true);
           if (chatInputRef.current) {
    chatInputRef.current.focus();
  }
          }}
          className="bg-blue-600 p-4 rounded-full text-white hover:bg-blue-700 transition"
        >
          <FaComment size={20} />
        </button>
        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="bg-red-600 p-4 rounded-full text-white hover:bg-red-700 transition"
        >

          <MdCallEnd size={22} />
        </button>
      
      
      </div>
      {chatOpen && (
        <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-0 right-0 p-4 w-full sm:w-96 "
    >
      <div className="bg-white rounded-2xl shadow-xl flex flex-col h-[500px] resize-y">
        {/* Header */}
        <div className=" flex bg-red-500 text-white px-4 py-2 justify-between rounded-t-2xl font-bold">
              <span className=" font-bold text-yellow-300">Chat  </span>  <FaTimes onClick={() => setChatOpen(false)} className="cursor-pointer" />

          </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={` flex  ${
                msg.from === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-2 py-2 rounded-xl max-w-[75%] text-sm shadow overflow-scroll break-words
                ${
                  msg.from === "me"
                    ? "bg-red-500 text-white rounded-br-none"
                    : "bg-gray-200 text-black rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
        </div>

        {/* Input bar */}
        <div className="flex items-center p-3 border-t">
          <input
            ref={chatInputRef}
            type="text"
            value={input}
            onChange={(e) => {setInput(e.target.value)}}
            className="border border-gray-300 text-gray-900 rounded-lg p-2 flex-1 focus:outline-red-500"
            placeholder="Type your message..."
          />

        
          {/* Send button */}
          <button
            onClick={handleSend}
            className="ml-2 bg-red-500 text-white rounded-lg px-4 py-2 hover:bg-red-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    </motion.div>
      )}
    </div>
  );
};

export default VideoCall;