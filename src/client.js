const net = require('net');
const E = require('events');
const v2core = require('./v2core');

class ClientCore extends E {
    constructor(host, port) {
        super();
        this.host = host;
        this.port = port;
        this.s = new net.Socket();
        this.s.setNoDelay(true);
        this.C = v2core;
    }

    con(host, port) {
        const h = host || this.host;
        const p = port || this.port;
        this.s.connect(p, h, () => this.emit('ready'));

        let buf = Buffer.alloc(0);
        this.s.on('data', chunk => {
            buf = Buffer.concat([buf, chunk]);
            while (true) {
                const res = this.C.u(buf);
                if (!res) break;
                this.emit('msg', res.t, res.d);
                buf = res.r;
            }
        });

        this.s.on('close', () => this.emit('close'));
        this.s.on('error', e => this.emit('error', e));
    }

    send(type, data) {
        this.s.write(this.C.p(type, data));
    }
}

module.exports = ClientCore;
