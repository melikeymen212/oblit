const{M,H,E}=require('./k');
module.exports={
p:(t,d)=>{
const b=Buffer.isBuffer(d)?d:Buffer.from(typeof d=='object'?JSON.stringify(d):String(d));
if(b.length>M)throw new Error(E.S);
const h=Buffer.alloc(H);h.writeUInt16BE(b.length,0);h.writeUInt8(t,2);
return Buffer.concat([h,b])},
u:b=>{if(b.length<H)return null;
const l=b.readUInt16BE(0),T=H+l;
if(b.length<T)return null;
return{t:b.readUInt8(2),d:b.subarray(H,T),r:b.subarray(T)}}
};