// Usage: node tools/restore-backup.js <backup.json.enc> <output.json>   (uses DATA_KEY, or the key file next to the output/DB file)
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const [,, src, out]=process.argv;if(!src||!out){console.error('usage: node tools/restore-backup.js backups/db-YYYY-MM-DD.json.enc data/db.json');process.exit(1)}
const key=process.env.DATA_KEY?crypto.createHash('sha256').update(process.env.DATA_KEY).digest():Buffer.from(fs.readFileSync(out+'.key','utf8').trim(),'hex');
const b=fs.readFileSync(src),d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));
const plain=Buffer.concat([d.update(b.subarray(28)),d.final()]);JSON.parse(plain);
if(fs.existsSync(out))fs.copyFileSync(out,out+'.before-restore');fs.writeFileSync(out,plain,{mode:0o600});console.log('restored',out);
