// SyncAdapter Abstract Interface
export class SyncAdapter {
  constructor() {
    this.opHandlers = [];
    this.peerChangeHandlers = [];
    this.statusChangeHandlers = [];
  }

  async connect(roomId, role) {
    throw new Error("connect() must be implemented by subclass");
  }

  send(op) {
    throw new Error("send() must be implemented by subclass");
  }

  onOp(cb) {
    this.opHandlers.push(cb);
  }

  onPeerChange(cb) {
    this.peerChangeHandlers.push(cb);
  }

  onStatusChange(cb) {
    this.statusChangeHandlers.push(cb);
  }

  emitOp(op, fromRole) {
    for (const h of this.opHandlers) h(op, fromRole);
  }

  emitPeerChange(peers, count) {
    for (const h of this.peerChangeHandlers) h(peers, count);
  }

  emitStatusChange(status, msg) {
    for (const h of this.statusChangeHandlers) h(status, msg);
  }

  disconnect() {
    throw new Error("disconnect() must be implemented by subclass");
  }
}
