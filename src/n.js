const net=require('net'),EE=require('events'),{p,u}=require('./c'),{M,OP}=require('./k');
class S extends EE{
constructor(o={}){super();this.o=Object.assign({port:3000},o);this.c=new Set;
this.srv=net.createServer(s=>this.h(s));
this.srv.on('error',e=>!o.silent&&this.emit('err',e))}
st(cb){this.srv.listen(this.o.port,cb)}
h(s){this.c.add(s);let b=Buffer.alloc(0);
s.on('data',d=>{if(b.length+d.length>M*2){s.destroy();return}
b=Buffer.concat([b,d]);while(1){const r=u(b);if(!r)break;
let m=r.d;if(r.t==OP.JSON)try{m=JSON.parse(r.d)}catch{}else if(r.t==OP.TXT)m=r.d.toString();
this.emit('data',m,s);b=r.r}});
s.on('close',()=>this.c.delete(s));s.on('error',()=>this.c.delete(s))}
bc(d){let t=OP.TXT;if(Buffer.isBuffer(d))t=OP.RAW;else if(typeof d=='object')t=OP.JSON;
const k=p(t,d);for(const s of this.c)if(!s.destroyed)s.write(k)}}
class C extends EE{
constructor(a){super();const[h,p]=(a||'127.0.0.1:3000').split(':');
this.a={h,p:parseInt(p)};this.s=new net.Socket;this.s.setNoDelay(!0)}
cn(cb){this.s.connect(this.a.p,this.a.h,()=>{if(cb)cb();this.emit('ready')});
let b=Buffer.alloc(0);this.s.on('data',d=>{b=Buffer.concat([b,d]);
while(1){const r=u(b);if(!r)break;let m=r.d;
if(r.t==OP.JSON)try{m=JSON.parse(r.d)}catch{}else if(r.t==OP.TXT)m=r.d.toString();
this.emit('data',m);b=r.r}})}
snd(d){let t=OP.TXT;if(Buffer.isBuffer(d))t=OP.RAW;else if(typeof d=='object')t=OP.JSON;
this.s.write(p(t,d))}}
module.exports={S,C,OP};