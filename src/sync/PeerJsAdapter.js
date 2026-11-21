import { SyncAdapter } from './SyncAdapter.js';

export class PeerJsAdapter extends SyncAdapter {
  constructor() {
    super();
    this.peer = null;
    this.conn = null;
    this.roomId = null;
    this.role = null;
    this.isHost = false;
    this.heartbeatTimer = null;
    this.connectTimeoutTimer = null;
  }

  async connect(roomId, role) {
    this.roomId = roomId;
    this.role = role;
    this.isHost = (role === 'coach');

    this.emitStatusChange('connecting', '시그널링 서버 연결 중...');

    // Wait for PeerJS library to be available on window
    if (!window.Peer) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (window.Peer) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    const peerId = this.isHost
      ? `constellation-${roomId}-coach`
      : `constellation-${roomId}-client-${Math.random().toString(36).substring(2, 7)}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new window.Peer(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun.services.mozilla.com' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          console.log(`[PeerJS] Peer opened with ID: ${id}`);
          if (this.isHost) {
            this.emitStatusChange('waiting', '고객 접속 대기 중...');
            this.setupHostListeners();
            resolve();
          } else {
            this.emitStatusChange('connecting', '코치 룸에 접속 시도 중...');
            this.connectToHost();
            resolve();
          }
        });

        this.peer.on('error', (err) => {
          console.error('[PeerJS] Error:', err);
          if (err.type === 'unavailable-id' && this.isHost) {
            // Coach ID already in use: another coach tab is open
            this.emitStatusChange('error', '이미 동일한 코치 세션이 열려 있습니다.');
          } else if (err.type === 'peer-unavailable' && !this.isHost) {
            this.emitStatusChange('waiting', '코치가 아직 입장하지 않았습니다. 대기 중...');
            // Retry connecting after 3 seconds
            setTimeout(() => {
              if (this.peer && !this.conn) this.connectToHost();
            }, 3000);
          } else {
            this.emitStatusChange('error', `연결 오류: ${err.message || err.type}`);
          }
        });

        this.peer.on('disconnected', () => {
          console.warn('[PeerJS] Disconnected from signaling server');
          this.emitStatusChange('reconnecting', '시그널링 서버 재연결 시도 중...');
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

      } catch (e) {
        this.emitStatusChange('error', e.message);
        reject(e);
      }
    });
  }

  setupHostListeners() {
    this.peer.on('connection', (incomingConn) => {
      console.log('[PeerJS] Incoming connection from client:', incomingConn.peer);

      // In 1:1 constellation, if client reconnects, close prior stale connection and accept new one
      if (this.conn) {
        console.log('[PeerJS] Closing existing connection to accept reconnected peer');
        try {
          this.conn.close();
        } catch (e) {}
        this.conn = null;
      }

      this.conn = incomingConn;
      this.setupConnectionListeners(this.conn, 'client');
    });
  }

  connectToHost() {
    const targetPeerId = `constellation-${this.roomId}-coach`;
    console.log(`[PeerJS] Client connecting to host: ${targetPeerId}`);

    const conn = this.peer.connect(targetPeerId, {
      reliable: true
    });

    this.conn = conn;
    this.setupConnectionListeners(conn, 'coach');

    // 20-second timeout warning as per spec 3.8
    clearTimeout(this.connectTimeoutTimer);
    this.connectTimeoutTimer = setTimeout(() => {
      if (!this.conn || !this.conn.open) {
        this.emitStatusChange('disconnected', '네트워크 환경으로 인해 P2P 직접 연결이 지연되고 있습니다.');
      }
    }, 20000);
  }

  setupConnectionListeners(conn, remoteRole) {
    conn.on('open', () => {
      clearTimeout(this.connectTimeoutTimer);
      console.log(`[PeerJS] DataChannel connection OPEN with ${remoteRole}`);
      this.emitStatusChange('connected', `상대방(${remoteRole === 'coach' ? '코치' : '고객'})과 연결됨`);
      this.emitPeerChange([this.role, remoteRole], 2);

      // Start ping heartbeat
      this.startHeartbeat();

      // If host, send full initial sync state
      if (this.isHost) {
        this.emitOp({ t: 'sync.request_full' }, this.role);
      }
    });

    conn.on('data', (data) => {
      if (!data) return;
      if (data.type === 'ping') {
        conn.send({ type: 'pong' });
        return;
      }
      if (data.type === 'pong') {
        return;
      }
      if (data.type === 'error') {
        this.emitStatusChange('error', data.message);
        return;
      }

      // Valid Op received
      this.emitOp(data, remoteRole);
    });

    conn.on('close', () => {
      console.warn(`[PeerJS] Connection CLOSED with ${remoteRole}`);
      this.stopHeartbeat();
      this.conn = null;
      this.emitStatusChange('disconnected', '상대방과의 연결이 끊어졌습니다.');
      this.emitPeerChange([this.role], 1);

      // Client auto-reconnect attempt
      if (!this.isHost) {
        setTimeout(() => {
          if (!this.conn && this.peer && !this.peer.destroyed) {
            this.emitStatusChange('reconnecting', '코치 룸에 재연결 시도 중...');
            this.connectToHost();
          }
        }, 3000);
      }
    });

    conn.on('error', (err) => {
      console.error(`[PeerJS] Connection error:`, err);
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.conn.send({ type: 'ping' });
      }
    }, 8000); // 8-second heartbeat
    return;
    this.dummy = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.conn.send({ type: 'ping' });
      }
    }, 5000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(op) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(op);
      } catch (err) {
        console.error('[PeerJS] Send op error:', err);
      }
    } else {
      // If disconnected, host stores locally; client waits
      console.warn('[PeerJS] Cannot send op - connection not open');
    }
  }

  disconnect() {
    this.stopHeartbeat();
    clearTimeout(this.connectTimeoutTimer);
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.emitStatusChange('disconnected', '연결이 종료되었습니다.');
  }
}
