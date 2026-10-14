import { mkdir, writeFile } from "node:fs/promises";

const first=["Arun","Asha","Bala","Deepa","Gokul","Harini","Irfan","Jaya","Karthik","Kavitha","Kumar","Lakshmi","Meena","Naveen","Priya","Rahim","Revathi","Sanjay","Saravanan","Vignesh"];
const last=["R","S","M","K","P","V","N","A","T","D"];
const sources=["Patta + CAD","Chitta + Satellite","Registry + Drone","Patta + GIS","FMB + Survey","TSLR + CAD"];
const issues=["None","Area mismatch","Boundary overlap","Geometry shift","Owner attribute mismatch","Duplicate survey reference"];
const count=Number(process.argv[2]??1000000);
if(!Number.isSafeInteger(count)||count<1)throw new Error("Count must be a positive integer");
const shardSize=10000;const manifest={recordCount:count,synthetic:true,shards:[]};
await mkdir("public/data/large",{recursive:true});
let features=[];
for(let i=0;i<count;i++){
  const local=i%10000, row=Math.floor(local/100),col=local%100,ward=(i%20)+1;
  const region=Math.floor(i/10000);
  const lon=76.885+(region%10)*0.15+col*0.00135+(row%2)*0.00012,lat=10.955+Math.floor(region/10)*0.13+row*0.00118;
  const s=(i*37)%100;
  const status=s<68?"verified":s<86?"review":"conflict";
  const confidence=status==="verified"?88+(i%11):status==="review"?68+(i%18):42+(i%25);
  const issue=status==="verified"?"None":issues[1+(i%5)];
  const risk=status==="conflict"?(i%3===0?"critical":"high"):status==="review"?"medium":"low";
  const w=0.00092+(i%4)*0.00007,h=0.00078+(i%5)*0.00006;
  features.push({
    type:"Feature",
    id:`TN-CBE-${String(i+1).padStart(5,"0")}`,
    properties:{parcelId:`TN-CBE-${String(i+1).padStart(5,"0")}`,survey:`${120+Math.floor(i/25)}/${(i%25)+1}${String.fromCharCode(65+(i%4))}`,owner:`${first[i%first.length]} ${last[(i*3)%last.length]}`,ward,zone:["North","South","East","West","Central"][i%5],areaSqFt:1200+((i*173)%6800),status,confidence,source:sources[i%sources.length],issue,risk,lastUpdated:`2026-10-${String(1+(i%14)).padStart(2,"0")}`,ulPin:`33CBE${String(10000000+i)}`,taxStatus:i%9===0?"Due":"Current"},
    geometry:{type:"Polygon",coordinates:[[[lon,lat],[lon+w,lat],[lon+w,lat+h],[lon,lat+h],[lon,lat]]]}
  });
  if(features.length===shardSize||i===count-1){const file=`large/parcels-${String(manifest.shards.length).padStart(4,"0")}.json`;await writeFile(`public/data/${file}`,JSON.stringify({type:"FeatureCollection",features}));manifest.shards.push({file,count:features.length});features=[];}
}
await writeFile("public/data/manifest.json",JSON.stringify(manifest));
console.log(`Generated ${count} synthetic parcels in ${manifest.shards.length} shards`);
