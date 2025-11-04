import React, { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VideoCall from "./videoCall";
import { useVideo } from "../context/videocontext";

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun1.l.google.com:19302" }];

const VideoPage = ({ socket }) => {
  const location = useLocation();
  const { UserName, roomID, socketID } = location.state || {};
  const Navigate = useNavigate();

  const {
    remoteName,
    setRemoteName,
    localVideoRef,
    remoteVideoRef,
    setLocalStream,
    localStream,
    setRemoteStream,
    initLocalStream,
  } = useVideo();

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const hasJoinedRef = useRef(false);

  // Create peer connection
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

  // Auto-initialize stream on mount
  useEffect(() => {
    const setupStream = async () => {
      if (!UserName || !roomID) {
        alert("Username or Room ID missing!");
        Navigate("/");
        return;
      }

      try {
        // Initialize stream from context or get new one
        let stream = localStream;
        if (!stream) {
          stream = await initLocalStream();
        }

        if (!stream) {
          alert("Could not access camera/microphone. Check permissions.");
          return;
        }

        localStreamRef.current = stream;

        // Set local video
        if (localVideoRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = stream;
        }

        // Join room only once
        if (!hasJoinedRef.current) {
          socket.emit("join", { username: UserName, roomID });
          hasJoinedRef.current = true;
        }
      } catch (err) {
        console.error("Error setting up stream:", err);
        alert("Could not access camera/microphone.");
      }
    };

    setupStream();
  }, [UserName, roomID, socket, Navigate, initLocalStream, localStream, localVideoRef]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("new-user", ({ id, username }) => {
      console.log("New user joined same room:", username);
      const peer = createPeer(id, username, true);
      if (peer) peersRef.current[id] = peer;
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
      }
    });

    return () => {
      socket.off("new-user");
      socket.off("signal");
      socket.off("user-left");
    };
  }, [socket, createPeer, remoteVideoRef, setRemoteName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach((peer) => peer.close());
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-4">
      <VideoCall
        localName={UserName}
        remoteName={remoteName}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        socket={socket}
        roomID={roomID}
        Navigate={Navigate}
      />
    </div>
  );
};

export default VideoPage;