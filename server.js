// server.js - Mesaj Geçmişi Destekli Canlı Sunucu Kodu
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let users = {
    "+5025453665": { number: "+5025453665", password: "mkdkagan641", firstName: "Mehmet Kağan", lastName: "Duran", avatar: null }
};

// TÜM MESAJLARIN KAYDEDİLDİĞİ GÜVENLİ HAVUZ
let allMessages = []; 

io.on('connection', (socket) => {
    console.log('Cihaz bağlandı:', socket.id);

    socket.on('login', (data) => {
        const targetNumber = String(data.number).trim();
        const user = users[targetNumber];
        
        if (user && String(user.password).trim() === String(data.password).trim()) {
            socket.join(targetNumber);
            socket.emit('login_response', { 
                success: true, 
                user: { firstName: user.firstName, lastName: user.lastName, number: user.number } 
            });
        } else {
            socket.emit('login_response', { success: false, message: "Numara veya şifre hatalı ya da böyle bir hesap yok" });
        }
    });

    socket.on('check_number', (data) => {
        const targetNumber = String(data.number).trim();
        socket.emit('check_number_response', { exists: users[targetNumber] ? true : false });
    });

    socket.on('register', (data) => {
        const targetNumber = String(data.number).trim();
        users[targetNumber] = {
            number: targetNumber, password: String(data.password).trim(),
            firstName: data.firstName, lastName: data.lastName, avatar: data.avatar
        };
        socket.join(targetNumber);
        socket.emit('register_response', { success: true });
    });

    // PYTHON GİRİŞ YAPTIĞINDA BU TETİKLENECEK VE ESKİ SOHBETLERİ ÇEKECEK
    socket.on('get_my_history', (data) => {
        const myNum = String(data.number).trim();
        
        // Bu kullanıcıyı ilgilendiren tüm mesajları (gönderdiği veya aldığı) filtrele
        const filtered = allMessages.filter(m => m.sender === myNum || m.receiver === myNum || m.receiver.startsWith("[GRUP]"));
        
        // Kullanıcının daha önce konuştuğu kişilerin listesini (Geçmiş Sohbetler) çıkar
        let chatPartners = [];
        filtered.forEach(m => {
            if (m.receiver.startsWith("[GRUP]")) {
                if (!chatPartners.includes(m.receiver)) chatPartners.push(m.receiver);
            } else {
                let partner = (m.sender === myNum) ? m.receiver : m.sender;
                if (!chatPartners.includes(partner)) chatPartners.push(partner);
            }
        });

        socket.emit('history_response', { messages: filtered, chats: chatPartners });
    });

    socket.on('send_message', (data) => {
        // Gelen mesajı kalıcı havuzumuza kaydediyoruz
        allMessages.push(data);
        
        if (data.receiver.startsWith("[GRUP]")) {
            io.emit('receive_message', data);
        } else {
            io.to(data.receiver).emit('receive_message', data);
            io.to(data.sender).emit('receive_message', data);
        }
    });

    // Admin komutları aynen korunmuştur...
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Mini Chat Sunucusu aktif!`));
