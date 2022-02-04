import json
import pprint

from asgiref.sync import sync_to_async
from channels.exceptions import StopConsumer
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.template.loader import render_to_string
from .tokens import account_activation_token
from django.contrib.auth.models import User
from django.core.mail import EmailMessage

roomsDict = {}
usersInRoom = {}
usersChannels = {}
objectsInRoom = {}
kickedRoom = {}

pp = pprint.PrettyPrinter(indent=4)


# получить всех пользователей
@sync_to_async
def get_all_users():
    return list(User.objects.all())


# получить профиль
@sync_to_async
def get_profile(user):
    return user.profile


# заполнить кандидата
@sync_to_async
def fill_candidate(profile, hash_ice):
    profile.ice_candidates_temp = hash_ice
    return profile


# сохранить профиль
@sync_to_async
def save_profile(profile):
    profile.save()
    return profile


# класс потребителя
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):  # функция соединения
        self.room_group_name = 'Test-Room'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        self.user = self.scope["user"]
        print(self.user)
        self.user_room_name = "notif_room_for_user_"+str(self.user) ##Notification room name
        await self.channel_layer.group_add(
               self.user_room_name,
               self.channel_name
            )

        print(self.channel_layer, dir(self.channel_layer), self.channel_layer.groups)



        await self.accept()

    async def disconnect(self, close_code):  # функция отключения
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        try:
            user = usersChannels[self.channel_name]
            for usersList in usersInRoom.values():  # удаление пользователей из списков
                if user in usersList:
                    usersList.remove(user)
                if user + "_roomadmin" in usersList:
                    usersList.remove(user + "_roomadmin")
        except KeyError:
            print(KeyError)

        for key, value in list(usersInRoom.items()):  # удаление комнат
            if len(value) == 0:
                usersInRoom.pop(key)

        for objectsList in objectsInRoom.values():  # удаление объектов
            if self in objectsList:
                objectsList.remove(self)

        for key, value in list(objectsInRoom.items()):  # удаление комнат
            if len(value) == 0:
                objectsInRoom.pop(key)

        raise StopConsumer()

    async def receive(self, text_data):  # функция получения сигнала
        receive_dict = json.loads(text_data)  # полученные данные
        message = receive_dict['message']  # сообщение
        action = receive_dict['action']  # действие
        room = receive_dict['room']  # комната
        username = "test"
        try:
            roompass = receive_dict['roomPass']  # пароль от комнаты
            username = receive_dict['peer']  # имя пользователя
        except KeyError:
            pass

        print(self.channel_layer, self.channel_layer.groups)    


        print(receive_dict)

        if action == 'new-answer' or action == 'new-offer':  # защита по ICE
            all_users = await get_all_users()
            profile = ""
            for i in all_users:
                if username == i.username:
                    user = i
                    profile = await get_profile(i)
            sdp = message['sdp']['sdp'].split('\n')
            sdp_list = []
            d = 0
            for i in sdp:
                if 'a=candidate' in i:
                    i = i.split()
                    i = i[:4]
                    i = "".join(i)
                    sdp_list.append(i)
                    d += 1
                if d == 1:
                    break
            sdp_list = tuple(sdp_list)
            sdp_list = hash(sdp_list)
            profile = await fill_candidate(profile, sdp_list)
            profile = await save_profile(profile)
            if str(sdp_list) != profile.ice_candidates:  # если кандидаты не равны
                print('not equal')
                if profile.first_ice:  # если зашли впервые
                    profile.first_ice = False
                    profile = await save_profile(profile)
                else:  # отправить письмо с проверкой
                    receiver_channel_name = receive_dict['message']['receiver_channel_name']
                    await self.channel_layer.send(
                        list(usersChannels.keys())[list(usersChannels.values()).index(username)],
                        {
                            'type': 'channel_message',
                            'action': 'wrong_ice',
                            'room': 'room',
                            'message': {username: '1'},
                        }
                    )
                    current_site = self.scope['headers'][0][1].decode()
                    mail_subject = 'Обновите ваши данные.'
                    message = render_to_string('chat/acc_active_ice.html', {
                        'user': user,
                        'domain': current_site,
                        'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                        'token': account_activation_token.make_token(user),
                    })
                    to_email = user.email
                    email = EmailMessage(
                        mail_subject, message, to=[to_email]
                    )
                    email.content_subtype = 'html'
                    email.send()
                    return
        print('1')
        if action != 'disconnect':
            try:  # проверка пользователя на исключение
                if kickedRoom[room]:
                    for i in kickedRoom[room]:
                        if i in usersInRoom[room]:
                            return
            except KeyError:
                print(KeyError)

        


        if room not in [a for a in roomsDict.keys()]:  # словарь комнат с паролями
            if action != 'check-room' and action != 'check-admin' and action != 'onhold':
                roomsDict[room] = roompass

        print(roomsDict)        

        if action == 'kick':  # при исключении
            username = message['peer']
            try:
                kickedRoom[room].append(username)
            except KeyError:
                kickedRoom[room] = [username]

            await self.channel_layer.send(
                list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])],
                {
                    "type": 'channel_message',
                    'action': 'kick',
                    'room': room,
                    'message': {username: '1'}
                }
            )

        print('2')

        if action == 'pass':  # при передаче прав админа пользователю
            curadmin = username
            newadmin = message['peer']
            newadminind = usersInRoom[room].index(newadmin)
            usersInRoom[room].append(newadmin + "_roomadmin")
            del usersInRoom[room][newadminind]
            usersInRoom[room].append(curadmin)
            oldadminind = usersInRoom[room].index(curadmin + "_roomadmin")
            del usersInRoom[room][oldadminind]
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'channel_message',
                    'action': 'pass-admin',
                    'room': room,
                    'message': newadmin,
                }
            )
            return



        if action == 'check-room':  # при проверке комнаты
            receive_dict['message']['receiver_channel_name'] = self.channel_name
            print(self.channel_layer.channels)
            if room in [a for a in roomsDict.keys()]:
                await self.channel_layer.group_send(
                    self.user_room_name,
                    {
                        'type': 'channel_message',
                        'action': 'check-room',
                        'room': room,
                        'message': '1'
                    }
                )
                return
            else:
                await self.channel_layer.group_send(
                    self.user_room_name,
                    {
                        'type': 'channel_message',
                        'action': 'check-room',
                        'room': room,
                        'message': '0'
                    }
                )
                return    

        # if action == 'check-room':  # при проверке комнаты
        #     receive_dict['message']['receiver_channel_name'] = self.channel_name
        #     print(self.channel_layer.channels)
        #     if room in [a for a in roomsDict.keys()]:
        #         await self.channel_layer.send(
        #             self.channel_name,
        #             {
        #                 'type': 'channel_message',
        #                 'action': 'check-room',
        #                 'room': room,
        #                 'message': '1'
        #             }
        #         )
        #         return
        #     else:
        #         await self.channel_layer.send(
        #             self.channel_name,
        #             {
        #                 'type': 'channel_message',
        #                 'action': 'check-room',
        #                 'room': room,
        #                 'message': '0'
        #             }
        #         )
        #         return
        print('3')

        if action == 'check-admin':  # проверка на администратора
            try:
                if usersInRoom[room]:
                    users = usersInRoom[room]
                    for user in users:
                        if "_roomadmin" in user:
                            try:
                                if self in objectsInRoom[room]:
                                    await self.channel_layer.group_send(
                                        self.room_group_name,
                                        {
                                            'type': 'channel_message',
                                            'action': 'check-admin',
                                            'room': room,
                                            'message': [user[:-10], '1'],
                                        }
                                    )
                                    return
                                else:
                                    if self in objectsInRoom[room]:
                                        for i in objectsInRoom[room]:
                                            if i != self:
                                                await i.channel_layer.group_send(
                                                    i.room_group_name,
                                                    {
                                                        'type': 'channel_message',
                                                        'action': 'check-admin',
                                                        'room': room,
                                                        'message': [user[:-10], '1'],
                                                    }
                                                )
                                        return
                            except KeyError:
                                pass
            except KeyError:
                pass

        try:  # добавляем пользователя в usersChannels
            if list(usersChannels.keys())[list(usersChannels.values()).index(username)]:
                pass
        except ValueError:
            usersChannels[self.channel_name] = username
        print(3.5)

        if action == "check-pass":  # проверка пароля
            if room in [a for a in roomsDict.keys()]:
                if roompass == roomsDict[room]:
                    if self.room_group_name != room:
                        print(3.6)
                        await self.channel_layer.group_discard(
                            self.room_group_name,
                            self.channel_name
                        )
                        self.room_group_name = room
                        await self.channel_layer.group_add(
                            self.room_group_name,
                            self.channel_name

                        )
                        self.room_group_name = room
            peer = receive_dict['peer']
            print(3.7)
            if room in [a for a in roomsDict.keys()]:
                if roompass != roomsDict[room]:
                    await self.channel_layer.send(
                        list(usersChannels.keys())[list(usersChannels.values()).index(peer)],
                        {
                            'type': 'channel.message',
                            'action': 'check-pass',
                            'room': room,
                            'message': '0'
                        }
                    )
                    return
                else:
                    print(3.8)
                    print(list(usersChannels.keys())[list(usersChannels.values()).index(peer)])
                    await self.channel_layer.send(
                        list(usersChannels.keys())[list(usersChannels.values()).index(peer)],
                        {
                            'type': 'channel.message',
                            'action': 'check-pass',
                            'room': room,
                            'message': [roompass, '1'],
                        }
                    )
                    print(3.9)

                    return
        print('4')            

        if action == 'new-offer' or action == 'new-answer':  # новое предложение / новый ответ
            try:
                if kickedRoom[room]:
                    for i in kickedRoom[room]:
                        if i in usersInRoom[room]:
                            return
                        else:
                            receiver_channel_name = receive_dict['message']['receiver_channel_name']
                            receive_dict['message']['receiver_channel_name'] = self.channel_name
                            await self.channel_layer.send(
                                receiver_channel_name,
                                {
                                    'type': 'send.sdp',
                                    'receive_dict': receive_dict
                                }
                            )
                            return
            except KeyError:
                receiver_channel_name = receive_dict['message']['receiver_channel_name']
                receive_dict['message']['receiver_channel_name'] = self.channel_name
                await self.channel_layer.send(
                    receiver_channel_name,
                    {
                        'type': 'send.sdp',
                        'receive_dict': receive_dict
                    }
                )
                return

        receive_dict['message']['receiver_channel_name'] = self.channel_name
        if action != 'check-admin' and action != "onhold" and action != "kick" and action != "pass":  # обмен SDP
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send.sdp',
                    'receive_dict': receive_dict
                }
            )

        if action == 'onhold':  # поставили на удержание
            print(list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
            await self.channel_layer.send(
                list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])],
                {
                    'type': 'channel_message',
                    'action': 'onhold',
                    'room': 'room',
                    'message': {message['peer']: '1'},
                }
            )
            return

        # if action == 'unhold':  # убрали с удержания
        #     print("UNHOLD!!!!")
        #     print(dir(self.channel_layer), self.channel_layer.groups)
        #     print(self.channel_layer, self.channel_name, self.channel_layer.channels, list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
        #     print(self.channel_layer.groups["notif_room_for_user_"+message['peer']])
        #     await self.channel_layer.group_send(
        #         "notif_room_for_user_"+message['peer'],
        #         {
        #             'type': 'channel_message',
        #             'action': 'unhold',
        #             'room': 'room',
        #             'message': {message['peer']: '1'},
        #         }
        #     )
        #     return    

        if action == 'unhold':  # убрали с удержания
            print("UNHOLD!!!!")
            print(list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
            print(dir(self.channel_layer))
            print(self.channel_layer, self.channel_name, self.channel_layer.channels, list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
            await self.channel_layer.send(
                list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])],
                {
                    'type': 'channel_message',
                    'action': 'unhold',
                    'room': 'room',
                    'message': {message['peer']: '1'},
                }
            )
            return
        print('5')    

        if action != 'check-admin':  # добавление объектов в комнату
            if objectsInRoom.get(room) is None:
                objectsInRoom[room] = objectsInRoom.get(room, []) + [self]
            else:
                if self not in objectsInRoom.get(room, []):
                    objectsInRoom[room] = objectsInRoom.get(room, []) + [self]

        if action != 'disconnect' and action != 'check-admin':  # добавление пользователей в комнату
            if usersInRoom.get(room) is None:
                usersInRoom[room] = usersInRoom.get(room, []) + [username + "_roomadmin"]
            else:
                if username not in usersInRoom.get(room, []) and username + "_roomadmin" not in usersInRoom.get(room,                                                                                                               []):
                    usersInRoom[room] = usersInRoom.get(room, []) + [username]

        if action == 'disconnect':  # отключение пользователя
            try:
                for roomUser in usersInRoom[room]:
                    if username + "_roomadmin" == roomUser:
                        usersInRoom.get(room).remove(username + '_roomadmin')
                        if len(usersInRoom.get(room)) > 0:
                            firstuser = usersInRoom.get(room)[0]
                            firstuser = firstuser + '_roomadmin'
                            usersInRoom.get(room).pop(0)
                            usersInRoom.get(room).append(firstuser)
                        if len(usersInRoom.get(room)) == 0:
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            print("Комната удалена")
                            kickedRoom.pop(room, None)
                    if username == roomUser:
                        usersInRoom.get(room).remove(username)
                        if len(usersInRoom.get(room)) == 0:
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            print("Комната удалена")
                            kickedRoom.pop(room, None)

                if self in objectsInRoom[room]:
                    objectsInRoom.get(room).remove(self)

                if len(objectsInRoom.get(room)) == 0:
                    objectsInRoom.pop(room, None)

                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )

                self.room_group_name = 'Test-Room'

                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )

                await self.channel_layer.send(
                    self.channel_name,
                    {
                        'type': 'channel_message',
                        'action': 'disconnect',
                        'room': 'room',
                        'message': {username: '1'},
                    }
                )
                return
            except KeyError:
                print("В комнате никого нет")
                usersInRoom.pop(room, None)
                roomsDict.pop(room, None)
                kickedRoom.pop(room, None)
        print('6')            

    async def send_sdp(self, event):  # отправка SDP
        receive_dict = event['receive_dict']
        await self.send(text_data=json.dumps(receive_dict))

    async def channel_message(self, event):  # канальное сообщение
        print("Канальное сообщение", event)
        message = event['message']
        action = event['action']
        room = event['room']

        await self.send(text_data=json.dumps({
            'message': message,
            'action': action,
            'room': room,
        }))