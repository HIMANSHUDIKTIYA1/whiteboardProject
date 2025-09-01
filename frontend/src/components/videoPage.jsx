import React, { useEffect, useRef, useState, useCallback, use } from "react";
import { useNavigate, redirect, useLocation } from "react-router-dom";
import VideoCall from "./videoCall";
const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun1.l.google.com:19302" }];
import { useVideo } from "../context/videocontext";



const VideoPage = ({ socket }) => {
  

  const location = useLocation();
  const { UserName, roomID, socketID } = location.state || {};
const Navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  const [localName, setLocalName] = useState(UserName || "");
  const { remoteName, setRemoteName, localVideoRef, remoteVideoRef,  setLocalStream, localStream, setRemoteStream } = useVideo();

  const localStreamRef = useRef(null);

  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});

  // Create peer connection
  const createPeer = useCallback(    (remoteId, username, initiator = false) => {
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
          socket.emit("signal", { to: remoteId, data: { candidate: e.candidate } });
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
    [socket]
  );

  // Join action → now uses values from location.state
  const handleJoin = async () => {
    const name = localName.trim();
    if (!name) return alert("No username found!");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setJoined(true);

      socket.emit("join", { username: name, roomID });
    } catch (err) {
      console.error("Could not get local stream:", err);
      alert("Could not access camera/microphone. Check permissions.");
    }
  };
useEffect(() => {
 if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
       
      }

},[joined]);
  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("new-user", ({ id, username }) => {
      const peer = createPeer(id, username, true);
      if (peer) peersRef.current[id] = peer;
    });

    socket.on("user-joined", ({ id, username }) => {
      const peer = createPeer(id, username, false);
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
            socket.emit("signal", { to: from, data: { sdp: peer.localDescription } });
          }
        } else if (data.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            if (!pendingCandidatesRef.current[from]) pendingCandidatesRef.current[from] = [];
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
      socket.off("user-joined");
      socket.off("signal");
      socket.off("user-left");
    };
  }, [socket, createPeer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(peersRef.current).forEach((peer) => peer.close());
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-4">
      {!joined ? (
        <div className="w-full max-w-md flex flex-col items-center space-y-4 p-6 bg-white shadow-md rounded-xl">
          <h2 className="text-2xl font-semibold">Join Video Call</h2>
          <p className="text-gray-600 text-sm">
            Room: <span className="font-mono">{roomID || "No room"}</span>
          </p>
          <button
            onClick={handleJoin}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Join as {localName || "Guest"}
          </button>
           <button
            onClick={() => { Navigate("/chat" , {
        state: {
          UserName,
          roomID,
          socketID
        },
      })

             }}
            className="w-full px-4 py-2 bg-transparent text-black border rounded-lg hover:bg-red-600"
          >
          ⇐ VIDEO WITH WHITEBOARD

          </button>
        </div>
      ) : (
        <VideoCall localName={localName}
      remoteName={remoteName}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef} />
      )}
    </div>
  );
};

export default VideoPage;
