import { useEffect, useRef, useState } from "react";
import * as EVENTS from "./event";
import { getScreenTracksForSharing } from "./helper";

const Demo = ({ deviceId }) => {
  const [socketId, setSocketId] = useState(null);
  const wsRef = useRef();
  const peerConnectionRef = useRef();
  const [disableJoin, setDisableJoin] = useState(false);
  const config = {
    iceServers: [{ urls: ["stun:stun1.l.google.com:19302"] }],
  };

  const sendSocketMessage = (type, data) => {
    const message = { type, data };
    wsRef.current.send(JSON.stringify(message));
  };

  const shareScreen = async (deviceId) => {
    const screenTrack = await getScreenTracksForSharing();
    if (screenTrack) {
      await initializePeerConnection(deviceId, screenTrack);

      const offer = await peerConnectionRef.current.createOffer();

      await peerConnectionRef.current.setLocalDescription(offer);
      sendSocketMessage(EVENTS.DEVICE_OFFER, { offer, deviceId });
    } else {
      console.log("Nothing available to stream");
    }
  };

  const initializePeerConnection = async (deviceId, mediaTrack) => {
    peerConnectionRef.current.onicecandidate = ({ candidate }) => {
      if (!candidate) return;

      console.log("peerConnection::icecandidate", candidate);
      sendSocketMessage(EVENTS.ICECANDIDATE, { deviceId, candidate });
    };

    peerConnectionRef.current.oniceconnectionstatechange = () => {
      console.log(
        "peerConnection::iceconnectionstatechange newState=",
        peerConnectionRef.current.iceConnectionState
      );
      // If ICE state is disconnected stop
      if (peerConnectionRef.current.iceConnectionState === "disconnected") {
        alert("Connection has been closed stopping...");
        wsRef.current.close();
      }
    };

    // peerConnection.ontrack = ({ track }) => {
    //   console.log("peerConnection::track", track);
    //   remoteMediaStream.addTrack(track);
    //   remoteVideo.srcObject = remoteMediaStream;
    // };

    //for (const track of mediaTracks) {
    peerConnectionRef.current.addTrack(mediaTrack);
    // }
  };

  useEffect(() => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnectionRef.current = peerConnection;
    const ws = new WebSocket("ws://localhost:8888");
    ws.onopen = (event) => {
      sendSocketMessage(EVENTS.INIT, {});
    };

    ws.onmessage = async (event) => {
      console.log(event);
      const payload = JSON.parse(event.data);

      switch (payload.type) {
        case EVENTS.INIT_SUCCESS:
          setSocketId(payload.data?.id);
          break;
        case EVENTS.JOIN_SUCCESS:
          setDisableJoin(true);
          break;
        case EVENTS.JOIN_FAILED:
          console.error("Error connecting channel");
          break;
        case EVENTS.LEFT_CHANNEL:
          setDisableJoin(false);
          break;
        case EVENTS.TAM_ANSWER:
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(payload.data.answer)
          );
          break;
        case EVENTS.ICECANDIDATE:
          await peerConnection.addIceCandidate(payload.data.candidate);
          break;
        default:
          console.warn("unknown event ", payload.type);
      }
    };

    wsRef.current = ws;

    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>{`DEVICE ${deviceId} - ${socketId}`}</h1>
      <br />

      <button
        onClick={() =>
          sendSocketMessage("JOIN_CHANNEL", { deviceId: deviceId })
        }
        disabled={disableJoin}
      >
        CONNECT TO TAM
      </button>

      <button
        onClick={() =>
          sendSocketMessage("LEAVE_CHANNEL", { deviceId: deviceId })
        }
      >
        DISCONNECT
      </button>
      <br />
      {disableJoin && (
        <button id="screenShareButton" onClick={() => shareScreen(deviceId)}>
          Share Screen
        </button>
      )}
    </div>
  );
};

export default Demo;
