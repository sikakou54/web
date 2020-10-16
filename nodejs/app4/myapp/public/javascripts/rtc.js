let rtcPeerConnection = null;
let remoteStream = null;  // 2人目の相手の接続を受け取らないようにするため、1人目の接続で受け取った Stream を保持しておく
let localStream = null;
let livers = new Array();
let userType = null;
let socket = null;
let roomID = null;
let user_name = null;

console.log('load');


document.addEventListener('beforeunload', function(e){
  stopVideo();
});

document.addEventListener('DOMContentLoaded', () => {

    socket = window.io();
    userType = document.getElementById('play_input_type').textContent;
    roomID = document.getElementById('play_input_roomID').textContent;
    user_name = document.getElementById('play_input_user_name').textContent;

    socket.on('connect', async () => {

      /* 初期化処理 */
      socket.emit('init', roomID, user_name);

      if( userType != "視聴" ) {
        /** ストリームを取得し通信を始める */
        startVideo();
      }

    });
    
    socket.on('req_join_room', async (text) => {
      addLog(text);
    });

    socket.on('req_leave_room', async (text) => {
      const remotevideo = document.getElementById("remote_video");
      remotevideo.srcObject = remoteStream = null;

      addLog(text);
    });

    socket.on('message', async (event) => {

        // 別の人が Start するとココに入ってくる
        let parsedEvent;
        let sdpLines = '';

        console.log('message :', event );

        try {
          parsedEvent = JSON.parse(event);
          //console.log('parsedEvent :', parsedEvent );
        }
        catch(error) {
          return console.warn('on message : Failed To Parse', error);
        }
        
        if(!rtcPeerConnection) {
          return ////console.log('on message : RTCPeerConnection Is Not Yet Created', parsedEvent);
        }
        
        // トップレベルプロパティは sdp か candidate のみ
        try {
        
          if(parsedEvent.sdp) {

            let sdp_data = parsedEvent.sdp.sdp;
            let params = '';
            let sId = '';

            // sdpデータをからセッションIDを取得する
            sdpLines = sdp_data.split('\n').map(l => l.trim());
            for(var i = 0; i < sdpLines.length; i++) {
              if(sdpLines[i].match('^o=') != null ) {
                params = sdpLines[i].split(' ').map(l => l.trim());
                sId = params[1];
                break;
              }
            }
            
            if( livers.indexOf(sId) == -1 ) {

              // sdp プロパティ配下は type: 'offer' or 'answer' と sdp プロパティ
              await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(parsedEvent.sdp));
              // FIXME : iOS Safari が後から来た接続を受け取った時 (type: 'offer') に以下のエラーが出る
              //         InvalidStateError: description type incompatible with current signaling state
              //         iOS Safari が後から接続すれば正常に接続できる。回避策が分からない
              
              if(parsedEvent.sdp.type === 'offer') {
               
                // type: 'answer' 時に createAnswer() すると以下のエラーが出るので type: 'offer' のみにする
                // Failed to execute 'createAnswer' on 'RTCPeerConnection': PeerConnection cannot create an answer in a state other than have-remote-offer or have-local-pranswer.
                const answer = await rtcPeerConnection.createAnswer();
                
                //console.log('setLocalDescription :', answer );

                await rtcPeerConnection.setLocalDescription(answer);

                // Socket を経由して Answer SDP を送る (送る内容は Offer SDP と同じ)
                socket.emit('message', JSON.stringify({ sdp: rtcPeerConnection.localDescription }));
              }
              else {
                //console.log('receive: other sdp :' + parsedEvent.sdp.type );
                ////console.log('on message : SDP Answer (Do Nothing)', parsedEvent);
              }
              
              // セッションIDを登録する
              livers.push(sId);
              
            } else {
              // すでに接続済のセッションIDなら無視する
              //console.log('find sId :', sId );
            }
          }
          else if(parsedEvent.candidate) {
            //console.log('receive-candidate ', parsedEvent.candidate );

            // candidate プロパティ配下は candidate・sdpMid・sdpMLineIndex プロパティ
            ////console.log('on message : Candidate', parsedEvent);
            rtcPeerConnection.addIceCandidate(new RTCIceCandidate(parsedEvent.candidate));
          }
          else {
            ////console.log('on message : Other (Do Nothing)', parsedEvent);  // 基本ない
          }
        }
        catch(error) {
          console.warn('on message : Unexpected Error', error, parsedEvent);  // 基本ない
        }
      });

  });
  async function startVideo() {

    try {
      localStream = await getUserMedia();

      const myvideo = document.getElementById('myvideo');
      myvideo.srcObject = localStream;

      createRtcPeerConnection(localStream);
      const sessionDescription = await rtcPeerConnection.createOffer();
      await rtcPeerConnection.setLocalDescription(sessionDescription);

      // Socket を経由して Offer SDP を送る
      socket.emit('message', JSON.stringify({ sdp: rtcPeerConnection.localDescription }));
    }
    catch(error) {
      console.warn('Failed To Start', error);
    }
  }

  async function stopVideo() {

    try {

      localStream = null;
      const remotevideo = document.getElementById("remote_video");
      remotevideo.srcObject = remoteStream = null;

      //Peer接続を閉じる
      if(rtcPeerConnection) {
        rtcPeerConnection.close();
        rtcPeerConnection = null;
      }
    }
    catch(error) {
      console.warn('Failed To Stop Video (Unexpected Error)', error);
    }
  }

  /** ビデオを開始する・例外ハンドリングは呼び出し元の #start-button のクリックイベントで行う */
  async function getUserMedia() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    return stream;
  }
  
  /** getUserMedia() で取得した Stream をセットした RTCPeerConnection を作成する・例外ハンドリングは呼び出し元の #start-button のクリックイベントで行う */
  function createRtcPeerConnection( stream ) {

    //console.log('createRtcPeerConnection :', p_localStream);

    if(rtcPeerConnection) {
      return;
    }
    
    // iOS Safari の場合 Member RTCIceServer.urls is required and must be an instance of (DOMString or sequence) エラーが出るので
    // url ではなく urls を使う : https://github.com/shiguredo/momo/pull/48
    rtcPeerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    
    rtcPeerConnection.onicecandidate = onicecandidate;

    if( stream != null ) {
      // Chrome などは RTCPeerConnection.addStream(localStream) が動作するが iOS Safari は動作しないので addTrack() を使う
      // iOS Safari : https://stackoverflow.com/questions/57106846/uncaught-typeerror-peerconnection-addstream-is-not-a-function/57108963
      stream.getTracks().forEach((track) => {
        //console.log('track :', track);
        
        rtcPeerConnection.addTrack(track, stream);
      });
    }
    
    // iOS Safari では onaddstream が動作しないので ontrack を使用する (Chrome なども ontrack に対応)
    rtcPeerConnection.ontrack = ontrack;
    
    // onremovestream は相手の接続が切れたり再接続されたりした時に発火するが、onaddstream (ontrack) 後に onremovestream が動作して
    // おかしくなることが多いので何もしないことにする (removetrack も定義しない)
  }
  
  /** ICE Candidate を送る */
  function onicecandidate(event) {

    //console.log('onicecandidate :', event);

    if(event.candidate) {
      socket.emit('message', JSON.stringify({ candidate: event.candidate }) );
    }
    else {
      ////console.log('onicecandidate : End', event);
    }
  }
  
  /** 相手の接続を受け取ったらリモート映像として表示する */
  function ontrack(event) {

    //console.log('ontrack :', event);
    
    if(remoteStream) {
      return ////console.log('  ontrack : Remote Stream Is Already Added, Ignore');  // on message で弾いているので実際はチェックしなくても大丈夫
    }

    try {
      const remotevideo = document.getElementById("remote_video");
      remotevideo.srcObject = remoteStream = event.streams[0];
    }
    catch(error) {
      // Windows Chrome だと play() can only be initialized by a user gesture. エラーが発生して再生できない場合がある
      // chrome://flags#enable-webrtc-remote-event-log を有効にすると play() できるようになる
      console.warn('Failed To Play Remote Video', error);
    }
  }

  function addLog( contents ) {
    let element_log = document.getElementById('play_room_log');
    let element_contents = document.createElement('li');
    element_contents.textContent = contents;
    element_log.appendChild(element_contents);
  }