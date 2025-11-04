import React, { useMemo } from 'react';
import MainPage from './components/mainPage';
import ChatPage from './components/chatPage';
import VideoPage from './components/videoPage';
import { io } from 'socket.io-client';
import {  Route, Routes } from 'react-router-dom';
import { VideoProvider } from './context/videocontext';

const App = () => {

  const socket = useMemo(() => io( "https://whiteboardproject.onrender.com" ), []);

  return (
      <VideoProvider>
      <Routes>
     
          <Route path="/" element={<MainPage socket={socket} />} />
          <Route path="/chat" element={<ChatPage socket={socket} />} />
          <Route path="/video" element={<VideoPage socket={socket} />} />
       
      </Routes>
    </VideoProvider>
  );
};

export default App;
