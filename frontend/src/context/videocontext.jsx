import React, { createContext, useContext, useRef, useState } from "react";

const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
  const [localName, setLocalName] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socketID, setSocketID] = useState(null);
  const [UserName, setUserName] = useState("");
  const [roomID, setRoomID] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize local stream once
  const initLocalStream = async () => {
    // Agar stream already hai toh wahi return karo
    if (localStream) {
      console.log("Stream already exists, reusing...");
      return localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      
      setLocalStream(stream);
      
      // Automatically assign to ref if available
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log("Local stream initialized successfully");
      return stream;
    } catch (err) {
      console.error("Camera/Mic access denied:", err);
      return null;
    }
  };

  // Stop local stream
  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      console.log("Local stream stopped");
    }
  };

  // Stop remote stream
  const stopRemoteStream = () => {
    if (remoteStream) {
      setRemoteStream(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteName("");
      console.log("Remote stream cleared");
    }
  };

  return (
    <VideoContext.Provider
      value={{
        // States
        localName,
        setLocalName,
        remoteName,
        setRemoteName,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
        socketID,
        setSocketID,
        UserName,
        setUserName,
        roomID,
        setRoomID,
        
        // Refs
        localVideoRef,
        remoteVideoRef,
        
        // Methods
        initLocalStream,
        stopLocalStream,
        stopRemoteStream,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within VideoProvider");
  }
  return context;
};