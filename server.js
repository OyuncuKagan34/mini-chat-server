// server.js - Mini Chat 7/24 Canlı Sunucu Kodu
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS ayarı ile Python uygulamasının güvenle bağlanmasını sağlıyoruz
const io = new Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] } 
});

// Başlangıç Veritabanı (Kurucu Hesap)
let users = {
    "+5025453665": {
        number: "+5025453665",
        password: "mkdkagan641",
        firstName: "Mehmet Kağan",
        lastName: "Duran",
        avatar: null
    }
};

io.on('connection', (socket) => {
    let loggedInNumber = null;
    console.log('Yeni bir cihaz bağlandı ID:', socket.id);

    // Giriş Kontrolü
    socket.on('login', (data) => {
        const user = users[data.number];
        if (user && user.password === data.password) {
            loggedInNumber = data.number;
            socket.join(data.number); // Kullanıcıyı kendi özel kanalına al
            socket.emit('login_response', { 
                success: true, 
                user: { firstName: user.firstName, lastName: user.lastName, number: user.number } 
            });
            console.log(`${data.number} giriş yaptı.`);
        } else {
            socket.emit('login_response', { 
                success: false, 
                message: "Numara veya şifre hatalı ya da böyle bir hesap yok" 
            });
        }
    });

    // Numara Sorgulama (Yeni Hesap Açarken)
    socket.on('check_number', (data) => {
        const exists = users[data.number] ? true : false;
        socket.emit('check_number_response', { exists: exists });
    });

    // Yeni Hesap Kaydetme
    socket.on('register', (data) => {
        users[data.number] = {
            number: data.number,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            avatar: data.avatar
        };
        loggedInNumber = data.number;
        socket.join(data.number);
        socket.emit('register_response', { success: true });
        console.log(`Yeni hesap oluşturuldu: ${data.number}`);
    });

    // Mesajlaşma (Birebir ve Grup İletimi)
    socket.on('send_message', (data) => {
        console.log(`${data.sender} şuraya mesaj attı: ${data.receiver}`);
        
        if (data.receiver.startsWith("[GRUP]")) {
            // Grup mesajı ise herkese yayınla (Basit mantık için tüm odalara gönderir)
            io.emit('receive_message', data);
        } else {
            // Birebir mesaj ise sadece alıcıya ve gönderene ilet
            io.to(data.receiver).emit('receive_message', data);
            io.to(data.sender).emit('receive_message', data);
        }
    });

    // Admin Komutları (Sadece Mehmet Kağan'ın kurucu numarası kullanabilir)
    socket.on('admin_command', (data) => {
        if (data.adminNumber !== "+5025453665") {
            socket.emit('admin_response', "Hata: Bu komutu kullanmaya yetkiniz yok!");
            return;
        }

        const cmdText = data.command.trim();
        const args = cmdText.split(" ");
        const baseCmd = args[0].toLowerCase();

        if (baseCmd === "help") {
            socket.emit('admin_response', "Komutlar:\n- del account \"NUMARA\"\n- renum account \"NUMARA\" to \"YENİ_NUMARA\"\n- password \"NUMARA\"");
        } 
        else if (baseCmd === "del" && args[1] === "account") {
            const target = args[2];
            if (users[target]) {
                if (target === "+5025453665") {
                    socket.emit('admin_response', "Hata: Kurucu hesabı silemezsiniz!");
                } else {
                    delete users[target];
                    socket.emit('admin_response', `BAŞARILI: ${target} numaralı hesap sistemden silindi.`);
                }
            } else {
                socket.emit('admin_response', "Hata: Hesap bulunamadı.");
            }
        } 
        else if (baseCmd === "password") {
            const target = args[1];
            if (users[target]) {
                socket.emit('admin_response', `${target} şifresi: ${users[target].password}`);
            } else {
                socket.emit('admin_response', "Hata: Kullanıcı bulunamadı.");
            }
        } 
        else if (baseCmd === "renum" && args[1] === "account") {
            // Örnek: renum account +50111 to +50222
            const oldNum = args[2];
            const newNum = args[4];
            if (users[oldNum]) {
                users[newNum] = users[oldNum];
                users[newNum].number = newNum;
                delete users[oldNum];
                socket.emit('admin_response', `BAŞARILI: ${oldNum} numarası ${newNum} olarak değiştirildi.`);
            } else {
                socket.emit('admin_response', "Hata: Eski numara bulunamadı.");
            }
        } 
        else {
            socket.emit('admin_response', "Bilinmeyen komut. Yardım için 'help' yazın.");
        }
    });

    socket.on('disconnect', () => {
        console.log('Bir cihazın bağlantısı koptu:', socket.id);
    });
});

// Bulut platformlarının otomatik port ataması için process.env.PORT kullanıyoruz
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Mini Chat Sunucusu ${PORT} portunda aktif ve hazır!`));
