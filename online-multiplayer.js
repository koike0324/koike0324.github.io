import { SIGNALING_SERVER_URL, ICE_SERVERS } from "./online-config.js";
const $ = id => document.getElementById(id);
const panel = $("online-panel"), statusEl = $("online-status"), codeEl = $("online-room-code"), codeInput = $("online-code-input");
let socket=null, myId=null, roomCode=null;
const peers=new Map(), remoteStates=new Map(), candidateQueue=new Map();
function status(s){if(statusEl)statusEl.textContent=s;}
function drawRemote(){window.FPSGameBridge?.setRemotePlayers?.([...remoteStates.values()]);}
function send(message){if(socket?.readyState!==WebSocket.OPEN)throw Error("管理サーバーに接続されていません。");socket.send(JSON.stringify(message));}
function connect(){
 return new Promise((resolve,reject)=>{
  if(SIGNALING_SERVER_URL.includes("YOUR-WORKER-NAME"))return reject(Error("Cloudflare Workerをデプロイし、online-config.jsにURLを設定してください。"));
  if(socket?.readyState===WebSocket.OPEN)return resolve();
  socket=new WebSocket(SIGNALING_SERVER_URL);
  const timer=setTimeout(()=>reject(Error("接続がタイムアウトしました。")),10000);
  socket.addEventListener("open",()=>{clearTimeout(timer);socket.addEventListener("message",onMessage);socket.addEventListener("close",onClose);resolve();},{once:true});
  socket.addEventListener("error",()=>{clearTimeout(timer);reject(Error("管理サーバーに接続できません。URLを確認してください。"));},{once:true});
 });
}
function clearPeers(){for(const pc of peers.values())pc.close();peers.clear();remoteStates.clear();candidateQueue.clear();drawRemote();}
function onClose(){clearPeers();roomCode=null;myId=null;if(codeEl)codeEl.textContent="";status("管理サーバーとの接続が切れました。再接続してください。");}
function attachChannel(id,ch){
 const pc=peers.get(id);if(pc)pc._fpsChannel=ch;
 ch.onmessage=e=>{try{const p=JSON.parse(e.data);if(p.type==="state"&&p.state){remoteStates.set(id,{id,...p.state});drawRemote();}else if(p.type==="damage"&&p.targetId===myId){window.FPSGameBridge?.applyRemoteDamage?.(id,Number(p.damage)||0,p.eventId);}}catch{}};
}
function createPeer(id,initiator){
 const pc=new RTCPeerConnection({iceServers:ICE_SERVERS});peers.set(id,pc);
 pc.onicecandidate=e=>{if(e.candidate)try{send({type:"signal",to:id,data:{candidate:e.candidate}});}catch{}};
 pc.onconnectionstatechange=()=>{if(["failed","closed"].includes(pc.connectionState)){remoteStates.delete(id);drawRemote();if(pc.connectionState==="failed")status("P2P接続に失敗しました。ネットワークによってはTURNサーバーが必要です。");}};
 if(initiator){attachChannel(id,pc.createDataChannel("fps-state",{ordered:false,maxRetransmits:0}));pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>send({type:"signal",to:id,data:{description:pc.localDescription}})).catch(()=>status("P2P接続を開始できませんでした。"));}
 else pc.ondatachannel=e=>attachChannel(id,e.channel);
 return pc;
}
async function receiveSignal(from,data){
 let pc=peers.get(from);if(!pc)pc=createPeer(from,false);
 if(data.description){
  await pc.setRemoteDescription(data.description);
  for(const c of candidateQueue.get(from)||[])await pc.addIceCandidate(c);
  candidateQueue.delete(from);
  if(data.description.type==="offer"){const a=await pc.createAnswer();await pc.setLocalDescription(a);send({type:"signal",to:from,data:{description:pc.localDescription}});}
 }else if(data.candidate){
  if(pc.remoteDescription)await pc.addIceCandidate(data.candidate);
  else candidateQueue.set(from,[...(candidateQueue.get(from)||[]),data.candidate]);
 }
}
function roster(players){
 const ids=Object.keys(players||{}).filter(id=>id!==myId);
 for(const id of ids)if(!peers.has(id))createPeer(id,myId<id);
 for(const id of [...peers.keys()])if(!ids.includes(id)){peers.get(id).close();peers.delete(id);remoteStates.delete(id);}
 drawRemote();
 status("ルーム "+roomCode+"： "+Object.keys(players||{}).length+" / 8 人。ゲームを開始すると位置・向きを同期します。");
}
async function onMessage(event){
 let m;try{m=JSON.parse(event.data);}catch{return;}
 if(m.type==="error")status(m.message||"オンライン接続エラー");
 if(["created","joined","matched"].includes(m.type)){myId=m.id;roomCode=m.code;codeEl.textContent="ROOM "+roomCode;roster(m.players);}
 if(m.type==="roster")roster(m.players);
 if(m.type==="signal"){try{await receiveSignal(m.from,m.data||{});}catch{status("P2P接続情報の処理に失敗しました。");}}
 if(m.type==="left"){clearPeers();roomCode=null;codeEl.textContent="";status("ルームから退出しました。");}
}
async function enter(action,code){
 try{status("管理サーバーに接続しています…");await connect();send({type:action,code});status("ルームを準備しています…");}
 catch(e){status(e.message||"接続できませんでした。");}
}
$("online-open-button")?.addEventListener("click",()=>{panel.style.display=panel.style.display==="block"?"none":"block";});
$("online-close")?.addEventListener("click",()=>{panel.style.display="none";});
$("online-create")?.addEventListener("click",()=>enter("create"));
$("online-join")?.addEventListener("click",()=>{const c=(codeInput.value||"").trim();if(!/^\d{6}$/.test(c))return status("6桁のルームコードを入力してください。");enter("join",c);});
$("online-match")?.addEventListener("click",()=>enter("match"));
window.FPSOnlineClient={sendEvent:p=>{const s=JSON.stringify(p);for(const [id,pc] of peers)if((!p.targetId||p.targetId===id)&&pc._fpsChannel?.readyState==="open")try{pc._fpsChannel.send(s);}catch{}},getRoomCode:()=>roomCode};
setInterval(()=>{
 const state=window.FPSGameBridge?.getState?.();if(!roomCode||!state?.started)return;
 const packet=JSON.stringify({type:"state",state});
 for(const pc of peers.values()){const ch=pc._fpsChannel;if(ch?.readyState==="open"&&ch.bufferedAmount<16000)try{ch.send(packet);}catch{}}
},66);
status("WebRTC P2P方式です。Cloudflare Workerの設定後にルーム機能が使えます。");
