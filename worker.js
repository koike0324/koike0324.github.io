export class Lobby {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  if(request.headers.get("Upgrade")!=="websocket")return new Response("WebSocket endpoint",{status:426});
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({id:crypto.randomUUID(),code:null});
  return new Response(null,{status:101,webSocket:client});
 }
 async rooms(){return (await this.ctx.storage.get("rooms"))||{};}
 async save(rooms){await this.ctx.storage.put("rooms",rooms);}
 send(ws,data){try{ws.send(JSON.stringify(data));}catch{}}
 async broadcast(code,data){for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.code===code)this.send(ws,data);}}
 async webSocketMessage(ws,raw){
  let m;try{m=JSON.parse(raw);}catch{return this.send(ws,{type:"error",message:"不正なメッセージです。"});}
  const a=ws.deserializeAttachment(),id=a.id,rooms=await this.rooms();
  if(m.type==="create"){
   let code;for(let i=0;i<50;i++){const n=String(Math.floor(100000+Math.random()*900000));if(!rooms[n]){code=n;break;}}
   if(!code)return this.send(ws,{type:"error",message:"ルームを作成できません。"});
   rooms[code]={owner:id,status:"waiting",players:{[id]:{joinedAt:Date.now()}}};ws.serializeAttachment({id,code});await this.save(rooms);
   return this.send(ws,{type:"created",id,code,players:rooms[code].players});
  }
  if(m.type==="join"||m.type==="match"){
   let code=m.type==="join"?String(m.code||""):Object.keys(rooms).find(k=>rooms[k].status==="waiting"&&Object.keys(rooms[k].players).length<8&&!rooms[k].players[id]);
   if(!code&&m.type==="match"){
    for(let i=0;i<50;i++){const n=String(Math.floor(100000+Math.random()*900000));if(!rooms[n]){code=n;break;}}
    if(code)rooms[code]={owner:id,status:"waiting",players:{}};
   }
   if(!code||!rooms[code])return this.send(ws,{type:"error",message:"ルームが見つかりません。"});
   const room=rooms[code],count=Object.keys(room.players).length;
   if(room.status!=="waiting"||count>=8)return this.send(ws,{type:"error",message:"ルームが満員か、参加できない状態です。"});
   room.players[id]={joinedAt:Date.now()};if(Object.keys(room.players).length>=8)room.status="full";
   ws.serializeAttachment({id,code});await this.save(rooms);
   this.send(ws,{type:m.type==="match"?"matched":"joined",id,code,players:room.players});
   await this.broadcast(code,{type:"roster",players:room.players});return;
  }
  if(m.type==="signal"){
   if(!a.code||!m.to)return;
   const target=this.ctx.getWebSockets().find(peer=>{const x=peer.deserializeAttachment();return x?.id===m.to&&x?.code===a.code;});
   if(target)this.send(target,{type:"signal",from:id,data:m.data});return;
  }
  if(m.type==="leave"){await this.remove(ws,id,a.code);this.send(ws,{type:"left"});}
 }
 async remove(ws,id,code){
  const rooms=await this.rooms();
  if(code&&rooms[code]?.players[id]){
   delete rooms[code].players[id];const ids=Object.keys(rooms[code].players);
   if(!ids.length)delete rooms[code];else{if(rooms[code].owner===id)rooms[code].owner=ids[0];if(rooms[code].status==="full")rooms[code].status="waiting";}
   await this.save(rooms);if(rooms[code])await this.broadcast(code,{type:"roster",players:rooms[code].players});
  }
  ws.serializeAttachment({id,code:null});
 }
 async webSocketClose(ws){const a=ws.deserializeAttachment();if(a)await this.remove(ws,a.id,a.code);}
 async webSocketError(ws){const a=ws.deserializeAttachment();if(a)await this.remove(ws,a.id,a.code);}
}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname!=="/ws")return new Response("FPS P2P signaling server is running.");const id=env.LOBBY.idFromName("global-fps-lobby");return env.LOBBY.get(id).fetch(request);}};
