"use strict";

const user_type = document.getElementById('play_input_type').textContent;
const user_room = document.getElementById('play_input_roomID').textContent;
const user_name = document.getElementById('play_input_user_name').textContent;
const video_local = document.getElementById('video_local');
const video_remote = document.getElementById('video_remote');

const dev_socket = document.getElementById('dev_socket');

class WebRTC {

    constructor( _destination, _connection ){
        this.destination = _destination;
        this.connection = _connection;
    }
}

class buff {
    constructor( _destination, _buff ){
        this.destination = _destination;
        this.buff = _buff;
    }
}

let socket = null;
let myStream = null;
let WebRTCConnection = [];
let Candidate_buff = [];

const MSG_TYPE_MASK                 = 0x000F;
const MSG_ID_MASK                   = 0xFFF0;

const MSG_TYPE_REQUEST              = 0x0001;
const MSG_TYPE_RESPONSE             = 0x0002;
const MSG_TYPE_RTC                  = 0x0004;

const MSGID_ROOM_ENTER              = 0x0010;
const MSGID_MEDIA                   = 0x0020;
const MSGID_CONNECTION              = 0x0040;
const MSGID_COMMUNICATION           = 0x0080;
const MSGID_DISCONNECTION           = 0x0100;
const MSGID_CANDIDATE_RETRY         = 0x0200;

const MSGID_ROOM_ENTER_REQ          = MSGID_ROOM_ENTER | MSG_TYPE_REQUEST;
const MSGID_ROOM_ENTER_RES          = MSGID_ROOM_ENTER | MSG_TYPE_RESPONSE;
const MSGID_MEDIA_REQ               = MSGID_MEDIA | MSG_TYPE_REQUEST;
const MSGID_MEDIA_RES               = MSGID_MEDIA | MSG_TYPE_RESPONSE;
const MSGID_CONNECTION_REQ          = MSGID_CONNECTION | MSG_TYPE_REQUEST;
const MSGID_CONNECTION_RES          = MSGID_CONNECTION | MSG_TYPE_RESPONSE;
const MSGID_DISCONNECTION_REQ       = MSGID_DISCONNECTION | MSG_TYPE_REQUEST;
const MSGID_DISCONNECTION_RES       = MSGID_DISCONNECTION | MSG_TYPE_RESPONSE;
const MSGID_COMMUNICATION_RTC       = MSGID_COMMUNICATION | MSG_TYPE_RTC;
const MSGID_CANDIDATE_RETRY_RTC     = MSGID_CANDIDATE_RETRY | MSG_TYPE_RTC;

/** ユーザー種別文字列のインデック変換処理 */
function getUserTypeId( _user_type_str ) {
    let id = -1;
    switch ( _user_type_str ) {
        case "肯定":
            id = 0;
            break;
        case "否定":
            id = 1;
            break;
        case "視聴":
            id = 2;
            break;
        default:
            id = -1;
            break;
    }
    return id;
}

function createMessage( _sender, _destination, _msgid, _data ) {

    let obj = {
        header : {
            sender: _sender,
            destination: _destination,
            msgid: _msgid
        },
        data : _data
    }

    return JSON.stringify( obj );
}

/** ビデオを開始する・例外ハンドリングは呼び出し元の #start-button のクリックイベントで行う */
function getUserMedia() {

  navigator.getUserMedia = navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia;

  if (navigator.getUserMedia) {
    navigator.getUserMedia({video: true, audio: true},
      function(stream) {
        video_local.srcObject = myStream = stream;
        let msg = createMessage( socket.id, 'admin', MSGID_MEDIA_RES, { user_type:getUserTypeId(user_type), room_id:user_room } );
        socket.emit('message', msg );
      },
      function(err) {
        ////////console.log("error", err );
      }
    )
  }
}

function CreatePeerConnection( _destination ) {
    let NewConnection = null;

    NewConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    
    if( myStream != null ) {
        myStream.getTracks().forEach((track) => {
            NewConnection.addTrack(track, myStream );
        });
    }

    NewConnection.onnegotiationneeded = function() {
        ////console.log('onnegotiationneeded', NewConnection );
    };

    NewConnection.onicecandidate = function( event ){
		if(event.candidate) {
            ////console.log('onicecandidate', NewConnection, socket.id, _destination );
            let msg = createMessage( socket.id, _destination, MSGID_COMMUNICATION_RTC, { type:'candidate', candidate: event.candidate } );
            socket.emit('message', msg );
		}
		else {
			////console.log('candidate-end', NewConnection, socket.id, _destination );
		}
    };

    NewConnection.onconnectionstatechange = function(event) {

        console.log('onconnectionstatechange', socket.id, _destination, NewConnection.connectionState );

        switch( NewConnection.connectionState ) {
            case "connected":
                let msg = createMessage( socket.id, _destination, MSGID_CONNECTION_RES, { room_id:user_room } );
                socket.emit('message', msg );
                break;
            case "disconnected":
                break;
            case "failed":
            // One or more transports has terminated unexpectedly or in an error
                break;
            case "closed":
            // The connection has been closed
                break;
            default:
                break;
        }
    }

    return NewConnection;
}

document.addEventListener('DOMContentLoaded', () => {

    WebRTCConnection = [];
    socket = window.io();

    socket.on('connect', async function() {

        dev_socket.textContent = socket.id;

        let msg = createMessage( socket.id, 'admin', MSGID_ROOM_ENTER_REQ, { room_id:user_room, room_type: getUserTypeId( user_type ), user_name:user_name } );
        socket.emit('message', msg );
    });

    socket.on('message', async function( _message ) {

        //////console.log('message', _message );

        for( let i = 0; i < WebRTCConnection.length; i++ ){
            //////console.log( i, WebRTCConnection[i].destination, WebRTCConnection[i].connection );
        }

        let message = JSON.parse( _message );

        switch ( message.header.msgid & MSG_ID_MASK ) {
            case MSGID_ROOM_ENTER:
                if( MSG_TYPE_RESPONSE == ( message.header.msgid & MSG_TYPE_MASK ) ) {
                    if( false == message.data.room_join_result ) {
                        alert("メンバーが揃っていて参加できませんでしたm(__)m");
                    }
                }
                break;
            case MSGID_MEDIA:
                if( MSG_TYPE_REQUEST == ( message.header.msgid & MSG_TYPE_MASK ) ) {
                    getUserMedia();
                }
                break;
            case MSGID_CONNECTION:
                if( MSG_TYPE_REQUEST == ( message.header.msgid & MSG_TYPE_MASK ) ) {

                    //console.log('receive connection', message.header.sender, message.header.destination );

                    /** 新しいConnectionを作成しofferを作成する */
                    let connection = CreatePeerConnection( message.header.destination );
                    let mediaConstraints = null;

                    /** 配信者はリモートビデオにストリームを設定するように指定する */
                    connection.ontrack = function( event ) {
                        if( video_remote.srcObject == null ) {
                            video_remote.srcObject = event.streams[0];
                        }
                    };

                    /** 配信者と視聴者の接続の場合は、視聴者にビデオと音声を求めない指定をする */
                    if( true == message.data.isWacther ) {
                        mediaConstraints = {'mandatory': {'OfferToReceiveAudio':false, 'OfferToReceiveVideo':false }};
                    } else {
                        mediaConstraints = {'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};
                    }
                    
                    /** オファーを作成し送信する */
                    connection.createOffer( function( offer ) {

                        ////console.log('create offer');

                        connection.setLocalDescription( offer );
                        let msg = createMessage( message.header.sender, message.header.destination, MSGID_COMMUNICATION_RTC, { type:'offer', sdp: connection.localDescription, user_type: getUserTypeId( user_type ) } );
                        socket.emit('message', msg );

                        WebRTCConnection.push( new WebRTC( message.header.destination, connection ));
                    }, function( error ){
                        ////////console.warn('offer create error', error );
                    }, mediaConstraints );
                }
                break;

            case MSGID_COMMUNICATION:
                if( MSG_TYPE_RTC == ( message.header.msgid & MSG_TYPE_MASK ) ) {
                    switch ( message.data.type ) {
                        case 'offer':

                            //console.log('receive offer', message.header.sender, message.header.destination );

                            let NewConnection = null;

                            for( let i = 0; i < WebRTCConnection.length; i++ ) {
                                if( message.header.sender == WebRTCConnection[i].destination ){
                                    NewConnection = WebRTCConnection[i].connection;
                                    break;
                                }
                            }

                            if( null == NewConnection ) {
                                NewConnection = CreatePeerConnection( message.header.sender );
                            }
                            
                            /** 配信者側の場合はリモートビデオに相手のストリームを指定する */
                            if( 0 == getUserTypeId( user_type ) || 
                                1 == getUserTypeId( user_type )) {
                                NewConnection.ontrack = function( event ) {
                                    //////console.log('ontrack', event, video_remote.srcObject );
                                    if( video_remote.srcObject == null ) {
                                        video_remote.srcObject = event.streams[0];
                                    }
                                };

                            } else if( 2 == getUserTypeId( user_type ) ) {
                                /** 視聴者で接続相手が肯定の場合ローカルビデオに相手のストリームを指定する */
                                if( 0 == message.data.user_type ) {
                                    NewConnection.ontrack = function( event ) {
                                        //////console.log('ontrack -> positive', event, video_local.srcObject );
                                        if( video_local.srcObject == null ) {
                                            ////////console.log('set success local video');
                                            video_local.srcObject = event.streams[0];
                                        }
                                    };
                                /** 視聴者で接続相手が否定の場合リモートビデオに相手のストリームを指定する */
                                } else if( 1 == message.data.user_type ) {
                                    NewConnection.ontrack = function( event ) {
                                        //////console.log('ontrack -> negative', event, video_remote.srcObject );
                                        if( video_remote.srcObject == null ) {
                                            video_remote.srcObject = event.streams[0];
                                        }
                                    };
                                }
                            }

                            try {
                                ////console.log('add offer', message.header.sender, message.header.destination );
                                await NewConnection.setRemoteDescription(new RTCSessionDescription( message.data.sdp ));
                            } catch (error) {
                                ////console.warn('err', error, NewConnection );
                            }
                            

                            NewConnection.createAnswer( function( answer ) {

                                ////console.log('create answer');
                                NewConnection.setLocalDescription( answer );
                                let msg = createMessage( message.header.destination, message.header.sender, MSGID_COMMUNICATION_RTC, { type:'answer', sdp: NewConnection.localDescription  } );
                                socket.emit('message', msg );

                                WebRTCConnection.push( new WebRTC( message.header.sender, NewConnection ));
                            }, function( error ){
                                //////console.warn('offer create error', error );
                            });
                            break;

                        case 'answer':

                            //console.log('receive answer', message.header.sender, message.header.destination );
                            
                            for( let i = 0; i < WebRTCConnection.length; i++ ) {
                                if( message.header.sender == WebRTCConnection[i].destination ) {

                                    try {
                                        //console.log('add answer bef', message.header.sender, message.header.destination , WebRTCConnection[i].connection );
                                        await WebRTCConnection[i].connection.setRemoteDescription(new RTCSessionDescription( message.data.sdp ));
                                        //console.log('add answer af', message.header.sender, message.header.destination , WebRTCConnection[i].connection );
                                    } catch (error) {
                                        //console.warn('err', error, WebRTCConnection[i] );
                                    }

                                    ////console.log('send retry',  message.header.destination, message.header.sender);
                                    let msg = createMessage( message.header.destination, message.header.sender, MSGID_CANDIDATE_RETRY_RTC, { dummy: null  } );
                                    socket.emit('message', msg );        
                                    break;
                                }
                            }
                            break;

                        case 'candidate':
                            let ConnectionObj = null;

                            ////console.log('receive candidate', message.header.sender, message.header.destination, WebRTCConnection.length );

                            for( let i = 0; i < WebRTCConnection.length; i++ ) {
                                ////console.log('WebRTCConnection', WebRTCConnection[i] );
                                if( message.header.sender == WebRTCConnection[i].destination &&
                                    null != WebRTCConnection[i].connection.remoteDescription.type ) {
                                    ConnectionObj = WebRTCConnection[i];

                                    try {
                                        ////console.log('add candidate');
                                        ConnectionObj.connection.addIceCandidate(new RTCIceCandidate( message.data.candidate ) );
                                    } catch (error) {
                                        ////console.warn('err', error, ConnectionObj );
                                    }

                                    break;
                                }
                            }
                            if( null == ConnectionObj ) {
                                ////console.log('add buff', message.header.sender );
                                Candidate_buff.push( new buff( message.header.sender, message.data.candidate ) );
                            }
                            break;
                        default:
                            break;
                    }
                }
                break;
            case MSGID_CANDIDATE_RETRY:

                if( MSG_TYPE_RTC == ( message.header.msgid & MSG_TYPE_MASK ) ) {

                    ////console.log('candidate retry');

                    for( let i = 0; i < WebRTCConnection.length; i++ ) {
                        if( message.header.sender == WebRTCConnection[i].destination ){
                            for( let buff = 0; buff < Candidate_buff.length; buff++ ) {
                                if( Candidate_buff[buff].destination == WebRTCConnection[i].destination ) {

                                    try {
                                        ////console.log('add candidate');
                                        WebRTCConnection[i].connection.addIceCandidate(new RTCIceCandidate( Candidate_buff[buff].buff ) );
                                    } catch (error) {
                                        ////console.warn('err', error, WebRTCConnection[i] );
                                    }

                                }
                            }
                            break;
                        }
                    }
                }
                break;

            case MSGID_DISCONNECTION:

                if( MSG_TYPE_REQUEST == ( message.header.msgid & MSG_TYPE_MASK ) ) {
                    /** 切断したユーザーの接続をcloseし配列も削除する */
                    for( let i = 0; i < WebRTCConnection.length; i++ ) {
                        if( message.data.disconnect_socket == WebRTCConnection[i].destination ) {
                            if( null != WebRTCConnection[i].connection ) {
                                //////console.log('user disconnected', message.data.disconnect_socket );
                                WebRTCConnection[i].connection.close();
                                WebRTCConnection.splice( i, 1 );
                                break;
                            }
                        }
                    }
                }
                break;
            default:
                break;
        }
    });
});