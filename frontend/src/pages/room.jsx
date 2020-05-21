import React, { useState, useEffect, useRef } from 'react';
import { SKYWAY_API_KEY } from '../env';
import Layout from '../components/layout';
import { makeStyles, Button } from '@material-ui/core';
if (process.browser) {
  const Peer = require('skyway-js');
}
const useStyles = makeStyles({
  myVideo: {},
  remoteStreams: {
    display: 'flex',
    flexWrap: 'wrap',
  },
});

const Room = (props) => {
  const classes = useStyles();

  if (process.browser) {
    const peer = new Peer({ key: SKYWAY_API_KEY });
    const jsLocalStream = document.getElementById('js-local-stream');
    const jsRemoteStream = document.getElementById('js-remote-streams');
    const jsLeaveTrigger = document.getElementById('js-leave-trigger');
  }


  const localStreamRef = useRef(null);

  const localStreamSetting = async () => {
    localStreamRef.current.srcObject = await navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: true,
      },
    );
    await localStreamRef.current.play();
  };

  const localStreamOff = () => {
    // ローカルストリームを複数回オン, オフにしたとき, current = nullになるため
    if (localStreamRef.current) {
      if (localStreamRef.current.srcObject instanceof MediaStream) {
        localStreamRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  };

  const [roomId, setRoomId] = useState('');
  const [roomMessages, setRoomMessages] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const joinTroggerClick = async () => {
    if (!peer.open) {
      // FIXME: 通話相手がいない的な旨の処理を表示
      return;
    }

    const room = peer.joinRoom(roomId, {
      mode: 'mesh',
      stream: localStreamRef.current.srcObject,
    });

    room.once('open', () => {
      setRoomMessages(roomMessages + '=== You joined ===\n');
      setIsJoined(true);
    });
    room.on('peerJoin', (peerId) => {
      setRoomMessages(roomMessages + `=== ${peerId} joined ===\n`);
    });

    room.on('stream', async (stream) => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute('data-peer-id', stream.peerId);
      newVideo.setAttribute('width', '25%');
      jsRemoteStream.append(newVideo);
      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      setRoomMessages(roomMessages + `${src}: ${data}\n`);
    });

    // for closing room members
    room.on('peerLeave', (peerId) => {
      const remoteVideo = jsRemoteStream.querySelector(
        `[data-peer-id=${peerId}]`,
      );

      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      setRoomMessages(roomMessages + `=== ${peerId} left ===\n`);
    });

    // for closing myself
    room.once('close', () => {
      setRoomMessages(roomMessages + '== You left ===\n');
      Array.from(jsRemoteStream.children).forEach((remoteVideo) => {
        remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    jsLeaveTrigger.addEventListener(
      'click',
      () => {
        setIsJoined(false);
        room.close();
      },
      {
        once: true,
      },
    );
  };

  useEffect(() => {
    (async () => {
      await localStreamSetting();
    })();
  }, []);

  return (
    <Layout>
      <div className="container">
        <h1 className="heading">Room example</h1>
        <div className="room">
          <div className={classes.myVideo}>
            <video
              id="js-local-stream"
              muted
              ref={localStreamRef}
              playsInline
              width="25%"
            />
            <input
              type="text"
              placeholder="Room Name"
              id="js-room-id"
              onChange={(e) => setRoomId(e.target.value)}
            />
            <Button
              id="js-leave-trigger"
              style={{ display: !isJoined ? 'none' : '' }}
            >
              Leave
            </Button>
            <Button
              variant="contained"
              id="js-join-trigger"
              color="primary"
              onClick={joinTroggerClick}
              style={{ display: isJoined ? 'none' : '' }}
            >
              Join
            </Button>
          </div>

          <div className={classes.remoteStreams} id="js-remote-streams" />
          <div>
            <pre className="messages" id="js-messages">
              {roomMessages}
            </pre>
          </div>
          <button
            onClick={async () => {
              await localStreamOff();
              history.back();
            }}
          >
            前のページに戻る
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Room;
