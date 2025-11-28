const net = require('net');
const E = require('events');
const { p, u } = require('./core');
const { MAX } = require('./constants');

class ServerCore extends E {
    constructor(port) {
        super();
        this.port = port;
        this.c = new Set();
        this.srv = net.createServer(s => this.handle(s));
        this.srv.on('error', e => this.emit('error', e));
    }

    listen(port) {
        const p = port || this.port;
        this.srv.listen(p, () => this.emit('ready', p));
    }

    handle(socket) {
        this.c.add(socket);
        this.emit('connect', socket);
        let buf = Buffer.alloc(0);

        socket.on('data', data => {
            if (buf.length + data.length > MAX * 4) { socket.destroy(); return; }
            buf = Buffer.concat([buf, data]);
            while (true) {
                const res = u(buf);
                if (!res) break;
                this.emit('msg', socket, res.t, res.d);
                buf = res.r;
            }
        });

        socket.on('error', e => this.emit('clientError', socket, e));
        socket.on('close', () => {
            this.c.delete(socket);
            this.emit('disconnect', socket);
        });
    }

    bc(type, data) {
        const pkt = p(type, data);
        for (const s of this.c) {
            if (!s.destroyed) s.write(pkt);
        }
    }
}
module.exports = ServerCore;
