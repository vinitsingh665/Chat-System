import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './VoiceControl.css'; // We'll create this next

const VoiceControl = ({ socket, roomName }) => {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]); // List of {id, username}
  
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { socketId: RTCPeerConnection }

  useEffect(() => {
    // Cleanup on unmount or room change
    return () => {
      leaveVoice();
    };
  }, [roomName]);

  useEffect(() => {
    if (!socket || !isInVoice) return;

    socket.on('voice-users', (users) => {
      console.log('Voice users:', users);
      setActiveUsers(users); // initial list
      users.forEach(user => {
        createPeer(user.id, socket.id, localStreamRef.current);
      });
    });
    
    socket.on('voice-user-joined', (user) => {
      console.log('Voice user joined:', user);
      setActiveUsers(prev => [...prev, user]);
      // Note: Signal handling is done separately, but we update UI list here
    });

    socket.on('voice-user-left', ({ id }) => {
       console.log('Voice user left:', id);
       setActiveUsers(prev => prev.filter(u => u.id !== id));
       
       // Clean up peer
       if (peersRef.current[id]) {
         peersRef.current[id].destroy();
         delete peersRef.current[id];
       }
    });

    socket.on('signal', ({ from, signal }) => {
      console.log('Received signal from', from, signal.type);
      handleIncomingSignal(from, signal, localStreamRef.current);
    });

    return () => {
      socket.off('voice-users');
      socket.off('voice-user-joined');
      socket.off('voice-user-left');
      socket.off('signal');
    };
  }, [socket, isInVoice]);

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsInVoice(true);
      socket.emit('join-voice', { roomName });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const leaveVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Destroy peers
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};
    
    if (isInVoice && socket) {
      socket.emit('leave-voice', { roomName });
    }

    setIsInVoice(false);
    setIsMuted(false);
    setActiveUsers([]);
  };

  // ... (Toggle Mute, Create Peer, Handle Signal, Setup Events match existing code, just ensuring context)

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const createPeer = (targetId, myId, stream) => {
    console.log('Creating peer for', targetId);
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    peersRef.current[targetId] = peer;
    setupPeerEvents(peer, targetId);

    // Add local stream
    if (stream) {
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
    }

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { to: targetId, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    // Create Offer
    peer.createOffer().then(offer => {
      return peer.setLocalDescription(offer);
    }).then(() => {
      socket.emit('signal', { to: targetId, signal: { type: 'offer', sdp: peer.localDescription } });
    }).catch(err => console.error('Error creating offer:', err));
  };

  const handleIncomingSignal = (fromId, incomingSignal, stream) => {
    let peer = peersRef.current[fromId];

    if (!peer) {
      if (incomingSignal.type !== 'offer') {
        console.warn('Received non-offer signal for unknown peer:', fromId);
        return; // Wait for offer
      }
      
      console.log('Creating answer peer for', fromId);
      peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });
      peersRef.current[fromId] = peer;
      setupPeerEvents(peer, fromId);
      
      // Add local stream
      if (stream) {
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', { to: fromId, signal: { type: 'candidate', candidate: event.candidate } });
        }
      };
    }

    // Handle Signals
    if (incomingSignal.type === 'offer') {
      peer.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp))
        .then(() => peer.createAnswer())
        .then(answer => peer.setLocalDescription(answer))
        .then(() => {
          socket.emit('signal', { to: fromId, signal: { type: 'answer', sdp: peer.localDescription } });
        })
        .catch(err => console.error('Error handling offer:', err));

    } else if (incomingSignal.type === 'answer') {
      peer.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp))
        .catch(err => console.error('Error handling answer:', err));

    } else if (incomingSignal.type === 'candidate') {
      peer.addIceCandidate(new RTCIceCandidate(incomingSignal.candidate))
        .catch(err => console.error('Error adding candidate:', err));
    }
  };

  const setupPeerEvents = (peer, remoteId) => {
    peer.ontrack = (event) => {
      console.log("Received remote stream from", remoteId);
      // Create audio element
      let audioElement = document.getElementById(`audio-${remoteId}`);
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.id = `audio-${remoteId}`;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      }
      audioElement.srcObject = event.streams[0];
    };
    
    // Add simple destroy method for cleanup
    peer.destroy = () => {
      peer.close();
      const el = document.getElementById(`audio-${remoteId}`);
      if (el) el.remove();
    };
  };

  return (
    <div className="voice-control">
      {!isInVoice ? (
        <button className="join-voice-btn" onClick={joinVoice}>
          🎤 <span>Join Voice</span>
        </button>
      ) : (
        <div className="voice-active-panel">
          <div className="voice-status">
            <span className="voice-count">🔊 {activeUsers.length + 1} Connected</span>
            <div className="voice-users-list">
               <span className="me-badge">Me</span>
               {activeUsers.map(u => (
                 <span key={u.id} className="user-badge">{u.username}</span>
               ))}
            </div>
          </div>
          <div className="voice-actions">
            <button className={`mute-btn ${isMuted ? 'muted' : ''}`} onClick={toggleMute}>
              {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
            </button>
            <button className="leave-voice-btn" onClick={leaveVoice}>
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

VoiceControl.propTypes = {
  socket: PropTypes.object,
  roomName: PropTypes.string.isRequired,
};

export default VoiceControl;
