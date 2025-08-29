import React ,{useState , useEffect , useRef} from "react";
import { Stage, Layer, Rect, Circle, Line } from "react-konva";
import { FaPencilAlt, FaEraser, FaRegSquare, FaDrawPolygon, FaSlash, FaSave } from "react-icons/fa";
import { FcVideoCall } from "react-icons/fc";
import { useLocation } from "react-router-dom";
import { useNavigate} from "react-router-dom";
import { useVideo } from "../context/videocontext";
const ChatPage = ({socket}) => {
 
  const [tool, setTool] = useState("");
const [lines, setLines] = useState([]); // sab drawn lines
const [showWelcome, setShowWelcome] = useState(true);
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const location = useLocation();
const navigate = useNavigate();
 const { UserName, roomID, socketID  } = location.state || {};
 const { localVideoRef, remoteVideoRef , localStream, remoteStream , initLocalStream} = useVideo();

  const [showVideos, setShowVideos] = useState(false);
  
  console.log("Whiteboard me data: ", UserName, roomID, socketID);

  const [strokeWidth, setStrokeWidth] = useState(3); // pencil ka size
  const [color, setColor] = useState("black");

  
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream, localVideoRef, remoteVideoRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleMouseDown = (e) => {
    if (tool !== "pencil"&& tool !== "eraser") return; // only pencil mode me kaam kare
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y], strokeWidth , color }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool !== "pencil" && tool !== "eraser") return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];

    // Add point
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // Replace last line
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
    socket.emit("drawing", { roomID, line: lastLine });
  };


  const handleMouseUp = () => {
    isDrawing.current = false;
  };
const saveDrawing = () => {
    const dataURL = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "drawing.png";
    link.click();

  };
useEffect(() => {
  socket.on("drawing", (line) => {
    setLines((prev) => [...prev, line]);
  });

  return () => socket.off("drawing");
}, []);
   
    
  return (
    <div style={{ cursor: "url(/cursor.png) , auto" }} className=" h-screen w-screen overflow-hidden relative">
       {showWelcome && (
        <div className="absolute top-5 right-5 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
          🎉 Welcome <span className="font-bold">{UserName}</span> to room{" "}
          <span className="italic">{roomID}</span>
        </div>
      )}
      {/* Toolbar */}

    <div className="absolute top-4   left-1/2 -translate-x-1/2 flex gap-4 bg-gray-800 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg z-10">

  {/* Pencil */}
  <button
    style={{ cursor: "url(/cursor.png) , auto" }}
    onClick={() => setTool("pencil")}
    className={`p-1 sm:p-2 rounded-full ${
      tool === "pencil" ? "bg-blue-300" : "bg-gray-200"
    } hover:bg-gray-300`}
    onDoubleClick={() => setTool("")}
  >
    <FaPencilAlt size={16} className="sm:size-5" color="#a1b91cff" />
  </button>

  {/* Stroke Width */}
  <input
    type="range"
    min="1"
    max="100"
    value={strokeWidth}
    onChange={(e) => setStrokeWidth(Number(e.target.value))}
    className="ml-2 sm:ml-4 w-16 sm:w-24 cursor-grab"
    onMouseDown={(e) => (e.target.style.cursor = "grabbing")}
    onMouseUp={(e) => (e.target.style.cursor = "grab")}
  />

  {/* Eraser */}
  <button
    style={{ cursor: "url(/cursor.png) , auto" }}
    onClick={() => setTool("eraser")}
    className={`p-1 sm:p-2 rounded-full ${
      tool === "eraser" ? "bg-blue-300" : "bg-gray-200"
    } hover:bg-gray-300`}
    onDoubleClick={() => setTool("")}
  >
    <FaEraser size={16} className="sm:size-5" color="black" />
  </button>

  {/* Color Picker */}
  <input
    type="color"
    value={color}
    className="w-10 h-8 sm:w-14 sm:h-10 p-0.5 sm:p-1 rounded-md sm:rounded-lg m-1 sm:m-2"
    style={{ cursor: "url(/cursor.png) , auto" }}
    onChange={(e) => {
      setColor(e.target.value);
      setTool("pencil");
    }}
  />

  {/* Clear */}
  <button
    style={{ cursor: "url(/cursor.png) , auto" }}
    onClick={() => {
      setTool("clear");
      setLines([]);
    }}
    className="p-1 sm:p-2 rounded-full bg-gray-200 hover:bg-red-600"
  >
    <b className="text-xs sm:text-base">X</b>
  </button>

  {/* Save */}
  <button
    style={{ cursor: "url(/cursor.png) , auto" }}
    onClick={saveDrawing}
    className="p-1 sm:p-2 bg-gray-200 rounded-full hover:bg-gray-300"
  >
    <FaSave size={16} className="sm:size-5" color="red" />
  </button>
<button style={{ cursor: "url(/cursor.png) , auto" }} onClick={async () => {
  navigate("/video",
   {
        state: {
          UserName,
          roomID,
          socketID,
        },
      });
 const stream = await initLocalStream();
    if (stream) {
      setShowVideos(true);}
 }} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300" >


  <FcVideoCall size={20} />

</button>

</div>




      
 {showVideos && (
        <>
          <motion.video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute top-1/2 right-5 w-72 h-48 rounded-xl shadow-lg border bg-black object-cover"
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-5 left-5 w-40 h-28 rounded-xl shadow-lg border bg-black object-cover"
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          />
        </>
      )}

      {/* Whiteboard */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        className=""
      >
        <Layer>
            {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
               stroke={line.tool === "eraser" ? "white" : line.color}  // pencil ka apna color
              strokeWidth={line.tool === "eraser" ? line.strokeWidth : line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default ChatPage;