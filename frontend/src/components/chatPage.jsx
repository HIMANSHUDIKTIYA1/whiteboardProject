import React, { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Line, Text, Circle } from "react-konva";
import { FaPencilAlt, FaEraser, FaSave, FaLocationArrow, FaUndo, FaRedo, FaExpand, FaCompress, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { FcVideoCall } from "react-icons/fc";
import { MdClose } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../context/videocontext";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun1.l.google.com:19302" }];

const ChatPage = ({ socket }) => {
  const { UserName, roomID, socketID, localVideoRef, remoteVideoRef, localStream, remoteStream, initLocalStream, setRemoteStream, setRemoteName } = useVideo();
  const navigate = useNavigate();

  // Whiteboard States
  const [tool, setTool] = useState("pencil");
  const [lines, setLines] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [color, setColor] = useState("#000000");
  const [showWelcome, setShowWelcome] = useState(true);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [videoPanelPos, setVideoPanelPos] = useState({ x: 0, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const hasJoinedRef = useRef(false);
  const videoPanelRef = useRef(null);

  // Create peer connection for WebRTC
  const createPeer = useCallback(
    (remoteId, username, initiator = false) => {
      if (!localStreamRef.current) {
        console.error("Local stream not ready when creating peer");
        return null;
      }

      const peer = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });

      // Add local tracks
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });

      // Remote track → show on remote video
      peer.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setRemoteName(username);
          setRemoteStream(e.streams[0]);
        }
      };

      // ICE candidates → send to signaling server
      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("signal", {
            to: remoteId,
            data: { candidate: e.candidate },
          });
        }
      };

      // If initiator, send offer
      if (initiator) {
        (async () => {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit("signal", {
              to: remoteId,
              data: { sdp: peer.localDescription },
            });
          } catch (err) {
            console.error("Error creating offer:", err);
          }
        })();
      }

      return peer;
    },
    [socket, remoteVideoRef, setRemoteName, setRemoteStream]
  );

  // Initialize stream on mount and join room
  useEffect(() => {
    const setupStream = async () => {
      if (!localStream) {
        await initLocalStream();
      }
      
      // Set local stream ref
      if (localStream) {
        localStreamRef.current = localStream;
      }
      
      // Join room for WebRTC if not already joined
      if (socket && UserName && roomID && !hasJoinedRef.current) {
        socket.emit("join", { username: UserName, roomID });
        hasJoinedRef.current = true;
      }
    };
    setupStream();
  }, [localStream, initLocalStream, socket, UserName, roomID]);

  // Update localStreamRef when localStream changes
  useEffect(() => {
    if (localStream) {
      localStreamRef.current = localStream;
    }
  }, [localStream]);

  // Ensure video refs are always updated when stream exists
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef, showVideoPanel]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef, showVideoPanel]);

  // Welcome message timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Socket drawing sync
  useEffect(() => {
    socket.on("drawing", (line) => {
      setLines((prev) => [...prev, line]);
    });
    return () => socket.off("drawing");
  }, [socket]);

  // WebRTC Socket events for video
  useEffect(() => {
    if (!socket) return;

    socket.on("new-user", ({ id, username }) => {
      console.log("New user joined same room:", username);
      if (localStreamRef.current) {
        const peer = createPeer(id, username, true);
        if (peer) peersRef.current[id] = peer;
      }
    });

    socket.on("signal", async ({ from, username, data }) => {
      try {
        let peer = peersRef.current[from];
        if (!peer) {
          peer = createPeer(from, username, false);
          if (peer) peersRef.current[from] = peer;
        }

        if (data.sdp) {
          await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));

          if (pendingCandidatesRef.current[from]) {
            for (const cand of pendingCandidatesRef.current[from]) {
              await peer.addIceCandidate(new RTCIceCandidate(cand));
            }
            delete pendingCandidatesRef.current[from];
          }

          if (data.sdp.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("signal", {
              to: from,
              data: { sdp: peer.localDescription },
            });
          }
        } else if (data.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            if (!pendingCandidatesRef.current[from])
              pendingCandidatesRef.current[from] = [];
            pendingCandidatesRef.current[from].push(data.candidate);
          }
        }
      } catch (err) {
        console.error("Error handling signal:", err);
      }
    });

    socket.on("user-left", (id) => {
      const peer = peersRef.current[id];
      if (peer) {
        peer.close();
        delete peersRef.current[id];
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        setRemoteName("");
        setRemoteStream(null);
      }
    });

    return () => {
      socket.off("new-user");
      socket.off("signal");
      socket.off("user-left");
    };
  }, [socket, createPeer, remoteVideoRef, setRemoteName, setRemoteStream]);

  // Cleanup peer connections on unmount
  useEffect(() => {
    return () => {
      const peers = peersRef.current;
      Object.values(peers).forEach((peer) => peer.close());
    };
  }, []);

  // Drawing handlers
  const handleMouseDown = (e) => {
    if (tool !== "pencil" && tool !== "eraser") return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = { tool, points: [pos.x, pos.y], strokeWidth, color };
    setLines([...lines, newLine]);
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setCursorPos(point);

    if (!isDrawing.current || (tool !== "pencil" && tool !== "eraser")) return;

    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
    socket.emit("drawing", { roomID, line: lastLine });
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      setHistory([...history.slice(0, historyStep + 1), [...lines]]);
      setHistoryStep(historyStep + 1);
    }
    isDrawing.current = false;
  };

  // Undo/Redo
  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setLines(history[historyStep - 1] || []);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setLines(history[historyStep + 1]);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    setLines([]);
    setHistory([...history, []]);
    setHistoryStep(historyStep + 1);
    socket.emit("clear-canvas", { roomID });
  };

  // Save drawing
  const saveDrawing = () => {
    const dataURL = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `whiteboard-${Date.now()}.png`;
    link.click();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle mic
  const handleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
    }
    setMicOn(!micOn);
  };

  // Toggle camera
  const handleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !camOn;
      });
    }
    setCamOn(!camOn);
  };

  // Video Panel Drag Handlers
  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('video') || e.target.closest('input')) {
      return; // Don't drag if clicking on buttons/videos/inputs
    }
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (videoPanelRef.current) {
      const rect = videoPanelRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const maxX = window.innerWidth - (videoPanelRef.current?.offsetWidth || 320);
    const maxY = window.innerHeight - (videoPanelRef.current?.offsetHeight || 400);
    
    const newX = Math.max(0, Math.min(maxX, clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(maxY, clientY - dragOffset.y));
    
    setVideoPanelPos({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Global mouse/touch move handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e) => {
      handleDragMove(e);
    };

    const handleGlobalTouchMove = (e) => {
      handleDragMove(e);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove]);

  // Set default position on mount based on screen size
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      if (window.innerWidth <= 412) {
        // Mobile: center or bottom position
        setVideoPanelPos({ 
          x: Math.max(10, (window.innerWidth - 260) / 2), 
          y: window.innerHeight - 350 
        });
      } else {
        // Desktop: default right position
        setVideoPanelPos({ x: window.innerWidth - 340, y: 80 });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Welcome Toast */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-3 right-2 sm:top-5 sm:right-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl z-50 backdrop-blur-sm max-w-[90%] sm:max-w-none"
          >
            <p className="text-xs sm:text-sm md:text-base">
              🎉 Welcome <span className="font-bold">{UserName}</span> to room{" "}
              <span className="font-mono bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs sm:text-sm">{roomID}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute  sm:top-4 left-[0] sm:left-[25%]  -translate-y-1/2 -translate-[1/2] flex flex-wrap gap-1 sm:gap-2 bg-white/95 backdrop-blur-md p-[1px] sm:p-3 rounded-xl sm:rounded-2xl shadow-2xl z-40 border border-gray-200 max-w-[95%] sm:max-w-none justify-center"
      >
        {/* Pencil */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTool("pencil")}
          className={`p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl transition-all ${
            tool === "pencil" ? "bg-blue-500 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <FaPencilAlt size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
        </motion.button>

        {/* Stroke Width */}
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-1.5 sm:px-3 rounded-lg sm:rounded-xl">
          <span className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Size</span>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-12 sm:w-16 md:w-24 accent-blue-500"
          />
          <span className="text-[10px] sm:text-xs font-semibold text-gray-700">{strokeWidth}</span>
        </div>

        {/* Eraser */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTool("eraser")}
          className={`p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl transition-all ${
            tool === "eraser" ? "bg-red-500 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <FaEraser size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
        </motion.button>

        {/* Color Picker */}
        <div className="relative group">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTool("pencil");
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl cursor-pointer border-2 border-gray-300"
          />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] sm:text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Pick Color
          </div>
        </div>

        {/* Undo */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={undo}
          disabled={historyStep === 0}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          <FaUndo size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
        </motion.button>

        {/* Redo */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={redo}
          disabled={historyStep >= history.length - 1}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          <FaRedo size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
        </motion.button>

        {/* Clear */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearCanvas}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-red-100 hover:bg-red-200 text-red-600"
        >
          <MdClose size={16} className="sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px]" />
        </motion.button>

        {/* Save */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={saveDrawing}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-green-100 hover:bg-green-200 text-green-600"
        >
          <FaSave size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
        </motion.button>

        {/* Video Call */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/video", { state: { UserName, roomID, socketID } })}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-purple-100 hover:bg-purple-200"
        >
          <FcVideoCall size={18} className="sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px]" />
        </motion.button>

        {/* Tracker */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.open("https://tracker-xmna.onrender.com")}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-orange-100 hover:bg-orange-200"
        >
          <FaLocationArrow size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px] text-orange-600 animate-pulse" />
        </motion.button>

        {/* Fullscreen */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-gray-100 hover:bg-gray-200"
        >
          {isFullscreen ? (
            <FaCompress size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
          ) : (
            <FaExpand size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px]" />
          )}
        </motion.button>
      </motion.div>

      {/* Video Panel */}
      <AnimatePresence>
        {showVideoPanel && !isFullscreen && (
          <motion.div
            ref={videoPanelRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: videoPanelPos.x,
              y: videoPanelPos.y
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-3 sm:p-4 z-30 border border-gray-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ 
              minWidth: screenWidth <= 412 ? '260px' : '280px', 
              maxWidth: screenWidth <= 412 ? '90%' : '500px',
              width: screenWidth <= 412 ? '260px' : '320px',
              touchAction: 'none'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {/* Header - Draggable Area */}
            <div 
              className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 select-none"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <FcVideoCall size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Video Feed</span>
                <span className="xs:hidden">Video</span>
              </h3>
              <button
                onClick={() => setShowVideoPanel(false)}
                className="p-1 sm:p-1.5 hover:bg-gray-200 rounded-lg transition touch-none"
                title="Close Panel"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <MdClose size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            {/* Local Video */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <p className="text-[10px] sm:text-xs font-medium text-gray-700">You ({UserName?.substring(0, 8) || 'User'})</p>
                <div className="flex gap-0.5 sm:gap-1">
                  {/* Mic Toggle Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMic}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`p-1 sm:p-1.5 rounded-lg transition touch-none ${
                      micOn 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micOn ? (
                      <FaMicrophone size={12} className="sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <FaMicrophoneSlash size={12} className="sm:w-3.5 sm:h-3.5" />
                    )}
                  </motion.button>
                  
                  {/* Video Toggle Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCam}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`p-1 sm:p-1.5 rounded-lg transition touch-none ${
                      camOn 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    title={camOn ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {camOn ? (
                      <FaVideo size={12} className="sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <FaVideoSlash size={12} className="sm:w-3.5 sm:h-3.5" />
                    )}
                  </motion.button>
                </div>
              </div>
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!camOn ? 'opacity-50' : ''}`}
                />
                {!localStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-sm">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center">
                        👤
                      </div>
                      Camera Off
                    </div>
                  </div>
                )}
                {!camOn && localStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-sm">
                    <div className="text-center">
                      <FaVideoSlash size={24} className="mx-auto mb-2" />
                      <p>Camera Off</p>
                    </div>
                  </div>
                )}
                {!micOn && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <FaMicrophoneSlash size={10} />
                    Muted
                  </div>
                )}
              </div>
            </div>

            {/* Remote Video */}
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-700 mb-1.5 sm:mb-2">Remote User</p>
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xs sm:text-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-700 rounded-full mx-auto mb-1 sm:mb-2 flex items-center justify-center animate-pulse text-xs sm:text-base">
                        ⏳
                      </div>
                      <p className="text-[10px] sm:text-xs">Waiting...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Video Panel Button */}
      {!showVideoPanel && !isFullscreen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowVideoPanel(true)}
          className="absolute top-16 sm:top-20 right-2 sm:right-4 p-3 sm:p-4 bg-blue-500 text-white rounded-full shadow-2xl z-30"
        >
          <FcVideoCall size={20} className="sm:w-6 sm:h-6" />
        </motion.button>
      )}

      {/* Canvas */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="cursor-crosshair"
      >
        <Layer>
          {/* Grid Background (Optional) */}
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === "eraser" ? "white" : line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={line.tool === "eraser" ? "destination-out" : "source-over"}
              shadowBlur={line.tool === "pencil" ? 2 : 0}
              shadowColor={line.color}
            />
          ))}

          {/* Cursor Preview */}
          {tool === "pencil" && (
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={strokeWidth / 2}
              fill={color}
              opacity={0.5}
            />
          )}
        </Layer>
      </Stage>

      {/* Bottom Info Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-3 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-xl text-[10px] sm:text-xs text-gray-600 border border-gray-200 max-w-[95%] sm:max-w-none"
      >
        <span className="hidden sm:inline">Tool: <strong>{tool}</strong> | </span>
        Objects: <strong>{lines.length}</strong> | 
        Room: <strong className="font-mono">{roomID?.substring(0, 8) || roomID}</strong>
      </motion.div>
    </div>
  );
};

export default ChatPage;