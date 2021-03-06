import Peer from 'peerjs';

const MAX_LATENCY = 500;

/** @type {HTMLElement | undefined} */
let panel;

const openPanel = () => {
  if (panel) {
    panel.style.display = '';
    return;
  }

  const video = (() => {
    const videos = [...document.querySelectorAll('video')];

    if (videos.length == 1)
      return videos[0];

    if (videos.length == 0) {
      alert("No video streams found.");
      return;
    }

    let index = 0;
    do {
      index = prompt(
        [
          "Multiple video streams found:",
          ...videos.map((v, i) => `${i+1}. ${v.src}`)
        ].join('\n'),
        1
      );
    }
    while(index < 1 || index > videos.length);

    return videos[+index - 1];
  })();

  if (video != null) {
    const peer = new Peer();

    /** @type {Peer.DataConnection[]} */
    const currentConnections = [];

    // status, shared with all peers
    const sharedStatus = {
      lastSeekTime: 0,
      lastPauseTime: 0,
      isPaused: true,
    };

    video.addEventListener('play', () => {
      if (sharedStatus.isPaused && (Date.now() - sharedStatus.lastPauseTime) > MAX_LATENCY) {
        sharedStatus.isPaused = false;
        sendAll({ a: 'PLAY' });
      }
    });

    video.addEventListener('pause', () => {
      if (!sharedStatus.isPaused) {
        sharedStatus.isPaused = true;
        sharedStatus.lastPauseTime = Date.now();
        sendAll({ a: 'PAUSE' });
      }
    });

    video.addEventListener('seeked', e => {
      if (sharedStatus.lastSeekTime !== video.currentTime) {
        sharedStatus.lastSeekTime = video.currentTime;
        sendAll({ a: 'SEEK', t: video.currentTime });
      }
    });

    //#region functions

    const receiveData = data => {
      if (typeof data !== 'object')
        return;

      switch (data.a) {
        case 'PLAY':
          video.play();
          break;

        case 'PAUSE':
          video.pause();
          break;

        case 'SEEK':
          video.currentTime = data.t;
          break;
      }
    }

    const sendAll = data => {
      console.debug("[LongDistanceCinema] outgoing data:", data);
      for (let i = 0; i < currentConnections.length; i++)
        currentConnections[i].send(data);
    };

    /** @type {HTMLDivElement[]} */
    const connectionElements = [];

    const registerConnection = conn => {
      currentConnections.push(conn);

      const div = buildConnectionDiv(conn);
      connectionElements.push(div);
      panel.appendChild(div);
    };

    const unregisterConnection = conn => {
      const index = currentConnections.indexOf(conn);
      if (index == -1)
        return;

      currentConnections.splice(index, 1);
      connectionElements.splice(index, 1)[0].remove();
    };

    //#endregion

    //#region panel

    panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.zIndex = '99999';
    panel.style.top = '50px';
    panel.style.left = '10px';
    panel.style.width = '600px';
    panel.style.height = '150px';
    panel.style.resize = 'both';
    panel.style.overflow = 'hidden';
    panel.style.background = 'white';
    panel.style.border = '1px solid rgba(0, 0, 0, .2)';
    panel.style.borderRadius = '.4em';
    panel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, .4)';
    panel.style.margin = '0';
    panel.style.padding = '.6em .8em';
    panel.style.fontFamily = 'sans-serif';
    panel.style.fontSize = '14px';
    panel.style.color = 'black';
    document.body.appendChild(panel);

    const panelHideButton = document.createElement('button');
    panelHideButton.textContent = "Hide this panel";
    panelHideButton.style.marginBottom = '1em';

    panelHideButton.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    panel.appendChild(panelHideButton);

    //#endregion

    //#region connection

    /** @param {Peer.DataConnection} conn */
    const buildConnectionDiv = conn => {
      const div = document.createElement('div');

      const status = document.createElement('span');
      status.textContent = `Connecting with ${conn.peer}...`;
      div.appendChild(status);

      const button = document.createElement('button');
      button.textContent = "Disconnect";
      button.disabled = true;

      const setConnectionOpen = () => {
        status.textContent = `Connected with ${conn.peer}`;
        button.disabled = false;
      }

      if (conn.open)
        setConnectionOpen();
      else
        conn.on('open', setConnectionOpen);

      button.addEventListener('click', () => {
        conn.close();
      });

      div.appendChild(button);

      return div;
    };

    //#endregion

    const peerIdLabel = document.createElement('div');
    peerIdLabel.textContent = "Your peer id: ";
    peerIdLabel.style.marginBottom = '1em';
    panel.appendChild(peerIdLabel);

    const peerId = document.createElement('input');
    peerId.style.width = '300px';
    peerId.readOnly = true;
    peerIdLabel.appendChild(peerId);

    const peerIdCopyBtn = document.createElement('button');
    peerIdCopyBtn.textContent = 'Copy';
    peerIdCopyBtn.disabled = true;
    peerIdCopyBtn.addEventListener('click', () => {
      peerId.select();
      navigator.clipboard.writeText(peerId.value);

      peerIdCopyBtn.textContent = 'Copied!';
      setTimeout(() => {
        peerIdCopyBtn.textContent = 'Copy';
      }, 2000);
    });
    peerIdLabel.appendChild(peerIdCopyBtn);

    const connectInput = document.createElement('input');
    connectInput.placeholder = "Enter your friend's peer id...";
    connectInput.addEventListener('change', () => {
      connectBtn.disabled = !connectInput.value;
    });
    connectInput.addEventListener('keyup', () => {
      connectBtn.disabled = !connectInput.value;
    });
    connectInput.addEventListener('input', () => {
      connectBtn.disabled = !connectInput.value;
    });
    panel.appendChild(connectInput);

    const connectBtn = document.createElement('button');
    connectBtn.textContent = "Connect";
    connectBtn.disabled = true;
    connectBtn.addEventListener('click', () => {
      const remotePeerId = connectInput.value;
      const conn = peer.connect(remotePeerId);

      console.log("[LongDistanceCinema] outgoing connection. Id:", conn.peer);
      registerConnection(conn);

      const connectionTimeout = setTimeout(() => {
        console.log("[LongDistanceCinema] outgoing connection request timed out (with", conn.peer, ").");
        conn.close();
        unregisterConnection(conn);
      }, 20000);

      conn.on('open', () => {
        console.log("[LongDistanceCinema] outgoing connection opened (with", conn.peer, ").");
        clearTimeout(connectionTimeout);
      });
      conn.on('close', () => {
        console.log("[LongDistanceCinema] outgoing connection closed (with", conn.peer, ").");
        unregisterConnection(conn);
      });
      conn.on('error', err => {
        console.error("[LongDistanceCinema] outgoing connection error (with", conn.peer, "):", err);
        unregisterConnection(conn);
      });
      conn.on('data', data => {
        console.debug("[LongDistanceCinema] incoming data (with", remotePeerId, "):", data);
        receiveData(data);
      });

      connectInput.value = '';
    });
    panel.appendChild(connectBtn);

    peer.on('open', id => {
      console.log("[LongDistanceCinema] peer opened. Id:", id);

      peerId.value = id;
      peerIdCopyBtn.disabled = false;
    });
    peer.on('close', () => {
      console.log("[LongDistanceCinema] peer closed.");

      peerId.value = '';
      peerIdCopyBtn.disabled = true;
    });
    peer.on('connection', conn => {
      console.log("[LongDistanceCinema] incoming connection. Id:", conn.peer);

      conn.on('open', () => {
        console.log("[LongDistanceCinema] incoming connection opened (with", conn.peer, ").");

        registerConnection(conn);
      });
      conn.on('close', () => {
        console.log("[LongDistanceCinema] incoming connection closed (with", conn.peer, ").");

        unregisterConnection(conn);
      });
      conn.on('error', err => {
        console.error("[LongDistanceCinema] incoming connection error (with", conn.peer, "):", err);

        unregisterConnection(conn);
      });
      conn.on('data', data => {
        console.debug("[LongDistanceCinema] incoming data (with", conn.peer, "):", data);

        receiveData(data);
      });
    });
  };
}

window.__LONGDISTANCECINEMA = {
  init() {
    openPanel();
  }
};
