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
        var loc = window.location;
        var wsStart = 'ws://';
        if (loc.protocol == 'https:') {
            wsStart = 'wss://';
        }
        console.log(loc.protocol);
        var endPoint = wsStart + loc.host + loc.pathname;
        // console.log('endPoint: ', endPoint);
        if (connection == 0) {
            webSocket = new WebSocket(endPoint);
        }

        console.log(webSocket);

        webSocket.addEventListener('open', (e) => {
            console.log('connection opened');
            sendSignal('check-room', {}, room, '0');
        });
        if (connection != 0) {
            sendSignal('check-room', {}, room, '0');
        };
        connection += 1;
        webSocket.addEventListener('message', webSocketOnMessage);
        // sendSignal('check-room', {}, room, '0');
    });

    btnRoomGenerate.addEventListener('click', () => {
        roomInput.value = makeid(8);
    });
};

//кнопка проверки комнаты
if (btnSendSignal) {
    btnSendSignal.addEventListener('click', () => {
        // var room = roomInput.value;
        var loc = window.location;
        var wsStart = 'wss://';
        if (loc.protocol == 'https') {
            wsStart = 'wss://';
        }
        var endPoint = wsStart + loc.host + loc.pathname;
        // console.log('endPoint: ', endPoint);
        if (connection == 0) {
            webSocket = new WebSocket(endPoint);
        }

        console.log(webSocket);
        var roomPass = "ww"
        webSocket.addEventListener('open', (e) => {
            // console.log('connection opened');
            sendSignal('onhold', {
                "peer": "test"
            }, "room", roomPass, '0');
        });
        if (connection != 0) {
            sendSignal('onhold', {
                "peer": "test"
            }, "room", roomPass, '0');
        };
        connection += 1;
        webSocket.addEventListener('message', webSocketOnMessage);
        // sendSignal('check-room', {}, room, '0');
    });

    // btnRoomGenerate.addEventListener('click', () => {
    //   roomInput.value = makeid(8);
    // });
};

//реакция вебсокета на сообщение
function webSocketOnMessage(event) {
    // console.log('Сообщение от вебсокет 1');
    var parsedData = JSON.parse(event.data);
    console.log("Полученные данные", parsedData);
    console.log("Действие ", parsedData);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];
    var message = parsedData['message'];
    // if(action == 'disconnect'){
    //   console.log("dsadsadsa");
    //   btnJoin.disabled = false;
    //   btnJoin.style.visibility = 'visible';
    //   btnDisconnectRoom.disabled = true;
    //   btnDisconnectRoom.style.visibility = 'hidden';

    // }


    if (username == peerUsername && action != 'check-room') {
        // console.log("username == peerUsername и действие - не проверка комнаты, возврат");
        return;
    }
    // console.log("Сообщение от вебсокет 2");
    var receiver_channel_name = parsedData['message']['receiver_channel_name']
    if (action == "wrong_ice") {
        result = parsedData['message'];
        alert("Похоже, вы пытаетесь работать с нового устройства. Для продолжения работы перейдите по ссылке, отправленной вам на почту. Конференция не будет осуществлена")
        document.getElementById('btn-disconnect').click();
    }
//действие - удержание
    if (action == 'onhold') {
        result = parsedData['message'];
        console.log(result);
        console.log("ПРИШЕЛ ОНХОЛД");
        alert("Вы были поставлены на ожидание. Ожидайте приглашения");
        btnDisconnectRoom.click();
        btnDisconnectRoom.textContent = "Вы в ожидании приглашения в комнату";
        btnDisconnectRoom.disabled = true;
        btnDisconnectRoom.style.visibility = 'visible';
        btnJoin.style.visibility = "hidden";
        roomInput.disabled = true;

    }
//действие - снятие с удержания
    if (action == 'unhold') {
        result = parsedData['message'];
        console.log(result);
        console.log("ПРИШЕЛ ОНХОЛД");
        alert("Вы были возвращены в конференцию");
        btnJoin.click();
        btnDisconnectRoom.textContent = "Выйти из комнаты";
        btnDisconnectRoom.disabled = false;
        btnDisconnectRoom.style.visibility = 'visible';
        btnJoin.style.visibility = "hidden";
        roomInput.disabled = false;

    }

    if (action == 'pass-admin') {
    console.log("Передали права");
    console.log(message, room);
    curAdmin = message;
    var adminLabel = document.getElementById('label-admin');
    adminLabel.firstElementChild.id = curAdmin + '-label-admin';
    adminLabel.firstElementChild.innerHTML = "Администратор комнаты: " + curAdmin;

}
    
//действие - исключение
    if (action == 'kick') {
        result = parsedData['message'];
        console.log(result);
        alert("Вы были исключены из комнаты. До окончания конференции вы не можете туда вернуться");
        // btnDisconnectRoom.click();
        // btnDisconnectRoom.style.visibility = 'hidden';
        // btnJoin.style.visibility = "visible";
    }
//действие - проверка на администратора
    if (action == 'check-admin') {
        result = parsedData['message'];
        // var kickBtn;
        clientInfo = result;
        curAdmin = clientInfo[0];
        console.log("ПРИШЕЛ ЧЕК АДМИН");
        var adminLabel = document.getElementById('label-admin');
        adminLabel.firstElementChild.id = curAdmin + '-label-admin';
        console.log(result, clientInfo, result[0]);
        // adminLabel.id = curAdmin + '-label-admin';
        // adminLabel.innerHTML = "Администратор комнаты: " + curAdmin;
        adminLabel.firstElementChild.innerHTML = "Администратор комнаты: " + curAdmin;
        console.log(Object.keys(mapPeers));
        if (!Object.keys(mapPeers).includes(curAdmin) && Object.keys(mapPeers).length != 0) {
            var divChat = document.getElementById('chat');
            divChat.firstElementChild.innerHTML = "Чат";
        } else {

            var divChat = document.getElementById('chat');
            divChat.firstElementChild.innerHTML = "Чат";

        }
        // for (const [key, value] of Object.entries(mapPeers)) {
        //   console.log(Object.keys(mapPeers));
        //   if(!Object.keys(mapPeers).includes(curAdmin) || Object.keys(mapPeers).length == 0){
        //     alert(1);
        //   }
        // }
        //   try {
        //     console.log(clientInfo)
        //     for (const [key, value] of Object.entries(clientInfo)) {
        //       if(value == "1"){
        //         curAdmin = key;     
        //       }
        //     //     for (const key of Object.keys(mapPeers)) {
        //     //   if(key != Object.keys(parsedData["message"])[0]){
        //     //     try{
        //     //       var adminLabel = document.getElementById(Object.keys(parsedData["message"])[0] + "-label-admin");
        //     //       adminLabel.outerHTML = "";
        //     //     } catch {
        //     //       console.log("d222222")
        //     //     }
        //     //   }
        //     // }
        //     // var adminLabel = document.getElementById(Object.keys(parsedData["message"])[0] + "-label-admin");
        //     // console.log(Object.keys(parsedData["message"])[0], "FOUND!!!");
        //     // adminLabel.outerHTML = "";
        // //     while (adminLabel.firstChild) {
        // //       console.log(adminLabel.firstChild);
        // //     adminLabel.removeChild(container.firstChild);
        // // }
        //   }} catch {
        //     console.log(21321);
        //   }
        // if (result[1] == '1'){
        //   console.log("Hello");

        //   // var adminLabelWrapper = document.querySelector("#label-admin");
        //   // if(!adminLabelWrapper.firstElementChild){
        //   // console.log("1", adminLabelWrapper, adminLabelWrapper.firstElementChild);
        //   // var adminLabel = document.createElement("p");
        //   // adminLabel.id = result[0] + '-label-admin';
        //   // adminLabel.innerHTML = "Администратор комнаты: " + result[0];
        //   // adminLabelWrapper.appendChild(adminLabel);
        //   // console.log("2", adminLabelWrapper, adminLabelWrapper.firstElementChild);
        //   // }
        // }
        // // try {
        //   clientInfo[result[0]] = result[1];
        //   // kickBtn = document.getElementById(result[0] + '-btn-kick');
        //   // kickBtn.style.visibility = 'visible';

        // }
        // catch {
        //   console.log("Ошибка");
        // }
        // console.log(clientInfo);
        // console.log("Current admin", curAdmin);
        var adminLabel = document.getElementById('-label-admin');
        // adminLabel.innerHTML = "Администратор комнаты: " + curAdmin;
        // if(result == '0'){
        //   isAdmin = 0;
        // } else{
        //   isAdmin = 1;
        // }
        // console.log("Это админ", isAdmin);
    };
//действие - новый пользователь    
    if (action == 'new-peer') {
        mapChannel[peerUsername] = receiver_channel_name;
        createOfferer(peerUsername, receiver_channel_name);
        // console.log("new-peer");
        return;
    }
//действие - новое предложение    
    if (action == 'new-offer') {
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiver_channel_name);
        // console.log("new-offer");
        return;
    }
//действие - новый ответ
    if (action == 'new-answer') {
        var answer = parsedData['message']['sdp'];
        // console.log("new-answer");
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
        // console.log("Проверка комнаты и сообщение: ", parsedData['message']);
        result = parsedData['message']
        room = parsedData['room']
        var roomCheckContainer = document.querySelector("#roomcheck-container");
        var roomCheckResult = document.createElement('p');
        if (result == '0') {
            // console.log("Комната пуста");
            roomCheckResult.innerHTML = "Комната " + room + " пуста";

        } else {
            // console.log('Комната непуста');
            roomCheckResult.innerHTML = "Комната " + room + " непуста";
        }
        roomCheckContainer.appendChild(roomCheckResult);
        setTimeout(function() {
            roomCheckResult.remove();
        }, 7000);

        // var checkRoom = parsedData[]
    }
//действие - проверка пароля    
    if (action == 'check-pass') {
        // console.log("Wrong pass");
        var result = parsedData['message']
        if (result != '1') {
            alert("Вы ввели неверный пароль");
        }
        // btnJoin.disabled = false;
        // btnJoin.style.visibility = 'visible';
        return;
    }
//действие - отключение
    if (action == 'disconnect') {
        console.log("Пришел дисконнект", parsedData);
        console.log(mapPeers, clientInfo);
        console.log(Object.keys(parsedData['message'])[0]);
        if (clientInfo[0] == Object.keys(parsedData['message'])[0]) {
            clientInfo = [];
            curAdmin = "";
        }
        console.log(parsedData['peer']);
        if (parsedData['peer'] == undefined) {
            for (const [key, value] of Object.entries(mapPeers)) {
                // console.log(key, value[0]);
                value[0].close();
                value[1].close();
                // console.log(value[0].iceConnectionState);
            };
        };
        console.log(parsedData['peer']);
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
            // if (document.getElementById(parsedData['peer'] + '-btn-rtrn')) {
            //   document.getElementById(parsedData['peer'] + '-btn-rtrn').remove();
            // }

        } catch (e) {
            console.log(e);
        }
        //   try {
        //     console.log(clientInfo)
        //     for (const [key, value] of Object.entries(clientInfo)) {
        //       if(value == "1"){
        //         curAdmin = key;     
        //       }
        //     //     for (const key of Object.keys(mapPeers)) {
        //     //   if(key != Object.keys(parsedData["message"])[0]){
        //     //     try{
        //     //       var adminLabel = document.getElementById(Object.keys(parsedData["message"])[0] + "-label-admin");
        //     //       adminLabel.outerHTML = "";
        //     //     } catch {
        //     //       console.log("d222222")
        //     //     }
        //     //   }
        //     // }
        //     // var adminLabel = document.getElementById(Object.keys(parsedData["message"])[0] + "-label-admin");
        //     // console.log(Object.keys(parsedData["message"])[0], "FOUND!!!");
        //     // adminLabel.outerHTML = "";
        // //     while (adminLabel.firstChild) {
        // //       console.log(adminLabel.firstChild);
        // //     adminLabel.removeChild(container.firstChild);
        // // }
        //   }} catch {
        //     console.log(21321);
        //   }
        console.log("Current admin disc", curAdmin);
        // if(curAdmin == Object.keys(parsedData["message"])[0]){
        //   var adminLabel = document.getElementById(Object.keys(parsedData["message"])[0] + "-label-admin");
        //   adminLabel.outerHTML = "";
        // }
        // for (const key of Object.keys(mapPeers)) {
        //       if(key != curAdmin){
        //         try{
        //           var adminLabel = document.getElementById(key + "-label-admin");
        //           adminLabel.outerHTML = "";
        //         } catch {
        //           console.log(111);
        //         }
        //       }
        // }




        //Работает с new-peer
        // btnJoin.disabled = false;
        // btnJoin.style.visibility = 'visible';
        // btnDisconnectRoom.disabled = true;
        // btnDisconnectRoom.style.visibility = 'hidden';


    };

    // console.log("Сообщение от вебсокет 3");
};

//кнопка подключения
btnJoin.addEventListener('click', () => {
    var newClient = new Client()
    username = usernameInput.value;
    room = roomInput.value;
    roomPass = roomPassInput.value;
    var labelUsername = document.querySelector('#label-username');
    newClient.username = labelUsername.innerHTML;
    username = labelUsername.innerHTML;
    // console.log("Нажал кнопку:", username);
    // console.log('Имя польз: ', username, 'комната', room, 'пароль от комнаты', roomPass);
    // clientInfo[newClient.username] = newClient.isAdmin;
    // console.log(clientInfo);
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
    // btnDisconnectRoom.addEventListener('click', () => {
    //   var peer = username;
    //   sendSignal('disconnect', {}, room, roomPass, peer);
    // })
    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;
    var loc = window.location;
    var wsStart = 'wss://';
    if (loc.protocol == 'https') {
        wsStart = 'wss://';
    }
    var endPoint = wsStart + loc.host + loc.pathname;
    // console.log('endPoint: ', endPoint);

    var adminLabelWrapper = document.querySelector("#label-admin");
    if (!adminLabelWrapper.firstElementChild) {
        // console.log("1", adminLabelWrapper, adminLabelWrapper.firstElementChild);
        adminLabel = document.createElement("p");
        adminLabel.id = '-label-admin';
        adminLabel.innerHTML = "Администратор комнаты: ";
        adminLabelWrapper.appendChild(adminLabel);
        console.log("Кнопки установлены", adminLabel);
    }

    if (connection == 0) {
        webSocket = new WebSocket(endPoint);
        webSocket.addEventListener('open', (e) => {
            console.log('Соединение открыто');
            console.log("БАНЫ: ", roomKicked);
            if (roomKicked[room]) {

                console.log("Такая комната есть");

                if (!roomKicked[room].includes(username)) {
                    console.log("On ne v komnate");
                    sendSignal('check-pass', {}, room, roomPass);
                    sendSignal('new-peer', {}, room, roomPass);
                }
            } else {
                console.log("Komnati net");
                sendSignal('check-pass', {}, room, roomPass);
                sendSignal('new-peer', {}, room, roomPass);
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
                            console.log('remote video deleted')
                        }
                    }
                    if (document.getElementsByClassName('remotebutton')) {
                        for (var i = 0; i < document.getElementsByClassName('remotebutton').length; i++) {
                            document.getElementsByClassName('remotebutton')[i].parentNode.remove()
                            console.log('remote button deleted')
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
                var adminLabel = document.getElementById('label-admin');
                adminLabel.innerHTML = "";
            });
            // btnDisconnectRoom = 
        });
        webSocket.addEventListener('message', webSocketOnMessage);
        webSocket.addEventListener('close', (e) => {
            // sendSignal('disconnect', {},)
            console.log('Соединение закрыто');
        });
        webSocket.addEventListener('error', (e) => {
            console.log('Ошибка');
        });
        connection += 1;
    } else {
        console.log("БАНЫ: ", roomKicked);
        if (roomKicked[room]) {
            console.log("Такая комната есть");
            if (!roomKicked[room].includes(username)) {
                console.log("On ne v komnate");
                sendSignal('check-pass', {}, room, roomPass);
                sendSignal('new-peer', {}, room, roomPass);
            }
        } else {
            console.log("Komnati net");
            sendSignal('check-pass', {}, room, roomPass);
            sendSignal('new-peer', {}, room, roomPass);
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
        console.log("userMedia");
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
    // console.log("Отправлено на сервер:", jsonStr);
    webSocket.send(jsonStr);
}

//создание предложения
function createOfferer(peerUsername, receiver_channel_name) {

var ICE_config= {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302',
      'urls': 'stun:stun.webrtcchatsid.ru'
    },
    {
      'urls': 'turn:turn.webrtcchatsid.ru',
      'credential': 'guest',
      'username': 'somepassword'
    },
  ]
}

    // let configuration = {
    //     iceServers: [{
    //         "urls": [
    //             "stun:stun.l.google.com:19302",
    //             "stun:stun.webrtcchatsid.ru",
    //         ]
    //     }]
    // }
    sendSignal('check-admin', {}, room, roomPass, peerUsername);
    var peer = new RTCPeerConnection(ICE_config);
    addLocalTracks(peer);
    console.log("createOfferer");
    var dc = peer.createDataChannel('channel');
    // dc.onopen = () => {
    //    dc.send('Hello3123213!');
    //  };
    dc.onmessage = (event) => {
        // console.log(event.data);
    }
    dc.addEventListener('open', () => {
        console.log("Открылся канал данных");
    });
    dc.addEventListener('message', dcOnMessage.bind(null, peer));
    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);
    var peerAudioBtn = document.getElementById(peerUsername + '-btn-audio');
    peerAudioBtn.addEventListener('click', () => {
        console.log("Check audio: ", remoteVideo.srcObject.getTracks()[0].enabled);
        remoteVideo.srcObject.getTracks()[0].enabled = !remoteVideo.srcObject.getTracks()[0].enabled;
        if (remoteVideo.srcObject.getTracks()[0].enabled) {
            peerAudioBtn.innerHTML = 'Выключить аудио ' + peerUsername;
            return;
        }
        peerAudioBtn.innerHTML = 'Включить аудио ' + peerUsername;
    });
    var peerVideoBtn = document.getElementById(peerUsername + '-btn-video');
    console.log(peerVideoBtn);
    peerVideoBtn.addEventListener('click', () => {
        console.log(remoteVideo.srcObject.getTracks()[1].enabled);
        remoteVideo.srcObject.getTracks()[1].enabled = !remoteVideo.srcObject.getTracks()[1].enabled;
        if (remoteVideo.srcObject.getTracks()[1].enabled) {
            peerVideoBtn.innerHTML = 'Выключить видео ' + peerUsername;
            return;
        }
        peerVideoBtn.innerHTML = 'Включить видео ' + peerUsername;
    });
    var peerHoldBtn = document.getElementById(peerUsername + '-btn-hold');
    console.log(peerHoldBtn);
    mapPeers[peerUsername] = [peer, dc];
    // var gg = true;
    peerHoldBtn.addEventListener('click', () => {
        console.log(peerHoldBtn.textContent.charAt(0));
        if (peerHoldBtn.textContent.charAt(0) == 'П') {
            var btnSendMsg = document.querySelector('#btn-send-msg');
            var messageList = document.querySelector("#message-list");
            var messageInput = document.querySelector('#msg');
            messageInput.value = 'hold ' + peerUsername;
            btnSendMsg.click();
            messageInput.value = '';
            var videoContainer = document.getElementById('video-container');
            var returnBtn = document.createElement('button');
            returnBtn.id = peerUsername + '-btn-rtrn';
            returnBtn.textContent = "Вернуть " + peerUsername;
            videoContainer.appendChild(returnBtn);
            returnBtn.addEventListener('click', () => {
                var btnSendMsg = document.querySelector('#btn-send-msg');
                var messageList = document.querySelector("#message-list");
                var messageInput = document.querySelector('#msg');
                messageInput.value = 'unhold ' + peerUsername;
                btnSendMsg.click();
                messageInput.value = "";
                // createOfferer(peerUsername, mapChannel[peerUsername]);
                returnBtn.remove();
            });
            // peerHoldBtn.textContent = "Вернуть пользователя " + peerUsername;
        }
        // console.log(String(mapPeers[peerUsername][0].currentLocalDescription['sdp']).includes('sendrecv'));

        // console.log(remoteVideo.srcObject.getTracks()[0].enabled, remoteVideo.srcObject.getTracks()[1].enabled);
        // remoteVideo.srcObject.getTracks()[0].enabled = !remoteVideo.srcObject.getTracks()[0].enabled;
        // remoteVideo.srcObject.getTracks()[1].enabled = !remoteVideo.srcObject.getTracks()[1].enabled;


        // for (const [key, value] of Object.entries(mapPeers)) {
        //         if(peerUsername == key){

        //           mapPeers[key][0].close();
        //           // mapPeers[key][1].close();

        //         }
        //       }
        // var videoContainer = document.getElementById('video-container');
        // var returnBtn = document.createElement('button');
        // returnBtn.id = peerUsername + '-btn-rtrn';
        // returnBtn.textContent = "Вернуть " + peerUsername;
        // videoContainer.appendChild(returnBtn);
        // returnBtn.addEventListener('click', () => {
        //   createOfferer(peerUsername, mapChannel[peerUsername]);
        //   returnBtn.remove();
        // });
    });
//кнопка исключения пользователя    
    var peerKickBtn = document.getElementById(peerUsername + "-btn-kick");
    peerKickBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'kick ' + peerUsername;
        console.log(peerUsername, room);
        if (roomKicked[room]) {
            roomKicked[room].push(peerUsername);
        } else {
            roomKicked[room] = [peerUsername];
        };
        sendSignal('kick', {
            'peer': peerUsername
        }, room, roomPass);
        console.log("Исключенные: ", roomKicked);
        btnSendMsg.click();
        messageInput.value = '';

    });

    var passAdminBtn = document.getElementById(peerUsername + "-btn-pass-admin");
    passAdminBtn.addEventListener('click', () => {
        console.log("СЛУШАТЕЛЬ");
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'pass ' + peerUsername;
        console.log(peerUsername, room);
        // if (roomKicked[room]) {
        //     roomKicked[room].push(peerUsername);
        // } else {
        //     roomKicked[room] = [peerUsername];
        // };
        sendSignal('passAdmin', {
            'peer': peerUsername
        }, room, roomPass);
        console.log("Pass admin: ", peerUsername);
        btnSendMsg.click();
        messageInput.value = '';

    });
    // mapPeers[peerUsername][1].close();
    // var peer = new RTCPeerConnection(null);
    // addLocalTracks(peer);
    // var dc = peer.createDataChannel('channel');
    // dc.onmessage = (event) => {
    // // console.log(event.data);
    // }
    // dc.addEventListener('open', () => {
    // console.log("Открылся канал данных");
    // });
    // dc.addEventListener('message', dcOnMessage.bind(null, peer));
    // var remoteVideo = createVideo(peerUsername);
    // console.log(peer);
    // setOnTrack(peer, remoteVideo);
    // // console.log(JSON.stringify(peer.localDescription['sdp'], null, 2));
    // console.log()
    // let temp = peer.localDescription;
    // let newStr = mapPeers[peerUsername][0].currentLocalDescription['sdp'].replace(/sendrecv/g, 'sendonly');
    // // console.log(newStr);
    // // temp['sdp'] = newStr;
    // // console.log()
    // // sendSignal('new-offer', {
    // // 'sdp': temp,
    // // 'receiver_channel_name': receiver_channel_name
    // // },
    // // room,
    // // roomPass);
    // peer.createOffer()
    // .then(o => peer.setLocalDescription(o))
    // .then(() => {
    // console.log('Local description set success');
    // });


    // mapPeers[peerUsername][1].close();
    // var peer = new RTCPeerConnection(null);
    // addLocalTracks(peer);
    // var dc = peer.createDataChannel('channel');
    // dc.onmessage = (event) => {
    // // console.log(event.data);
    // }
    // dc.addEventListener('open', () => {
    // console.log("Открылся канал данных");
    // });
    // dc.addEventListener('message', dcOnMessage.bind(null, peer));
    // var remoteVideo = createVideo(peerUsername);
    // console.log(peer);
    // setOnTrack(peer, remoteVideo);
    // // console.log(JSON.stringify(peer.localDescription['sdp'], null, 2));
    // console.log()
    // let temp = peer.localDescription;
    // let newStr = mapPeers[peerUsername][0].currentLocalDescription['sdp'].replace(/sendonly/g, 'sendrecv');
    // // console.log(newStr);
    // // temp['sdp'] = newStr;
    // // console.log()
    // // sendSignal('new-offer', {
    // // 'sdp': temp,
    // // 'receiver_channel_name': receiver_channel_name
    // // },
    // // room,
    // // roomPass);
    // peer.createOffer()
    // .then(o => peer.setLocalDescription(o))
    // .then(() => {
    // console.log('Local description set success');
    // });

    // if(remoteVideo.srcObject.getTracks()[1].enabled){
    // peerVideoBtn.innerHTML = 'Выключить видео ' + peerUsername;
    // return;
    // }
    // peerVideoBtn.innerHTML = 'Включить видео ' + peerUsername;
    // });
//слушатель изменения ICE    
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];
            console.log('Дисконнект');
            sendSignal('disconnect', {}, room, roomPass);
            if (iceConnectionState != 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
            // btnDisconnectRoom.disabled = true;
            // btnDisconnectRoom.style.visibility = 'hidden';

        }
    });
    console.log("Листенер отключения пира");
    mapPeers[peerUsername][1].addEventListener('close', () => {
        delete mapPeers[peerUsername];
        console.log("Листенер отключения пира");
        removeVideo(remoteVideo);
    });
    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            //console.log("new ice cand", JSON.stringify(peer.localDescription));
            return;
        }
        // console.log(JSON.stringify(peer.localDescription['sdp'], null, 2));
        // let temp = peer.localDescription;
        // let newStr = peer.localDescription['sdp'].replace(/sendrecv/g, 'sendonly');
        // console.log(newStr);
        // temp['sdp'] = newStr;
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
    var ICE_config= {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302',
      'urls': 'stun:stun.webrtcchatsid.ru'
    },
    {
      'urls': 'turn:turn.webrtcchatsid.ru',
      'username': 'guest',
      'credential': 'somepassword'
    },
  ]
}
    let configuration = {
        iceServers: [{
            "urls": [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302"
            ]
        }]
    }
    var peer = new RTCPeerConnection(ICE_config);
    addLocalTracks(peer);
    console.log("createAnswerer");
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
    // btnToggleAudio.addEventListener('click', () => {
    // audioTracks[0].enabled = !audioTracks[0].enabled;
    // if(audioTracks[0].enabled){
    // btnToggleAudio.innerHTML = 'Audio Mute';
    // return;
    // }
    // btnToggleAudio.innerHTML = 'Audio Unmute';
    // });
    var peerVideoBtn = document.getElementById(peerUsername + '-btn-video');
    console.log(peerVideoBtn);
    peerVideoBtn.addEventListener('click', () => {
        console.log(remoteVideo.srcObject.getTracks()[1].enabled);
        remoteVideo.srcObject.getTracks()[1].enabled = !remoteVideo.srcObject.getTracks()[1].enabled;
        if (remoteVideo.srcObject.getTracks()[1].enabled) {
            peerVideoBtn.innerHTML = 'Выключить видео ' + peerUsername;
            return;
        }
        peerVideoBtn.innerHTML = 'Включить видео ' + peerUsername;
    });

    var peerHoldBtn = document.getElementById(peerUsername + '-btn-hold');
    console.log(peerHoldBtn);
    // var gg = true;
    peerHoldBtn.addEventListener('click', () => {
        console.log(peerHoldBtn.textContent.charAt(0));
        if (peerHoldBtn.textContent.charAt(0) == 'П') {
            var btnSendMsg = document.querySelector('#btn-send-msg');
            var messageList = document.querySelector("#message-list");
            var messageInput = document.querySelector('#msg');
            messageInput.value = 'hold ' + peerUsername;
            btnSendMsg.click();
            messageInput.value = '';
            
            // peerHoldBtn.textContent = "Вернуть пользователя " + peerUsername;
        }});


    var peerKickBtn = document.getElementById(peerUsername + "-btn-kick");
    peerKickBtn.addEventListener('click', () => {
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'kick ' + peerUsername;
        console.log(peerUsername, room);
        if (roomKicked[room]) {
            roomKicked[room].push(peerUsername);
        } else {
            roomKicked[room] = [peerUsername];
        };
        sendSignal('kick', {
            'peer': peerUsername
        }, room, roomPass);
        console.log("Исключенные: ", roomKicked);
        btnSendMsg.click();
        messageInput.value = '';

    });



    var passAdminBtn = document.getElementById(peerUsername + "-btn-pass-admin");
    passAdminBtn.addEventListener('click', () => {
        console.log("СЛУШАТЕЛЬ");
        var btnSendMsg = document.querySelector('#btn-send-msg');
        var messageList = document.querySelector("#message-list");
        var messageInput = document.querySelector('#msg');
        messageInput.value = 'pass ' + peerUsername;
        console.log(peerUsername, room);
        // if (roomKicked[room]) {
        //     roomKicked[room].push(peerUsername);
        // } else {
        //     roomKicked[room] = [peerUsername];
        // };
        sendSignal('passAdmin', {
            'peer': peerUsername
        }, room, roomPass);
        console.log("Pass admin: ", peerUsername);
        btnSendMsg.click();
        messageInput.value = '';

    });



    //  peer.ondatachannel = (event) => {
    //    const { channel } = event;
    // //   channel.binaryType = 'arraybuffer';
    //    channel.onmessage = (event) => {
    //      const { data } = event;
    //      try {
    //        const blob = new Blob([data]);
    //        downloadFile(blob, channel.label);

    //      } catch (err) {
    //        console.log('File transfer failed');
    //      }

    //    }
    //  };
    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log("Соединение открыто");
        });
        peer.dc.addEventListener('message', dcOnMessage.bind(null, peer));
        mapPeers[peerUsername] = [peer, peer.dc];
        if (!roomsList.includes(room)) {
            roomsList.push(room);
        }
        console.log(roomsList);
        console.log("Листенер отключения пира");
        peer.dc.addEventListener('close', () => {
            delete mapPeers[peerUsername];
            console.log("Листенер отключения пира");
            removeVideo(remoteVideo);
        });
    });
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];

            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);

        };

    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            //console.log("new ice cand", JSON.stringify(peer.localDescription));
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
// let promise = new Promise((resolve, reject) => {
//  arrayBuffer = file.arrayBuffer();
//  resolve(arrayBuffer);
// });

//конвертация файла в массив
async function fileToArray(file) {
    console.log("fileToArray 1", file, file.arrayBuffer());
    // var bufferPromise = file.arrayBuffer();
    // const buf = await file.arrayBuffer();
    // var buffer = await file.arrayBuffer();
    const arrayBuffer = await file.arrayBuffer();
    // console.log(buf);
    return arrayBuffer;
    // buf.then((result) => return result)
    // console.log("2", arrayBuffer);

};
var channelLabel;
//функция отправки файла
const shareFile = () => {
    console.log("Отправка файла");
    if (file) {
        channelLabel = file.name;
        for (const [key, value] of Object.entries(mapPeers)) {
            //mapVideo[value[0]] =
            const channel = value[1];
            console.log(channel);
            channel.binaryType = 'arraybuffer';
            let inf = fileToArray(file);
            console.log("fileToArray 3", inf);
            // inf = file.arrayBuffer();
            // inf.then((buf) => {
            // for (let i = 0; i < buf.byteLength; i += MAXIMUM_MESSAGE_SIZE) {
            // console.log(buf.slice(i, i + MAXIMUM_MESSAGE_SIZE));
            // channel.send(buf.slice(i, i + MAXIMUM_MESSAGE_SIZE));
            // }
            inf.then(buf => {
                channel.send(channelLabel + '1azs');
                channel.send(buf);
            });

            // var buffer = await file.arrayBuffer();
            // channel.send(END_OF_FILE_MESSAGE);

            // channel.send(END_OF_FILE_MESSAGE);
            // const arrayBuffer = file.arrayBuffer();
            //   async () => {
            //   const arrayBuffer = await file.arrayBuffer();
            //   channel.send(arrayBuffer);
            // }
            // channel.send(inf);
            console.log('Отправлено!');
            channel.onclose = () => {
                closeDialog();
            };
        }


    } else {
        console.log('Нет файла');
    }


};
//   const channel = peerConnection.createDataChannel(channelLabel);
//   channel.binaryType = 'arraybuffer';
//   channel.onopen = async () => {
//     const arrayBuffer = await file.arrayBuffer();
//     channel.send(arrayBuffer);
//   }
//   channel.onclose = () => {
//     closeDialog();
//   };
// }
// };

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
    console.log("addLocalTracks");
    return;
}
var receivedBuffers = [];

var fileName;

//канал данных на сообщения
function dcOnMessage(peer, event) {
    console.log('DConMessage', event.data);
    var message = event.data;
    // var li = document.createElement('li');
    // li.appendChild(document.createTextNode(message));
    // messageList.appendChild(li);
    // if (typeof message === "string" && message != 'EOF'){
    // console.log('message!');
    // var li = document.createElement('li');
    // li.appendChild(document.createTextNode(message));
    // messageList.appendChild(li);
    // } else {
    // console.log(event);
    // // const receivedBuffers = [];
    // const { data } = event;
    // console.log(data)
    // try {
    // if (data !== END_OF_FILE_MESSAGE) {
    // console.log('push');
    // receivedBuffers.push(data);
    // console.log(receivedBuffers);
    // } else {
    // console.log('reduce');
    // console.log('receivedBuffers: ', receivedBuffers);
    // const arrayBuffer = receivedBuffers.reduce((acc, arrayBuffer) => {
    // console.log(acc, arrayBuffer);
    // //       const blobToBinary = async (blob) => {
    // //   const buffer = await blob.arrayBuffer();

    // //   const view = new Int8Array(buffer);

    // //   return [...view].map((n) => n.toString(2)).join(' ');
    // // };
    // // const blob = new Blob(["Example"], { type: "text/plain" });
    // // blobToBinary(arrayBuffer).then(console.log);
    // const tmp = new Uint8Array(acc.byteLength + arrayBuffer.size);
    // console.log(tmp);
    // tmp.set(new Uint8Array(acc), 0);
    // console.log(tmp, new Uint8Array(arrayBuffer), arrayBuffer.arrayBuffer());
    // let inf2 = test(arrayBuffer);
    // inf2.then((buf) => {
    // console.log(buf);
    // tmp.set(new Uint8Array(buf), acc.byteLength);
    // });
    // // arrayBuffer.arrayBuffer().then((result) => {
    // //   console.log(result);
    // //   tmp.set(new Uint8Array(result), acc.byteLength);}
    // //   );
    // // tmp.set(new Uint8Array(arrayBuffer), acc.byteLength);
    // console.log(tmp);
    // return tmp;
    // }, new Uint8Array());
    // console.log(arrayBuffer);

    // const blob = new Blob([arrayBuffer]);
    // downloadFile(blob, event.explicitOriginalTarget.label);
    // receivedBuffers = []



    // }
//пришел файл
    if (typeof message === 'string') {
        if (message.substr(-4) == '1azs') {
            fileName = message;
            fileName = fileName.substring(0, fileName.length - 4);
            return;
        };
    };

//пришла строка
    if (typeof message === 'string') {
        console.log('message!');
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(message));
        messageList.appendChild(li);
    } else {
        console.log(event, fileName);
        const {
            data
        } = event;
        try {
            const blob = new Blob([data]);
            downloadFile(blob, fileName);
        } catch (err) {
            console.log('File transfer failed');
        }
        //  peer.ondatachannel = (event) => {
        //   const { channel } = event;
        //   channel.binaryType = 'arraybuffer';
        //   channel.onmessage = (event) => {
        //     const { data } = event;
        //     try {
        //       const blob = new Blob([data]);
        //       downloadFile(blob, event.label);

        //     } catch (err) {
        //       console.log('File transfer failed');
        //     }

        //   }
        // }
    }
};
// };
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
    // kickBtn.style.visibility = 'hidden';
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
    console.log(remoteStream);
    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
    console.log(peer, remoteStream);
    // var peerAudioBtn = 
    // audioBtn.addEventListener('click', () => {
    // videoTracks[0].enabled = !videoTracks[0].enabled;
    // if(videoTracks[0].enabled){
    // btnToggleVideo.innerHTML = 'Video Off';
    // return;
    // }
    // btnToggleVideo.innerHTML = 'Video On';
    // });
    mapVideo[peer] = remoteStream;

}
//удаление видео
function removeVideo(video) {
    console.log(video);
    var videoWrapper = video.parentNode;
    // console.log(video.parentNode, videoWrapper.nextElementSibling.firstChild, videoWrapper.nextElementSibling.lastChild);

    if (videoWrapper.parentNode) {
        videoWrapper.parentNode.removeChild(videoWrapper.parentNode.children[4])
        videoWrapper.parentNode.removeChild(videoWrapper);

    };
}
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
                console.log('kick');
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToKick = messageWithoutSpaces.substring(4);
                console.log(usernameToKick);
                if (username == curAdmin) {
                    console.log('kick by admin');
                    sendSignal('kick', {
                        'peer': usernameToKick
                    }, room, '0');
                    for (const [key, value] of Object.entries(mapPeers)) {
                        if (usernameToKick == key) {
                            mapPeers[key][0].close();
                            mapPeers[key][1].close();
                        }
                        return;

                    }
                }
            }
            if (firstFour == 'pass') {
                console.log('pass');
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToPass = messageWithoutSpaces.substring(4);
                console.log(usernameToPass);
                if (username == curAdmin) {
                    console.log('pass by admin');
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
                console.log(usernameToHold);

                if (username == curAdmin) {
                    console.log('hold by admin');
                    console.log(mapPeers)
                    for (const [key, value] of Object.entries(mapPeers)) {
                        console.log(mapChannel[usernameToHold]);
                        console.log([key, value])
                        sendSignal('onhold', {
                            'peer': usernameToHold
                        }, room, '0');
                        if (usernameToHold == key) {
                            console.log(mapPeers[key][0], mapPeers[key][1])

                            // mapPeers[key][0].close();
                            // mapPeers[key][1].close();

                        }
                        var videoContainer = document.getElementById('video-container');
                        var returnBtn = document.createElement('button');
                        returnBtn.id = peerUsername + '-btn-rtrn';
                        returnBtn.textContent = "Вернуть " + peerUsername;
                        videoContainer.appendChild(returnBtn);
                        returnBtn.addEventListener('click', () => {
                            var btnSendMsg = document.querySelector('#btn-send-msg');
                            var messageList = document.querySelector("#message-list");
                            var messageInput = document.querySelector('#msg');
                            messageInput.value = 'unhold ' + peerUsername;
                            btnSendMsg.click();
                            messageInput.value = "";
                            // createOfferer(peerUsername, mapChannel[peerUsername]);
                            returnBtn.remove();
                        });
                    }
                    return;
                }
            }
            //снятие удержания с пользователя
            if (firstSix == 'unhold') {
                console.log('unhold');
                var messageWithoutSpaces = message.replace(/ /g, '')
                var usernameToUnhold = messageWithoutSpaces.substring(6);
                console.log(usernameToUnhold);
                if (username == curAdmin) {
                    console.log('unhold by admin');
                    // createOfferer(usernameToUnhold, mapChannel[usernameToUnhold]);
                    sendSignal('unhold', {
                        'peer': usernameToUnhold
                    }, room, '0');
                }
                return;
            }
        } catch {
            console.log('1111');
        }
        if (!message.includes('kick')){
        var li = document.createElement('li');
        li.appendChild(document.createTextNode('Я: ' + message));
        messageList.appendChild(li);
        console.log("Сообщение");
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
    console.log("Кнопку нажали");
    if (!displayMediaStream) {
        displayMediaStream = await navigator.mediaDevices.getDisplayMedia();
        console.log("2221");
    }
    console.log(displayMediaStream.getTracks());
    console.log(mapPeers);
    for (const [key, value] of Object.entries(mapPeers)) {
        //mapVideo[value[0]] =
        console.log(key, value[0], value[1]);
        console.log(value[0].getSenders().find(sender =>
            sender.track.kind === 'video'));
        value[0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
        console.log("REPLACED!");
    };
    try {
        console.log(mapPeers['qwer'][0].getSenders());
        mapPeers['qwer'][0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    } catch (e) {
        console.log(e);
    }
    try {
        console.log(mapPeers['123'][0].getSenders());
        mapPeers['123'][0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    } catch (e) {
        console.log(e);
    }
    //mapPeers.forEach(element => element[0].replaceTrack(displayMediaStream.getTracks()[0]));
    //mapPeers.forEach(element => element[0].replaceTrack(displayMediaStream.getTracks()[0]));
    //senders.find(sender => sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);
    //show what you are showing in your "self-view" video.
    console.log(document.getElementById('local-video').srcObject);
    document.getElementById('local-video').srcObject = displayMediaStream;
    //hide the share button and display the "stop-sharing" one
    console.log(document.getElementById('local-video').srcObject);
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
    console.log(document.getElementById('local-video').srcObject);
    for (const [key, value] of Object.entries(mapPeers)) {
        console.log(mapVideo[value[0]].getTracks()[1]);
        console.log(value[0].getSenders().find(sender =>
            sender.track.kind === 'video'), mapVideo[value[0]].getTracks().find(track => track.kind === 'video'));
        value[0].getSenders().find(sender =>
            sender.track.kind === 'video').replaceTrack(mapVideo[value[0]].getTracks().find(track => track.kind === 'video'));
    };

    //    senders.find(sender => sender.track.kind === 'video')
    //      .replaceTrack(userMedia.getTracks().find(track => track.kind === 'video'));
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