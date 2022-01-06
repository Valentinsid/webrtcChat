import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.exceptions import StopConsumer
import pprint
roomsDict = {}
usersInRoom = {}
usersChannels = {}
objectsInRoom = {}
kickedRoom = {}
pp = pprint.PrettyPrinter(indent = 4)
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Соединение")
        self.room_group_name = 'Test-Room'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        print(self.channel_layer, self.channel_name)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        user = usersChannels[self.channel_name]
        print(user)



        for usersList in usersInRoom.values():
            if user in usersList:
                usersList.remove(user)

            if user + "_roomadmin" in usersList:
                usersList.remove(user + "_roomadmin")

                                
        for key, value in list(usersInRoom.items()):
            if len(value) == 0:
                usersInRoom.pop(key)

        for objectsList in objectsInRoom.values():
            if self in objectsList:
                objectsList.remove(self)

                                
        for key, value in list(objectsInRoom.items()):
            if len(value) == 0:
                objectsInRoom.pop(key)                    

        print(usersInRoom)
        raise StopConsumer()
        print("Разъединено!")

    async def receive(self, text_data):
        print('Получение')
        # print("Канал 0: ", self.channel_layer.groups)
        print(self.channel_name)
        receive_dict = json.loads(text_data)
        message = receive_dict['message']
        action = receive_dict['action']
        room = receive_dict['room']
        print('Получение action:', message)
        try:
            roomPass = receive_dict['roomPass']
            # print("Пароль "+ roomPass)
            username = receive_dict['peer']

        
        except KeyError:
            pass
        if room not in [a for a in roomsDict.keys()]:
            if action != 'check-room' and action != 'check-admin':
                print("Комната добавлена") 
                roomsDict[room] = roomPass

           


        if (action == 'kick'):
            username = message['peer']
            print("Исключенные: ", message['peer'], room)
            try:
                kickedRoom[room].append(username)
            except KeyError:
                kickedRoom[room] = [username]

            await self.channel_layer.send(
                        list(usersChannels.keys())[list(usersChannels.values()).index(username)],
                        {
                            'type': 'channel_message',
                            'action': 'kick',
                            'room': 'room',
                            'message': { username: '1'},
                        }
                    )     

            print(kickedRoom)                

        if (action == 'check-room'):
            print(self.room_group_name, self.channel_name)
            # print("Текстовая дата от проверки комнаты: ", receive_dict)
            # receiver_channel_name = receive_dict['message']['receiver_channel_name']
            receive_dict['message']['receiver_channel_name'] = self.channel_name
            print("Список комнат:", roomsDict)
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

        if action == 'check-admin':
            try:
                if usersInRoom[room]:
                    users = usersInRoom[room]
                    for user in users:
                        if "_roomadmin" in user:
                            print(self)
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
        if room in [a for a in roomsDict.keys()] and action == 'check-pass':
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


        if (action == 'new-offer') or (action == 'new-answer'):
            print("ПОЛЬЗОВАТЕЛИ: ", usersInRoom[room])
            try:
                if(kickedRoom[room]):
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

        if (action == "check-pass"):
            if room in [a for a in roomsDict.keys()]:
                print('Check pass and room in dict') 
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
        if action != 'check-admin':
            print('Перед отправкой SDP')

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send.sdp',
                    'receive_dict': receive_dict
                }   
            )
            print('SDP отправлено')

        usersChannels[self.channel_name] = username


        if (action == 'onhold'):
            print(message['peer'], list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])])
            await self.channel_layer.send(
                        list(usersChannels.keys())[list(usersChannels.values()).index(message['peer'])],
                        {
                            'type': 'channel_message',
                            'action': 'onhold',
                            'room': 'room',
                            'message': { message['peer']: '1'},
                        }
                    ) 

        if(action != 'check-admin'):
            if objectsInRoom.get(room) == None:
                objectsInRoom[room] = objectsInRoom.get(room, []) + [self]
                print(objectsInRoom)
            else:
                if self not in objectsInRoom.get(room, []):
                    objectsInRoom[room] = objectsInRoom.get(room, []) + [self]
                    print(objectsInRoom)





        # print("Польз. и каналы", usersChannels)
        if action != 'disconnect' and action != 'check-admin':
            if usersInRoom.get(room) == None:
                # if username
                usersInRoom[room] = usersInRoom.get(room, []) + [username + "_roomadmin"]
            else:
                if username not in usersInRoom.get(room, []) and username + "_roomadmin" not in usersInRoom.get(room, []):
                    usersInRoom[room] = usersInRoom.get(room, []) + [username]

        print("Кто в комнате 1:", usersInRoom)

        if (action == 'disconnect'):
            print('Дисконнект', username)
            try:
                for roomUser in usersInRoom[room]:
                    print("Удаление пользователя:", username)
                    if username + "_roomadmin" == roomUser:
                        print("Пользователь - админ:", username)
                        usersInRoom.get(room).remove(username + '_roomadmin')
                        if len(usersInRoom.get(room)) > 0:
                            firstUser = usersInRoom.get(room)[0]
                            firstUser = firstUser + '_roomadmin'
                            usersInRoom.get(room).pop(0)
                            usersInRoom.get(room).append(firstUser)
                        if len(usersInRoom.get(room)) == 0:
                            print("Исключаем комнату:", room)
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            kickedRoom.pop(room, None)
                            print(roomsDict)
                    if username == roomUser:
                        print("Пользователь - неадмин:", username)
                        usersInRoom.get(room).remove(username)
                        if len(usersInRoom.get(room)) == 0:
                            print("Исключаем комнату:", room)
                            usersInRoom.pop(room, None)
                            roomsDict.pop(room, None)
                            kickedRoom.pop(room, None)
                            print(roomsDict)

                if self in objectsInRoom[room]:
                    objectsInRoom.get(room).remove(self)

                if len(objectsInRoom.get(room)) == 0:
                    objectsInRoom.pop(room, None)  

                print("Объекты в комнате:",objectsInRoom)      


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

                print(self.channel_name)

                await self.channel_layer.send(
                        self.channel_name,
                        {
                            'type': 'channel_message',
                            'action': 'disconnect',
                            'room': 'room',
                            'message': { username: '1'},
                        }
                    ) 

                # print("Каналы 2: ", self.channel_layer.groups)

                            

                           



                                


                print("Кто в комнате 2:", usersInRoom)        
                # if '_roomadmin' in username:
                #     print('222')
                #     usersInRoom.get(room).remove(username + '_roomadmin')
                # print(usersInRoom)

                return
            except KeyError:
                print("В комнате никого нет")    
    


    async def send_sdp(self, event):
        receive_dict = event['receive_dict']

        await self.send(text_data=json.dumps(receive_dict))

    async def channel_message(self, event):
        print("Канальное сообщение", event)
        message = event['message']
        action = event['action']
        room = event['room']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'action': action,
            'room': room, 
        }))    
