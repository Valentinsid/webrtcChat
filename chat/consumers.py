import json
import pprint

from asgiref.sync import sync_to_async
from channels.exceptions import StopConsumer
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
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
        # print("Соединение")
        self.room_group_name = 'Test-Room'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):  # функция отключения
        # print(self.channel_layer, self.channel_name)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        user = usersChannels[self.channel_name]
        # print(user)

        for usersList in usersInRoom.values():  # удаление пользователей из списков
            if user in usersList:
                usersList.remove(user)

            if user + "_roomadmin" in usersList:
                usersList.remove(user + "_roomadmin")

        for key, value in list(usersInRoom.items()):  # удаление комнат
            if len(value) == 0:
                usersInRoom.pop(key)

        for objectsList in objectsInRoom.values():
            if self in objectsList:
                objectsList.remove(self)

        for key, value in list(objectsInRoom.items()):
            if len(value) == 0:
                objectsInRoom.pop(key)

                # print(usersInRoom)
        raise StopConsumer()
        # print("Разъединено!")

    async def receive(self, text_data):  # функция получения сигнала
        # print('Получение')
        # print("Канал 0: ", self.channel_layer.groups)
        # print(self.channel_name)
        receive_dict = json.loads(text_data)  # полученные данные
        message = receive_dict['message']  # сообщение
        action = receive_dict['action']  # действие
        room = receive_dict['room']  # комната
        # print(receive_dict)

        try:
            roomPass = receive_dict['roomPass']  # пароль от комнаты
            # print("Пароль "+ roomPass)
            username = receive_dict['peer']  # имя пользователя


        except KeyError:
            pass

        # if action == 'new-answer' or action == 'new-offer':
        #     # print("DWADSDSADAs")
        #     # print(username)
        #     # pp.pprint(message['sdp']['sdp'])
        #     a = await get_all_users()
        #     for i in a:
        #         if username == i.username:
        #             user = i
        #             prof = await get_profile(i)
        #             print(prof)
        #     new = message['sdp']['sdp'].split('\n')
        #     new2 = []            
        #     # print(new)
        #     d = 0
        #     for i in new:
        #         if 'a=candidate' in i:
        #             print(d, i)
        #             i = i.split()
        #             i = i[:4]
        #             i = "".join(i)
        #             new2.append(i)
        #             d += 1
        #         if d==3:
        #             break    
        #     new2 = tuple(new2)
        #     new2 = hash(new2)
        #     prof = await fill_candidate(prof, new2)
        #     prof = await save_profile(prof)
        #     print(new2, prof.ice_candidates, type(new2), type(prof.ice_candidates))
        #     if str(new2) != prof.ice_candidates:
        #         print(new2, "!=", prof.ice_candidates)
        #         if prof.first_ice == True:
        #             print("hello")
        #             prof.first_ice = False
        #             prof = await save_profile(prof)
        #         else:
        #             # отправить письмо с проверкой
        #             receiver_channel_name = receive_dict['message']['receiver_channel_name']
        #             await self.channel_layer.send(
        #                 list(usersChannels.keys())[list(usersChannels.values()).index(username)],
        #                 {
        #                     'type': 'channel_message',
        #                     'action': 'wrong_ice',
        #                     'room': 'room',
        #                     'message': { username: '1'},
        #                 }
        #             )
        #             # print(self.scope['headers'][0][1].decode(), type(self.scope['headers'][0][1].decode()))

        #             current_site = self.scope['headers'][0][1].decode()

        #             mail_subject = 'Обновите ваши данные.'
        #             message = render_to_string('chat/acc_active_ice.html', {
        #                 'user': user,
        #                 'domain': current_site,
        #                 'uid':urlsafe_base64_encode(force_bytes(user.pk)),
        #                 'token':account_activation_token.make_token(user),
        #             })

        #             to_email = user.email
        #             email = EmailMessage(
        #                         mail_subject, message, to=[to_email]
        #             )
        #             email.content_subtype = 'html'
        #             email.send()
        #             return

        # print("NEW2", new2)

        if room not in [a for a in roomsDict.keys()]:  # словарь комнат с паролями
            if action != 'check-room' and action != 'check-admin' and action != 'onhold':
                # print("Комната добавлена") 
                roomsDict[room] = roomPass

        if action == 'pass':  # при передаче прав админа пользователю
            print("Передача")
            curAdmin = username
            newAdmin = message['peer']
            print(curAdmin, newAdmin)
            newAdminInd = usersInRoom[room].index(newAdmin)
            usersInRoom[room].append(newAdmin + "_roomadmin")
            print(usersInRoom[room])
            del usersInRoom[room][newAdminInd]
            print(usersInRoom[room])
            usersInRoom[room].append(curAdmin)
            oldAdminInd = usersInRoom[room].index(curAdmin + "_roomadmin")
            del usersInRoom[room][oldAdminInd]
            print(usersInRoom[room])
            print(self.room_group_name)
            await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'channel_message',
                            'action': 'pass-admin',
                            'room': room,
                            'message': newAdmin,
                        }
                    )

            return



            # print(kickedRoom)                

        if action == 'check-room':  # при проверке комнаты
            # print(self.room_group_name, self.channel_name)
            # print("Текстовая дата от проверки комнаты: ", receive_dict)
            # receiver_channel_name = receive_dict['message']['receiver_channel_name']
            receive_dict['message']['receiver_channel_name'] = self.channel_name
            # print("Список комнат:", roomsDict)
            if room in [a for a in roomsDict.keys()]:
                # print("Комнаты и пароли 1", roomsDict)
                # await self.channel_layer.send(
                #     receiver_channel_name,
                #     {
                #         'type': 'send.check',
                #         'receive_check': '1'
                #     }
                # )
                await self.channel_layer.send(
                    self.channel_name,
                    {
                        'type': 'channel_message',
                        'action': 'check-room',
                        'room': room,
                        'message': '1'
                    }
                )
                return
            else:
                # print("Комната не в словаре")
                await self.channel_layer.send(
                    self.channel_name,
                    {
                        'type': 'channel_message',
                        'action': 'check-room',
                        'room': room,
                        'message': '0'
                    }
                )
                return

        try:  # проверка пользователя на исключение
            if kickedRoom[room]:
                print('комнаты кикнутых', kickedRoom[room])
                for i in kickedRoom[room]:
                    print('кикнутые', i)
                    if i in usersInRoom[room]:
                        return
        except KeyError:
            print("1111")

        if action == 'check-admin':  # проверка на администратора
            # try:
            #     if (kickedRoom[room]): 
            #         print("ЧЕК АДМИН: Вот комната кикнутых:", kickedRoom[room])
            # except KeyError:
            #     print("Кикнутых нет") 
            try:
                if usersInRoom[room]:
                    users = usersInRoom[room]
                    for user in users:
                        if "_roomadmin" in user:
                            # print(self)
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
                # else:
            #     await self.channel_layer.group_send(
            #         self.room_group_name,
            #         {
            #             'type': 'channel_message',
            #             'action': 'check-admin',
            #             'room': room,
            #             'message': [user, '0'],
            #         }
            #     )
            #     return

        # if room not in [a for a in roomsDict.keys()] and action != 'check-room': roomsDict[room] = roomPass;
        # print("Комнаты и пароли 2", roomsDict)
        # if room in 
        # print(self.room_group_name, self.channel_name)
        # print("Текущие группы: ", self.channel_layer.groups)
        if room in [a for a in roomsDict.keys()] and action == 'check-pass':  # переход из тестовой комнаты в заданную
            # print('Комната в словаре и значение проверка пароля') 
            if roomPass == roomsDict[room]:
                if self.room_group_name != room:
                    # print('Из тестовой комнаты в кастомную', self.room_group_name, self.channel_name)
                    await self.channel_layer.group_discard(
                        self.room_group_name,
                        self.channel_name
                    )
                    # print("Удаление: ", self.channel_layer.groups)
                    self.room_group_name = room
                    await self.channel_layer.group_add(
                        self.room_group_name,
                        self.channel_name

                    )
                    self.room_group_name = room
                    # print("После изменения: ", self.channel_layer.groups)

                return

            # print(self.channel_layer.groups)
        # self.room_group_name = "0"
        # print(self.room_group_name, self.channel_name)
        # self.room_group_name = room
        # print(self.room_group_name, self.channel_name)

        # await self.channel_layer.group_add(
        #     room,
        #     self.channel_name
        # )
        # print(self.room_group_name, self.channel_name)

        if action == 'new-offer' or action == 'new-answer':  # новое предложение / новый ответ
            print("ПОЛЬЗОВАТЕЛИ: ", usersInRoom[room])
            try:
                if kickedRoom[room]:
                    print('комнаты кикнутых', kickedRoom[room])
                    for i in kickedRoom[room]:
                        print('кикнутые', i)
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

        if action == "check-pass":  # проверка пароля
            if room in [a for a in roomsDict.keys()]:
                # print('Check pass and room in dict') 
                if roomPass != roomsDict[room]:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'channel_message',
                            'action': 'check-pass',
                            'room': room,
                            'message': '0'
                        }
                    )
                    return
                else:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'channel_message',
                            'action': 'check-pass',
                            'room': room,
                            'message': '1'
                        }
                    )

                    return

        # if (action == 'check-room'):
        #     print("dsadsads", receive_dict)
        #     # receiver_channel_name = receive_dict['message']['receiver_channel_name']
        #     receive_dict['message']['receiver_channel_name'] = self.channel_name
        #     if room in roomsList:
        #         print("231321", roomsList)
        #         # await self.channel_layer.send(
        #         #     receiver_channel_name,
        #         #     {
        #         #         'type': 'send.check',
        #         #         'receive_check': '1'
        #         #     }
        #         # )
        #         await self.channel_layer.group_send(
        #             self.room_group_name,
        #             {
        #                 'type': 'channel_message',
        #                 'action': 'check-room',
        #                 'room': room,
        #                 'message': '1'
        #             }
        #         )
        #         return
        #     else:
        #         print("dsadsa1")
        #         await self.channel_layer.group_send(
        #             self.room_group_name,
        #             {
        #                 'type': 'channel_message',
        #                 'action': 'check-room',
        #                 'room': room,
        #                 'message': '0'
        #             }
        #         )
        #         return

        receive_dict['message']['receiver_channel_name'] = self.channel_name
        if action != 'check-admin' and action != "onhold" and action != "kick" and action != "pass":  # обмен SDP
            # print('Перед отправкой SDP')
            # print(receive_dict)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send.sdp',
                    'receive_dict': receive_dict
                }
            )
            # print('SDP отправлено')

        usersChannels[self.channel_name] = username  # присвоение каналу имени пользователя
        print(usersChannels)

        if action == 'onhold':  # поставили на удержание
            print("Отправляю ОНХОЛД")
            print(usersChannels)
            print(message['peer'], list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
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

        if action == 'unhold':  # убрали с удержания
            print("Отправляю АНХОЛД")
            print(usersChannels)
            print(message['peer'], list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
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

        if action != 'check-admin':  # добавление объектов в комнату
            if objectsInRoom.get(room) is None:
                objectsInRoom[room] = objectsInRoom.get(room, []) + [self]
                # print(objectsInRoom)
            else:
                if self not in objectsInRoom.get(room, []):
                    objectsInRoom[room] = objectsInRoom.get(room, []) + [self]
                    # print(objectsInRoom)

        # print("Польз. и каналы", usersChannels)
        if action != 'disconnect' and action != 'check-admin':  # добавление пользователей в комнату
            if usersInRoom.get(room) is None:
                # if username
                usersInRoom[room] = usersInRoom.get(room, []) + [username + "_roomadmin"]
            else:
                if username not in usersInRoom.get(room, []) and username + "_roomadmin" not in usersInRoom.get(room,
                                                                                                                []):
                    usersInRoom[room] = usersInRoom.get(room, []) + [username]

        # print("Кто в комнате 1:", usersInRoom)

        if action == 'disconnect':  # отключение пользователя
            # print('Дисконнект', username)
            try:
                for roomUser in usersInRoom[room]:
                    # print("Удаление пользователя:", username)
                    if username + "_roomadmin" == roomUser:
                        # print("Пользователь - админ:", username)
                        usersInRoom.get(room).remove(username + '_roomadmin')
                        if len(usersInRoom.get(room)) > 0:
                            firstUser = usersInRoom.get(room)[0]
                            firstUser = firstUser + '_roomadmin'
                            usersInRoom.get(room).pop(0)
                            usersInRoom.get(room).append(firstUser)
                        if len(usersInRoom.get(room)) == 0:
                            # print("Исключаем комнату:", room)
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            kickedRoom.pop(room, None)
                            # print(roomsDict)
                    if username == roomUser:
                        # print("Пользователь - неадмин:", username)
                        usersInRoom.get(room).remove(username)
                        if len(usersInRoom.get(room)) == 0:
                            # print("Исключаем комнату:", room)
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            kickedRoom.pop(room, None)
                            # print(roomsDict)

                if self in objectsInRoom[room]:
                    objectsInRoom.get(room).remove(self)

                if len(objectsInRoom.get(room)) == 0:
                    objectsInRoom.pop(room, None)

                    # print("Объекты в комнате:",objectsInRoom)

                # print('Каналы 1: ', self.channel_layer.groups)

                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )

                self.room_group_name = 'Test-Room'

                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )

                # print(self.channel_name)

                await self.channel_layer.send(
                    self.channel_name,
                    {
                        'type': 'channel_message',
                        'action': 'disconnect',
                        'room': 'room',
                        'message': {username: '1'},
                    }
                )

                # print("Каналы 2: ", self.channel_layer.groups)

                # print("Кто в комнате 2:", usersInRoom)
                # if '_roomadmin' in username:
                #     print('222')
                #     usersInRoom.get(room).remove(username + '_roomadmin')
                # print(usersInRoom)

                return
            except KeyError:
                print("В комнате никого нет")

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
