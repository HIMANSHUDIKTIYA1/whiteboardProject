import React, { createContext, useContext , useRef, useState } from 'react'

const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
 const [localName, setLocalName] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const initLocalStream = async () => {
    if (localStream) return localStream; // already hai
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Camera not available:", err);
      return null;
    }
  };


  return (
    <VideoContext.Provider value={{ localName, setLocalName, remoteName, setRemoteName, initLocalStream, localVideoRef, remoteVideoRef, localStream, setLocalStream, remoteStream, setRemoteStream }}>
      {children}
    </VideoContext.Provider>
  )
}

export const useVideo = () => useContext(VideoContext);
