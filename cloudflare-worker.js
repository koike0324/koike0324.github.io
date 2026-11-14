function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return json({ ok: true, service: "FPS P2P signaling", path: "/ws" });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "WebSocket connection required" }, 426);
    }
    const id = env.ROOMS.idFromName("global-room-hub");
    return env.ROOMS.get(id).fetch(request);
  }
};

export class RoomHub {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID(), room: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  socketsIn(room) {
    return this.ctx.getWebSockets().filter(ws => {
      const data = ws.deserializeAttachment();
      return data && data.room === room && ws.readyState === WebSocket.OPEN;
    });
  }

  send(ws, data) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    } catch {}
  }

  roster(room) {
    const players = {};
    for (const ws of this.socketsIn(room)) {
      const data = ws.deserializeAttachment();
      if (data?.id) players[data.id] = true;
    }
    return players;
  }

  broadcast(room, data) {
    for (const ws of this.socketsIn(room)) this.send(ws, data);
  }

  makeCode() {
    return String(100000 + Math.floor(Math.random() * 900000));
  }

  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      this.send(ws, { type: "error", message: "メッセージを読み取れませんでした。" });
      return;
    }

    const data = ws.deserializeAttachment() || { id: crypto.randomUUID(), room: null };

    if (msg.type === "create" || msg.type === "match") {
      let room = null;
      if (msg.type === "match") {
        const rooms = new Map();
        for (const peer of this.ctx.getWebSockets()) {
          const info = peer.deserializeAttachment();
          if (info?.room) rooms.set(info.room, (rooms.get(info.room) || 0) + 1);
        }
        for (const [code, count] of rooms) {
          if (count < 8) { room = code; break; }
        }
      }
      if (!room) {
        do { room = this.makeCode(); } while (this.socketsIn(room).length);
      }
      data.room = room;
      ws.serializeAttachment(data);
      this.send(ws, { type: msg.type === "create" ? "created" : "matched", id: data.id, code: room, players: this.roster(room) });
      this.broadcast(room, { type: "roster", players: this.roster(room) });
      return;
    }

    if (msg.type === "join") {
      const room = String(msg.code || "").trim();
      if (!/^\d{6}$/.test(room)) {
        this.send(ws, { type: "error", message: "6桁のルームコードを確認してください。" });
        return;
      }
      if (this.socketsIn(room).length >= 8) {
        this.send(ws, { type: "error", message: "このルームは満員です。" });
        return;
      }
      data.room = room;
      ws.serializeAttachment(data);
      this.send(ws, { type: "joined", id: data.id, code: room, players: this.roster(room) });
      this.broadcast(room, { type: "roster", players: this.roster(room) });
      return;
    }

    if (msg.type === "signal") {
      if (!data.room || !msg.to || !msg.data) return;
      const target = this.socketsIn(data.room).find(peer => peer.deserializeAttachment()?.id === msg.to);
      if (target) this.send(target, { type: "signal", from: data.id, data: msg.data });
      return;
    }

    if (msg.type === "leave") {
      if (data.room) {
        const room = data.room;
        data.room = null;
        ws.serializeAttachment(data);
        this.send(ws, { type: "left" });
        this.broadcast(room, { type: "roster", players: this.roster(room) });
      }
    }
  }

  async webSocketClose(ws) {
    const data = ws.deserializeAttachment();
    if (data?.room) this.broadcast(data.room, { type: "roster", players: this.roster(data.room) });
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}
