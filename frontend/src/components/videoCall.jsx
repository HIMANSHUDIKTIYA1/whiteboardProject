import { useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,  FaPhoneSlash, FaSyncAlt} from "react-icons/fa";
import { useVideo } from "../context/videocontext";

import { MdCallEnd } from "react-icons/md";
import { useNavigate} from "react-router-dom";
const VideoCall = ( ) => {
   const { localName, remoteName, localVideoRef, remoteVideoRef } = useVideo();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [useFrontCamera, setUseFrontCamera] = useState(true);
  const navigate = useNavigate();
 const handleMic = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !micOn));
    }
    setMicOn(!micOn);
  };

  // Camera toggle function
  const handleCam = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !camOn));
    }
    setCamOn(!camOn);
  };
  // Switch camera function
  const handleSwitchCamera = async() => {
  try {

    const oldStream = localVideoRef.current?.srcObject;
    if (oldStream) {
      oldStream.getTracks().forEach(track => track.stop());
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: useFrontCamera ? "user" : "environment" },
      audio: true,
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    setUseFrontCamera(!useFrontCamera);


  } catch (err) {
    console.error("Camera switch error:", err);
  }
  };

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
          <FaSyncAlt size={20} />

        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="bg-red-600 p-4 rounded-full text-white hover:bg-red-700 transition"
        >
          <MdCallEnd size={22} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
