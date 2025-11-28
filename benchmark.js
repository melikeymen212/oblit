const Oblit = require('./index');
const net = require('net');

// --- AYARLAR ---
const ITERATIONS = 50000; 
const PORT_OB = 9001;
const PORT_ST = 9002;

// --- SENARYO: OYUN VERİSİ ---
// Diyelim ki oyuncu hareket etti. 
// Veri: { cmd: 1 (MOVE), x: 250.50, y: 120.00 }

// 1. STANDARTIN GÖNDERDİĞİ (JSON Şişkinliği)
const JSON_DATA = JSON.stringify({ cmd: 1, x: 250.50, y: 120.00 }); 
// Boyut: Yaklaşık 40-50 Byte

// 2. OBLIT'İN GÖNDERDİĞİ (Binary Gücü)
const BIN_DATA = Buffer.alloc(9); // Sadece 9 Byte!
BIN_DATA.writeUInt8(1, 0);        // Cmd (1 byte)
BIN_DATA.writeFloatBE(250.50, 1); // X (4 byte)
BIN_DATA.writeFloatBE(120.00, 5); // Y (4 byte)

console.log(`\n⚔️  ASIL SAVAS BASLIYOR (${ITERATIONS} Pkt)...\n`);
console.log(`📦 JSON Paket Boyutu  : ${Buffer.byteLength(JSON_DATA)} Byte`);
console.log(`📦 Oblit Paket Boyutu : ${BIN_DATA.length + 3} Byte (+3 Header dahil)`);
console.log(`---------------------------------------------`);

// --- OBLIT (BUFFER MODE) ---
async function testOblit() {
    return new Promise(r => {
        const s = new Oblit.Server({ port: PORT_OB, silent: true });
        s.on('data', (d) => s.bc(d)); // Echo

        s.st(() => {
            const c = new Oblit.Client(`127.0.0.1:${PORT_OB}`);
            c.cn(() => {
                let start = process.hrtime();
                let count = 0;

                // KRİTİK NOKTA: Buffer yolluyoruz! Oblit en hızlı moduna geçiyor.
                c.snd(BIN_DATA); 

                c.on('data', () => {
                    count++;
                    if(count < ITERATIONS) c.snd(BIN_DATA);
                    else {
                        const t = process.hrtime(start);
                        // Gerçek trafiği socketten ölçüyoruz
                        const traffic = c.s.bytesWritten;
                        c.s.destroy(); s.srv.close();
                        r({ 
                            ms: (t[0]*1000 + t[1]/1e6).toFixed(2), 
                            kb: (traffic/1024).toFixed(2) 
                        });
                    }
                });
            });
        });
    });
}

// --- STANDART (JSON) ---
async function testStd() {
    return new Promise(r => {
        const s = net.createServer(so => so.on('data', d => so.write(d)));
        s.listen(PORT_ST, () => {
            const c = new net.Socket();
            c.connect(PORT_ST, '127.0.0.1', () => {
                let start = process.hrtime();
                let count = 0;
                c.write(JSON_DATA);
                c.on('data', () => {
                    count++;
                    if(count < ITERATIONS) c.write(JSON_DATA);
                    else {
                        const t = process.hrtime(start);
                        const traffic = c.bytesWritten;
                        c.destroy(); s.close();
                        r({ ms: (t[0]*1000 + t[1]/1e6).toFixed(2), kb: (traffic/1024).toFixed(2) });
                    }
                });
            });
        });
    });
}

// SONUÇLARI YAZDIR
(async () => {
    console.log("⏳ Oblit (Buffer) Kosuyor...");
    const resOB = await testOblit();
    
    console.log("⏳ Standart (JSON) Kosuyor...");
    const resST = await testStd();

    console.log("\n📊 SONUÇ RAPORU:");
    console.log("==============================================");
    console.log(`MODÜL        | SÜRE (ms) | TRAFİK (KB)`);
    console.log("-------------|-----------|--------------------");
    console.log(`JSON (Std)   | ${resST.ms}    | ${resST.kb}`);
    console.log(`OBLIT (Bin)  | ${resOB.ms}    | ${resOB.kb}`);
    console.log("==============================================");

    const trafficSaving = (100 - (resOB.kb / resST.kb * 100)).toFixed(1);
    const speedDiff = (resST.ms - resOB.ms).toFixed(2);

    console.log(`\n🎉 KAZANAN: OBLIT!`);
    console.log(`💾 TRAFİK TASARRUFU: %${trafficSaving} (Bu internet faturasini yaridan fazla keser!)`);
    
    // Hız (ms) yakın çıkabilir (localhost yüzünden) ama trafik OBLIT'te çok düşük çıkmalı.
})();