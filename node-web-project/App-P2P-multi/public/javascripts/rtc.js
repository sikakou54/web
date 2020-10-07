document.addEventListener('DOMContentLoaded', () => {
    const socket = window.io();
    let rtcPeerConnection;
    let remoteStream;  // 2人目の相手の接続を受け取らないようにするため、1人目の接続で受け取った Stream を保持しておく
    
    socket
      .on('connect', () => {
        // 画面初期表示時にサーバと接続する
        console.log('on connect');
      })
      .on('message', async (event) => {
  
        // 別の人が Start するとココに入ってくる
        let parsedEvent;
        try {
          parsedEvent = JSON.parse(event);
        }
        catch(error) {
          return console.warn('on message : Failed To Parse', error);
        }
        
        if(!rtcPeerConnection) {
          return //console.log('on message : RTCPeerConnection Is Not Yet Created', parsedEvent);
        }
        
        // トップレベルプロパティは sdp か candidate のみ
        try {
          if(parsedEvent.sdp) {
            // FIXME : 2人目の相手が接続してくると Failed to set remote answer sdp: Called in wrong state: kStable が発生する (type: 'answer' 時)
            //         それを回避するための暫定策として、1人目と接続している最中は2人目以降の相手の接続を無視することにする
            if(remoteStream) {
  
              console.log('stream is already');
  
              return //console.log('  on message : Remote Stream Is Already Added, Ignore');
            }
            
            console.log('setRemoteDescription :',parsedEvent.sdp);

            // sdp プロパティ配下は type: 'offer' or 'answer' と sdp プロパティ
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(parsedEvent.sdp));
            // FIXME : iOS Safari が後から来た接続を受け取った時 (type: 'offer') に以下のエラーが出る
            //         InvalidStateError: description type incompatible with current signaling state
            //         iOS Safari が後から接続すれば正常に接続できる。回避策が分からない
            
            if(parsedEvent.sdp.type === 'offer') {
              console.log('receive: offer');
  
              //console.log('on message : SDP Offer', parsedEvent);
              
              // type: 'answer' 時に createAnswer() すると以下のエラーが出るので type: 'offer' のみにする
              // Failed to execute 'createAnswer' on 'RTCPeerConnection': PeerConnection cannot create an answer in a state other than have-remote-offer or have-local-pranswer.
              const answer = await rtcPeerConnection.createAnswer();
              
              console.log('setLocalDescription :', answer );

              await rtcPeerConnection.setLocalDescription(answer);

              // Socket を経由して Answer SDP を送る (送る内容は Offer SDP と同じ)
              socket.emit('message', JSON.stringify({ sdp: rtcPeerConnection.localDescription }));
            }
            else {
              console.log('receive: other sdp :' + parsedEvent.sdp.type );
              //console.log('on message : SDP Answer (Do Nothing)', parsedEvent);
            }
          }
          else if(parsedEvent.candidate) {
  
            console.log('receive-candidate ', parsedEvent.candidate );

            // candidate プロパティ配下は candidate・sdpMid・sdpMLineIndex プロパティ
            //console.log('on message : Candidate', parsedEvent);
            rtcPeerConnection.addIceCandidate(new RTCIceCandidate(parsedEvent.candidate));
          }
          else {
            //console.log('on message : Other (Do Nothing)', parsedEvent);  // 基本ない
          }
        }
        catch(error) {
          console.warn('on message : Unexpected Error', error, parsedEvent);  // 基本ない
        }
      });
    
    // ビデオを起動し Local Stream を送信する
    document.getElementById('start-button').addEventListener('click', async () => {
      try {
        const localStream = await getUserMedia();
  
        createRtcPeerConnection(localStream);
        const sessionDescription = await rtcPeerConnection.createOffer();

        console.log('setLocalDescription :',sessionDescription );

        await rtcPeerConnection.setLocalDescription(sessionDescription);
  
        // Socket を経由して Offer SDP を送る
        socket.emit('message', JSON.stringify({ sdp: rtcPeerConnection.localDescription }));
  
        document.getElementById('start-button').disabled = true;
        document.getElementById('stop-button' ).disabled = false;
        document.getElementById('start-button').style.display = 'none';
        document.getElementById('stop-button' ).style.display = 'inline';
      }
      catch(error) {
        console.warn('Failed To Start', error);
      }
    });
    
    // ビデオを停止する
    document.getElementById('stop-button').addEventListener('click', () => {
      try {
        if(document.getElementById('local-video').srcObject) {
          document.getElementById('local-video').srcObject.getTracks().forEach((track) => { track.stop(); });
          document.getElementById('local-video').srcObject = null;
        }
        if(rtcPeerConnection) {
          rtcPeerConnection.close();
          rtcPeerConnection = null;
        }
        if(document.getElementById('remote-video').srcObject) {
  
          try {
            document.getElementById('remote-video').srcObject.getTracks().forEach((track) => { track.stop(); });
            document.getElementById('remote-video').srcObject = null;
          }
          catch(error) {
            console.warn('Failed To Stop Remote Video', error);
          }
        }
        remoteStream = null;
        document.getElementById('start-button').disabled = false;
        document.getElementById('stop-button' ).disabled = true;
        document.getElementById('start-button').style.display = 'inline';
        document.getElementById('stop-button' ).style.display = 'none';
      }
      catch(error) {
        console.warn('Failed To Stop Video (Unexpected Error)', error);
      }
    });
    
    /** ビデオを開始する・例外ハンドリングは呼び出し元の #start-button のクリックイベントで行う */
    async function getUserMedia() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  
      const video = document.createElement("video");
      video.setAttribute("playsinline",true);
      video.setAttribute("autoplay",true);
      video.setAttribute("muted",true);
      video.srcObject = stream;
      document.getElementById('videos').appendChild(video);
  
      return stream;
    }
    
    /** getUserMedia() で取得した Stream をセットした RTCPeerConnection を作成する・例外ハンドリングは呼び出し元の #start-button のクリックイベントで行う */
    function createRtcPeerConnection(localStream) {

      console.log('createRtcPeerConnection :', localStream);

      if(rtcPeerConnection) {
        return;
      }
      
      // iOS Safari の場合 Member RTCIceServer.urls is required and must be an instance of (DOMString or sequence) エラーが出るので
      // url ではなく urls を使う : https://github.com/shiguredo/momo/pull/48
      rtcPeerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      
      rtcPeerConnection.onicecandidate = onicecandidate;
  
      // Chrome などは RTCPeerConnection.addStream(localStream) が動作するが iOS Safari は動作しないので addTrack() を使う
      // iOS Safari : https://stackoverflow.com/questions/57106846/uncaught-typeerror-peerconnection-addstream-is-not-a-function/57108963
      localStream.getTracks().forEach((track) => {
        console.log('track :', track);
        
        rtcPeerConnection.addTrack(track, localStream);
      });
      
      // iOS Safari では onaddstream が動作しないので ontrack を使用する (Chrome なども ontrack に対応)
      rtcPeerConnection.ontrack = ontrack;
      
      // onremovestream は相手の接続が切れたり再接続されたりした時に発火するが、onaddstream (ontrack) 後に onremovestream が動作して
      // おかしくなることが多いので何もしないことにする (removetrack も定義しない)
    }
    
    /** ICE Candidate を送る */
    function onicecandidate(event) {

      console.log('onicecandidate :', event);

      if(event.candidate) {
        socket.emit('message', JSON.stringify({ candidate: event.candidate }));
      }
      else {
        //console.log('onicecandidate : End', event);
      }
    }
    
    /** 相手の接続を受け取ったらリモート映像として表示する */
    function ontrack(event) {
  
      if(remoteStream) {
        return //console.log('  ontrack : Remote Stream Is Already Added, Ignore');  // on message で弾いているので実際はチェックしなくても大丈夫
      }
      
      console.log('ontrack :', event);

      try {
        const video = document.createElement("video");
        video.setAttribute("playsinline",true);
        video.setAttribute("autoplay",true);
        video.srcObject = remoteStream = event.streams[0];
        document.getElementById('videos').appendChild(video);
      }
      catch(error) {
        // Windows Chrome だと play() can only be initialized by a user gesture. エラーが発生して再生できない場合がある
        // chrome://flags#enable-webrtc-remote-event-log を有効にすると play() できるようになる
        console.warn('Failed To Play Remote Video', error);
      }
    }
  
    document.getElementById('start-button').disabled = false;
    document.getElementById('stop-button' ).disabled = true;
    document.getElementById('start-button').style.display = 'inline';
    document.getElementById('stop-button' ).style.display = 'none';
  });
  