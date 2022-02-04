const MAXIMUM_MESSAGE_SIZE = 65535;
const END_OF_FILE_MESSAGE = 'EOF';
var labelUsername = document.querySelector('#label-username');
var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');
var roomInput = document.querySelector('#room');
var roomPassInput = document.querySelector('#room-pass');
var btnRoomGenerate = document.querySelector('#btn-generateRoom');
var btnCheckRoom = document.querySelector('#btn-checkRoom');
var btnDisconnectRoom = document.querySelector('#btn-disconnect');
var btnSendSignal = document.querySelector('#btn-sendSignal');
var username;
var room;
var isAdmin = 0;
var connection = 0;
var roomsList = [];
var mapPeers = {};
const senders = [];
var mapChannel = {};
var roomKicked = {};
var checkPass = 0;
var roomPass;
var curAdmin;
let file;
var clientInfo = {};
var adminLabel;



//класс клиента
class Client {
    constructor(username, isAdmin) {
        this.username = "";
        this.isAdmin = false;
    }
}
//генерация псевдослучайной комнаты
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
};
//кнопка проверки комнаты
if (btnCheckRoom) {
    btnCheckRoom.addEventListener('click', () => {
        var room = roomInput.value;
        if (room.length > 0){
        var loc = window.location;
        var wsStart = 'ws://';
        if (loc.protocol == 'https:') {
            wsStart = 'wss://';
        }
        var endPoint = wsStart + loc.host + loc.pathname;
        if (connection == 0) {
            webSocket = new WebSocket(endPoint);
        }
        webSocket.addEventListener('open', (e) => {
            sendSignal('check-room', {}, room, '0');
        });
        if (connection != 0) {
            sendSignal('check-room', {}, room, '0');
        };
        connection += 1;
        webSocket.addEventListener('message', webSocketOnMessage);
    }
    });
    btnRoomGenerate.addEventListener('click', () => {
        roomInput.value = makeid(8);
    });
};
//реакция вебсокета на сообщение
function webSocketOnMessage(event) {
    var parsedData = JSON.parse(event.data);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];
    var message = parsedData['message'];
    console.log("СООБЩЕНИЕ", parsedData);
    if (username == peerUsername && action != 'check-room') {
        return;
    }
    var receiver_channel_name = parsedData['message']['receiver_channel_name']
//неправильный ICE    
    if (action == "wrong_ice") {
        result = parsedData['message'];
        btnDisconnectRoom.click();
        alert("Похоже, вы пытаетесь работать с нового устройства. Для продолжения работы перейдите по ссылке, отправленной вам на почту. Конференция не будет осуществлена")
    }
//действие - удержание
    if (action == 'onhold') {
        result = parsedData['message'];
        btnDisconnectRoom.click();
        alert("Вы были поставлены на ожидание. Ожидайте приглашения");
        btnDisconnectRoom.textContent = "Вы в ожидании приглашения в комнату";
        btnDisconnectRoom.disabled = true;
        btnDisconnectRoom.style.visibility = 'visible';
        btnJoin.style.visibility = "hidden";
        roomInput.disabled = true;
    }
//действие - снятие с удержания
    if (action == 'unhold') {
        result = parsedData['message'];
        if(username == Object.keys(result)[0]){
        btnJoin.click();
        alert("Вы были возвращены в конференцию");
        btnDisconnectRoom.textContent = "Выйти из комнаты";
        btnDisconnectRoom.disabled = false;
        btnDisconnectRoom.style.visibility = 'visible';
        btnJoin.style.visibility = "hidden";
        roomInput.disabled = false;
    };
    }
    if (action == 'pass-admin') {
    curAdmin = message;
    var adminLabel = document.getElementById('label-admin');
    adminLabel.firstElementChild.id = curAdmin + '-label-admin';
    adminLabel.firstElementChild.innerHTML = "Администратор комнаты: " + curAdmin;
}
//действие - исключение
    if (action == 'kick') {
        result = parsedData['message'];
        btnDisconnectRoom.click();
        alert("Вы были исключены из комнаты. До окончания конференции вы не можете туда вернуться");
    }
//действие - проверка на администратора
    if (action == 'check-admin') {
        result = parsedData['message'];
        clientInfo = result;
        curAdmin = clientInfo[0];
        var adminLabel = document.getElementById('label-admin');
        try {
            if (adminLabel.firstElementChild) {
        adminLabel.firstElementChild.id = curAdmin + '-label-admin';
        adminLabel.firstElementChild.innerHTML = "Администратор комнаты: " + curAdmin;
    }} catch (e) {
        console.log(e);
    }
        if (!Object.keys(mapPeers).includes(curAdmin) && Object.keys(mapPeers).length != 0) {
            var divChat = document.getElementById('chat');
            divChat.firstElementChild.innerHTML = "Чат";
        } else {

            var divChat = document.getElementById('chat');
            divChat.firstElementChild.innerHTML = "Чат";
        }
        var adminLabel = document.getElementById('-label-admin');
    };
//действие - новый пользователь    
    if (action == 'new-peer') {
        mapChannel[peerUsername] = receiver_channel_name;
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }
//действие - новое предложение    
    if (action == 'new-offer') {
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiver_channel_name);
        return;
    }
//действие - новый ответ
    if (action == 'new-answer') {
        var answer = parsedData['message']['sdp'];
        try {
            var peer = mapPeers[peerUsername][0];
            peer.setRemoteDescription(answer);
            return;
        } catch (e) {
            console.log(e);
            return;
        }
    }
//действие - проверка комнаты    
    if (action == 'check-room') {
        result = parsedData['message']
        room = parsedData['room']
        var roomCheckContainer = document.querySelector("#roomcheck-container");
        var roomCheckResult = document.createElement('p');
        if (result == '0') {
            roomCheckResult.innerHTML = "Комната " + room + " пуста";
        } else {
            roomCheckResult.innerHTML = "Комната " + room + " непуста";
        }
        roomCheckContainer.appendChild(roomCheckResult);
        setTimeout(function() {
            roomCheckResult.remove();
        }, 7000);
    }
//действие - проверка пароля    
    if (action == 'check-pass') {
        console.log("Получил чек пасс");
        var result = parsedData['message'][1]
        if (result != '1') {
            alert("Вы ввели неверный пароль");
        }
        if (result == '1') {
            var room = parsedData['room'];
            var roomPass = parsedData['message'][0];
            console.log("Отправляю new-peer");
            sendSignal('new-peer', {}, room, roomPass);
            console.log("Отправил new-peer");
        }
        return;
    }
//действие - отключение
    if (action == 'disconnect') {
        if (clientInfo[0] == Object.keys(parsedData['message'])[0]) {
            clientInfo = [];
            curAdmin = "";
        }
        if (parsedData['peer'] == undefined) {
            for (const [key, value] of Object.entries(mapPeers)) {
                value[0].close();
                value[1].close();
            };
        };
        try {
            if (parsedData['peer'] == undefined) {
                messageList.innerHTML = "";
            }
        } catch (e) {
            console.log(e);
        }
        try {
            if (document.getElementById(parsedData['peer'] + '-video')) {
                document.getElementById(parsedData['peer'] + '-video').parentNode.remove();
                document.getElementById(parsedData['peer'] + '-btn-audio').parentNode.remove();
            }
        } catch (e) {
            console.log(e);
        }
    };
};
//кнопка подключения
btnJoin.addEventListener('click', () => {
    var newClient = new Client()
    var selected_ips;
    username = usernameInput.value;
    room = roomInput.value;
    roomPass = roomPassInput.value;
    var labelUsername = document.querySelector('#label-username');
    newClient.username = labelUsername.innerHTML;
    username = labelUsername.innerHTML;
    if (room == '') {
        alert("Введите комнату");
        return;
    }
    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';
    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';
    btnDisconnectRoom.disabled = false;
    btnDisconnectRoom.style.visibility = 'visible';
    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;
    var loc = window.location;
    var wsStart = 'ws://';
    if (loc.protocol == 'https:') {
        wsStart = 'wss://';
    }
    var endPoint = wsStart + loc.host + loc.pathname;
    var adminLabelWrapper = document.querySelector("#label-admin");
    if (!adminLabelWrapper.firstElementChild) {
        adminLabel = document.createElement("p");
        adminLabel.id = '-label-admin';
        adminLabel.innerHTML = "Администратор комнаты: ";
        adminLabelWrapper.appendChild(adminLabel);
    }
    if (connection == 0) {
        webSocket = new WebSocket(endPoint);
        webSocket.addEventListener('open', (e) => {
            if (roomKicked[room]) {
                if (!roomKicked[room].includes(username)) {
                    sendSignal('check-pass', {}, room, roomPass);
                }
            } else {
                sendSignal('check-pass', {}, room, roomPass);
            }
//кнопка отключения от комнаты
            btnDisconnectRoom.style.visibility = 'visible';
            btnDisconnectRoom.addEventListener('click', () => {
                var peer = username;
                sendSignal('disconnect', {}, room, roomPass, peer);
                sendSignal('check-admin', {}, room, roomPass, peer);
                var divChat = document.getElementById('chat');
                divChat.firstElementChild.innerHTML = "Чат";
                btnJoin.disabled = false;
                btnJoin.style.visibility = 'visible';
                btnDisconnectRoom.disabled = true;
                btnDisconnectRoom.style.visibility = 'hidden';
                try {
                    if (document.getElementsByClassName('remotevideo')) {
                        for (var i = 0; i < document.getElementsByClassName('remotevideo').length; i++) {
                            document.getElementsByClassName('remotevideo')[i].parentNode.remove()
                        }
                    }
                    if (document.getElementsByClassName('remotebutton')) {
                        for (var i = 0; i < document.getElementsByClassName('remotebutton').length; i++) {
                            document.getElementsByClassName('remotebutton')[i].parentNode.remove()
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
                var adminLabel = document.getElementById('label-admin');
                adminLabel.innerHTML = "";
            });
        });
        webSocket.addEventListener('message', webSocketOnMessage);
        webSocket.addEventListener('close', (e) => {
            console.log('Соединение закрыто');
        });
        webSocket.addEventListener('error', (e) => {
            console.log('Ошибка');
        });
        connection += 1;
    } else {
        btnDisconnectRoom.addEventListener('click', () => {
                var peer = username;
                sendSignal('disconnect', {}, room, roomPass, peer);
                sendSignal('check-admin', {}, room, roomPass, peer);
                var divChat = document.getElementById('chat');
                divChat.firstElementChild.innerHTML = "Чат";
                btnJoin.disabled = false;
                btnJoin.style.visibility = 'visible';
                btnDisconnectRoom.disabled = true;
                btnDisconnectRoom.style.visibility = 'hidden';
                try {
                    if (document.getElementsByClassName('remotevideo')) {
                        for (var i = 0; i < document.getElementsByClassName('remotevideo').length; i++) {
                            document.getElementsByClassName('remotevideo')[i].parentNode.remove()
                        }
                    }
                    if (document.getElementsByClassName('remotebutton')) {
                        for (var i = 0; i < document.getElementsByClassName('remotebutton').length; i++) {
                            document.getElementsByClassName('remotebutton')[i].parentNode.remove()
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
                var adminLabel = document.getElementById('label-admin');
                adminLabel.innerHTML = "";
            });
        if (roomKicked[room]) {
            if (!roomKicked[room].includes(username)) {
                sendSignal('check-pass', {}, room, roomPass);
                // sendSignal('new-peer', {}, room, roomPass);
            }
        } else {
            sendSignal('check-pass', {}, room, roomPass);
            // sendSignal('new-peer', {}, room, roomPass);
        }
    };
});
//создание нового объекта стрима
var localStream = new MediaStream();
const constraints = {
    'video': true,
    'audio': true
};
const localVideo = document.querySelector("#local-video");
const btnToggleAudio = document.querySelector("#btn-toggle-audio");
const btnToggleVideo = document.querySelector("#btn-toggle-video");
let displayMediaStream;
var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;
        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;
            if (audioTracks[0].enabled) {
                btnToggleAudio.innerHTML = 'Выключить аудио';
                return;
            }
            btnToggleAudio.innerHTML = 'Включить аудио';
        });
        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;
            if (videoTracks[0].enabled) {
                btnToggleVideo.innerHTML = 'Выключить видео';
                return;
            }
            btnToggleVideo.innerHTML = 'Включить видео';
        });
    })
    .catch(error => {
        console.log('Error accessing media devices', error);
    });
//функция отправки сигнала
function sendSignal(action, message, room) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
        'room': room,
        'roomPass': roomPass,
    });
    webSocket.send(jsonStr);
}
//создание предложения
function createOfferer(peerUsername, receiver_channel_name) {
// var ICE_config= {iceTransportPolicy: "relay", 
//   'iceServers': [
//     {
//       'urls': 'stun:stun.l.google.com:19302',
//       'urls': 'stun:37.228.116.217:3478'
//     },
//     {
//       'urls': 'turn:37.228.116.217:3478?transport=udp',
//       'username': 'gu1est',
//       'credential': 'so1mepassword'
//     },
//   ]
// }
var ICE_config= {iceTransportPolicy: "relay", 
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302',
      'urls': 'stun:37.228.116.217:3478'
    },
    {
      'urls': 'turn:37.228.116.217:3478?transport=udp',
      'username': 'gu1est',
      'credential': 'so1mepassword'
    },
  ]
}
    let configuration = {
        iceServers: [{
            "urls": [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
            ]
        }]
    }
    sendSignal('check-admin', {}, room, roomPass, peerUsername);
    var peer = new RTCPeerConnection(ICE_config);
    // var peer = new RTCPeerConnection(configuration);
    addLocalTracks(peer);
    console.log("createOfferer");
    var dc = peer.createDataChannel('channel');
    dc.onmessage = (event) => {
    }
    dc.addEventListener('open', () => {
        console.log("Открылся канал данных");
    });
    dc.addEventListener('message', dcOnMessage.bind(null, peer));
    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);
    var peerAudioBtn = document.getElementById(peerUsername + '-btn-audio');
    peerAudioBtn.addEventListener('click', () => {
        remoteVideo.srcObject.getTracks()[0].enabled = !remoteVideo.srcObject.getTracks()[0].enabled;
        if (remoteVideo.srcObject.getTracks()[0].enabled) {
            peerAudioBtn.innerHTML = 'Выключить аудио ' + peerUsername;
            return;
        }
        peerAudioBtn.innerHTML = 'Включить аудио ' + peerUsername;
    });
    var peerVideoBtn = document.getElementById(peerUsername + '-btn-video');
    peerVideoBtn.addEventListener('click', () => {
        remoteVideo.srcObject.getTracks()[1].enabled = !remoteVideo.srcObject.getTracks()[1].enabled;
        if (remoteVideo.srcObject.getTracks()[1].enabled) {
            peerVideoBtn.innerHTML = 'Выключить видео ' + peerUsername;
            return;
        }
        peerVideoBtn.innerHTML = 'Включить видео ' + peerUsername;
    });
    var peerHoldBtn = document.getElementById(peerUsername + '-btn-hold');
    mapPeers[peerUsername] = [peer, dc];
    peerHoldBtn.addEventListener('click', () => {
        if (peerHoldBtn.textContent.charAt(0) == 'П') {
            var btnSendMsg = document.querySelector('#btn-send-msg');
            var messageList = document.querySelector("#message-list");
            var messageInput = document.querySelector('#msg');
            messageInput.value = 'hold ' + peerUsername;
            btnSendMsg.click();
            messageInput.value = '';
        }
    });
//кнопка исключения пользователя    
    var peerKickBtn = document.getElementById(peerUsername + "-btn-kick");
    peerKickBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'kick ' + peerUsername;
        if (roomKicked[room]) {
            roomKicked[room].push(peerUsername);
        } else {
            roomKicked[room] = [peerUsername];
        };
        btnSendMsg.click();
        messageInput.value = '';
    });
    var passAdminBtn = document.getElementById(peerUsername + "-btn-pass-admin");
    passAdminBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'pass ' + peerUsername;
        sendSignal('passAdmin', {'peer': peerUsername}, room, roomPass);
        btnSendMsg.click();
        messageInput.value = '';
    });
//слушатель изменения ICE    
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];
            sendSignal('disconnect', {}, room, roomPass);
            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    });
    mapPeers[peerUsername][1].addEventListener('close', () => {
        delete mapPeers[peerUsername];
        removeVideo(remoteVideo);
    });
    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            return;
        }
        sendSignal('new-offer', {
                'sdp': peer.localDescription,
                'receiver_channel_name': receiver_channel_name
            },
            room,
            roomPass);
    });
    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('Local description set success');
        });
}
//создание ответчика
function createAnswerer(offer, peerUsername, receiver_channel_name) {
// var ICE_config= {iceTransportPolicy: "relay", 
//   'iceServers': [
//     {
//       'urls': 'stun:stun.l.google.com:19302',
//       'urls': 'stun:37.228.116.217:3478'
//     },
//     {
//       'urls': 'turn:37.228.116.217:3478?transport=udp',
//       'username': 'gu1est',
//       'credential': 'so1mepassword'
//     },
//   ]
// }
var ICE_config= {iceTransportPolicy: "relay",
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302',
      'urls': 'stun:37.228.116.217:3478'
    },
    {
      'urls': 'turn:37.228.116.217:3478?transport=udp',
      'username': 'gu1est',
      'credential': 'so1mepassword'
    },
  ]
}
    let configuration = {
        iceServers: [{
            "urls": [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
            ]
        }]
    }
    var peer = new RTCPeerConnection(ICE_config);
    // var peer = new RTCPeerConnection(configuration);
    addLocalTracks(peer);
    sendSignal('check-admin', {}, room, roomPass, username);
    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);
    var peerAudioBtn = document.getElementById(peerUsername + '-btn-audio');
    peerAudioBtn.addEventListener('click', () => {
        console.log(remoteVideo.srcObject.getTracks()[0].enabled);
        remoteVideo.srcObject.getTracks()[0].enabled = !remoteVideo.srcObject.getTracks()[0].enabled;
        if (remoteVideo.srcObject.getTracks()[0].enabled) {
            peerAudioBtn.innerHTML = 'Выключить аудио ' + peerUsername;
            return;
        }
        peerAudioBtn.innerHTML = 'Включить аудио ' + peerUsername;
    });
    var peerVideoBtn = document.getElementById(peerUsername + '-btn-video');
    peerVideoBtn.addEventListener('click', () => {
        remoteVideo.srcObject.getTracks()[1].enabled = !remoteVideo.srcObject.getTracks()[1].enabled;
        if (remoteVideo.srcObject.getTracks()[1].enabled) {
            peerVideoBtn.innerHTML = 'Выключить видео ' + peerUsername;
            return;
        }
        peerVideoBtn.innerHTML = 'Включить видео ' + peerUsername;
    });
    var peerHoldBtn = document.getElementById(peerUsername + '-btn-hold');
    peerHoldBtn.addEventListener('click', () => {
        if (peerHoldBtn.textContent.charAt(0) == 'П') {
            var btnSendMsg = document.querySelector('#btn-send-msg');
            var messageList = document.querySelector("#message-list");
            var messageInput = document.querySelector('#msg');
            messageInput.value = 'hold ' + peerUsername;
            btnSendMsg.click();
            messageInput.value = '';
        }});
    var peerKickBtn = document.getElementById(peerUsername + "-btn-kick");
    peerKickBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'kick ' + peerUsername;
        if (roomKicked[room]) {
            roomKicked[room].push(peerUsername);
        } else {
            roomKicked[room] = [peerUsername];
        };
        console.log("Исключенные: ", roomKicked);
        btnSendMsg.click();
        messageInput.value = '';
    });
    var passAdminBtn = document.getElementById(peerUsername + "-btn-pass-admin");
    passAdminBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'pass ' + peerUsername;
        sendSignal('passAdmin', {
            'peer': peerUsername
        }, room, roomPass);
        btnSendMsg.click();
        messageInput.value = '';
    });
    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
        });
        peer.dc.addEventListener('message', dcOnMessage.bind(null, peer));
        mapPeers[peerUsername] = [peer, peer.dc];
        if (!roomsList.includes(room)) {
            roomsList.push(room);
        }
        peer.dc.addEventListener('close', () => {
            delete mapPeers[peerUsername];
            removeVideo(remoteVideo);
        });
    });
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];
            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);
        };
    });
    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            return;
        }
        sendSignal('new-answer', {
                'sdp': peer.localDescription,
                'receiver_channel_name': receiver_channel_name
            },
            room);
    });
    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Remote description set successfully for %s', peerUsername);
            return peer.createAnswer();
        })
        .then(a => {
            console.log('Ответ создан');
            peer.setLocalDescription(a);
        })
};
//конвертация файла в массив
async function fileToArray(file) {
    console.log("fileToArray 1", file, file.arrayBuffer());
    const arrayBuffer = await file.arrayBuffer();
    return arrayBuffer;
};
var channelLabel;
//функция отправки файла
const shareFile = () => {
    console.log("Отправка файла");
    if (file) {
        channelLabel = file.name.replace(/\.[^/.]+$/, "");
        console.log(file.name.replace(/\.[^/.]+$/, ""))
        for (const [key, value] of Object.entries(mapPeers)) {
            //mapVideo[value[0]] =
            const channel = value[1];
            channel.binaryType = 'arraybuffer';
            let inf = fileToArray(file);
            inf.then(buf => {
                channel.send(channelLabel + '1azs');
                channel.send(buf);
            });
            channel.onclose = () => {
                closeDialog();
            };
        }
    } else {
        console.log('Нет файла');
    }
};
//закрытие диалога отправки файла
const closeDialog = () => {
    document.getElementById('select-file-input').value = '';
    document.getElementById('select-file-dialog').style.display = 'none';
};
//функция загрузки файла
const downloadFile = (blob, fileName) => {
    const a = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove()
};
//добавление дорожек к локальному стриму
function addLocalTracks(peer) {
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });
    return;
}
var receivedBuffers = [];
var fileName;
//канал данных на сообщения
function dcOnMessage(peer, event) {
    var message = event.data;
//пришел файл
    if (typeof message === 'string') {
        if (message.substr(-4) == '1azs') {
            fileName = message;
            fileName = fileName.substring(0, fileName.length - 4);
            fileName = fileName.replace(/\.[^/.]+$/, "")
            console.log(fileName)
            return;
        };
    };
//пришла строка
    if (typeof message === 'string') {
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(message));
        messageList.appendChild(li);
    } else {
        const {
            data
        } = event;
        try {
            const blob = new Blob([data]);
            fileName = fileName.replace(/\.[^/.]+$/, "")
            console.log(fileName);
            downloadFile(blob, fileName);
        } catch (err) {
        }
    }
};
document.getElementById('btn-stopshare-screen').style.display = 'none';
//создание видео
function createVideo(peerUsername) {
    var videoContainer = document.querySelector("#video-container");
    var userLabel = document.createElement('p');
    userLabel.id = peerUsername + '-label';
    userLabel.innerHTML = "Пользователь: " + peerUsername;
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.width = "512";
    remoteVideo.height = "384";
    remoteVideo.controls = true;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.classList.add("remotevideo");
    var videoWrapper = document.createElement('div');
    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);
    videoWrapper.appendChild(userLabel);
    var buttonWrapper = document.createElement('div');
    var audioBtn = document.createElement('button');
    audioBtn.id = peerUsername + "-btn-audio";
    audioBtn.textContent = "Выключить звук " + peerUsername;
    audioBtn.classList.add("remotebutton");
    var videoBtn = document.createElement('button');
    videoBtn.id = peerUsername + "-btn-video";
    videoBtn.textContent = "Выключить видео " + peerUsername;
    var kickBtn = document.createElement('button');
    kickBtn.id = peerUsername + "-btn-kick";
    kickBtn.textContent = "Исключить пользователя " + peerUsername;
    var holdBtn = document.createElement('button');
    holdBtn.id = peerUsername + '-btn-hold';
    holdBtn.textContent = 'Поставить на ожидание ' + peerUsername;
    var passAdminBtn = document.createElement('button');
    passAdminBtn.id = peerUsername + '-btn-pass-admin';
    passAdminBtn.textContent = 'Передать права администратора ' + peerUsername;
    buttonWrapper.appendChild(audioBtn);
    buttonWrapper.appendChild(videoBtn);
    buttonWrapper.appendChild(kickBtn);
    buttonWrapper.appendChild(holdBtn);
    buttonWrapper.appendChild(passAdminBtn);
    videoContainer.appendChild(buttonWrapper);
    return remoteVideo;
}
var mapVideo = {};
//установка дорожек на удаленное видео
function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
    mapVideo[peer] = remoteStream;

}
//удаление видео
function removeVideo(video) {
    var videoWrapper = video.parentNode;
    if (videoWrapper.parentNode) {
        videoWrapper.parentNode.removeChild(videoWrapper.parentNode.children[4])
        videoWrapper.parentNode.removeChild(videoWrapper);
    };
};
//получение каналов данных пользователя
function getDataChannels() {
    var dataChannels = [];
    for (peerUsername in mapPeers) {
        var dataChannel = mapPeers[peerUsername][1];
        dataChannels.push(dataChannel);
    }
    return dataChannels;
}
var btnSendMsg = document.querySelector('#btn-send-msg');
var messageList = document.querySelector("#message-list");
var messageInput = document.querySelector('#msg');
btnSendMsg.addEventListener('click', sendMsgOnClick);
//функция отправки сообщения в чат
function sendMsgOnClick() {
    var message = messageInput.value;
    if (message.replace(/\s/g, '').length > 0) {
        try {
            var firstFour = message.substring(0, 4);
            var firstSix = message.substring(0, 6);
            //исключение пользователя
            if (firstFour == 'kick') {
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToKick = messageWithoutSpaces.substring(4);
                if (username == curAdmin) {
                    sendSignal('kick', {
                        'peer': usernameToKick
                    }, room, '0');
                    return;
                }
            }
            //передача прав админа
            if (firstFour == 'pass') {
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToPass = messageWithoutSpaces.substring(4);
                if (username == curAdmin) {
                    sendSignal('pass', {
                        'peer': usernameToPass
                    }, room, '0');
                    return;
                }
            }
            //удержание пользователя
            if (firstFour == 'hold') {
                console.log('hold');
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToHold = messageWithoutSpaces.substring(4);
                console.log('hold2');
                if (username == curAdmin) {
                    for (const [key, value] of Object.entries({"1":"1"})) {  
                        sendSignal('onhold', {
                            'peer': usernameToHold
                        }, room, '0');
                        console.log('hold4');
                        var videoContainer = document.getElementById('video-container');
                        var returnBtn = document.createElement('button');
                        returnBtn.id = usernameToHold + '-btn-rtrn';
                        console.log('hold5');
                        returnBtn.textContent = "Вернуть " + usernameToHold;
                        videoContainer.appendChild(returnBtn);
                        console.log("ПРИКРЕПИЛ КНОПКУ!!!");
                        returnBtn.addEventListener('click', () => {
                            var btnSendMsg = document.querySelector('#btn-send-msg');
                            var messageList = document.querySelector("#message-list");
                            var messageInput = document.querySelector('#msg');
                            messageInput.value = 'unhold ' + usernameToHold;
                            btnSendMsg.click();
                            messageInput.value = "";
                            returnBtn.remove();
                        });
                    }
                    return;
                }
                else {
                    console.log("НЕАДМИН");
                }
            }
            //снятие удержания с пользователя
            if (firstSix == 'unhold') {
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToUnhold = messageWithoutSpaces.substring(6);
                if (username == curAdmin) {
                    sendSignal('unhold', {
                        'peer': usernameToUnhold
                    }, room, '0');
                }
                return;
            }
        } catch (e) {
            console.log(e);
        }
        if (!message.includes('kick') && !message.includes('hold') && !message.includes('unhold') && !message.includes('pass')){
        var li = document.createElement('li');
        li.appendChild(document.createTextNode('Я: ' + message));
        messageList.appendChild(li);
        var dataChannels = getDataChannels();
        message = username + ': ' + message;
        for (index in dataChannels) {
            dataChannels[index].send(message);
        }
        messageInput.value = '';
        }
    }
}
//кнопка демонстрации экрана
document.getElementById('btn-share-screen').addEventListener('click', async () => {
    if (!displayMediaStream) {
        displayMediaStream = await navigator.mediaDevices.getDisplayMedia();
    }
    for (const [key, value] of Object.entries(mapPeers)) {
        value[0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    };
    try {
        mapPeers['qwer'][0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    } catch (e) {
        console.log(e);
    }
    try {
        mapPeers['123'][0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    } catch (e) {
        console.log(e);
    }
    document.getElementById('local-video').srcObject = displayMediaStream;
    try {
        console.log(document.getElementById('123-video').srcObject);
    } catch (e) {
        console.log(e);
    }
    document.getElementById('btn-share-screen').style.display = 'none';
    document.getElementById('btn-stopshare-screen').style.display = 'inline';
});
//кнопка прекращения демонстрации экрана
document.getElementById('btn-stopshare-screen').addEventListener('click', async (event) => {
    displayMediaStream = false;
    for (const [key, value] of Object.entries(mapPeers)) {
        value[0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(mapVideo[value[0]].getTracks().find(track => track.kind === 'video'));
    };
    document.getElementById('local-video').srcObject = localStream;
    console.log(document.getElementById('local-video').srcObject);
    document.getElementById('btn-share-screen').style.display = 'inline';
    document.getElementById('btn-stopshare-screen').style.display = 'none';
});
//кнопка отмены отправки файла
document.getElementById('cancel-button').addEventListener('click', () => {
    document.getElementById('select-file-input').value = '';
    document.getElementById('select-file-dialog').style.display = 'none';
});
//слушатель изменения кнопки выбора файла
document.getElementById('select-file-input').addEventListener('change', (event) => {
    file = event.target.files[0];
    document.getElementById('ok-button').disabled = !file;
});
//кнопка отправки файла
document.getElementById('ok-button').addEventListener('click', () => {
    shareFile();
});