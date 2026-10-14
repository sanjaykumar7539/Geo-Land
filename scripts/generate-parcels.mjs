import { mkdir, writeFile } from "node:fs/promises";

const first=["Arun","Asha","Bala","Deepa","Gokul","Harini","Irfan","Jaya","Karthik","Kavitha","Kumar","Lakshmi","Meena","Naveen","Priya","Rahim","Revathi","Sanjay","Saravanan","Vignesh"];
const last=["R","S","M","K","P","V","N","A","T","D"];
const sources=["Patta + CAD","Chitta + Satellite","Registry + Drone","Patta + GIS","FMB + Survey","TSLR + CAD"];
const issues=["None","Area mismatch","Boundary overlap","Geometry shift","Owner attribute mismatch","Duplicate survey reference"];
const districts=[["Ariyalur",79.08,11.14],["Chengalpattu",79.98,12.68],["Chennai",80.27,13.08],["Coimbatore",76.96,11.02],["Cuddalore",79.77,11.75],["Dharmapuri",78.16,12.13],["Dindigul",77.98,10.36],["Erode",77.72,11.34],["Kallakurichi",78.96,11.74],["Kancheepuram",79.70,12.83],["Kanniyakumari",77.54,8.18],["Karur",78.08,10.96],["Krishnagiri",78.21,12.52],["Madurai",78.12,9.93],["Mayiladuthurai",79.65,11.10],["Nagapattinam",79.84,10.77],["Namakkal",78.17,11.22],["Nilgiris",76.70,11.41],["Perambalur",78.88,11.23],["Pudukkottai",78.82,10.38],["Ramanathapuram",78.84,9.37],["Ranipet",79.33,12.93],["Salem",78.15,11.66],["Sivaganga",78.49,9.85],["Tenkasi",77.32,8.96],["Thanjavur",79.14,10.79],["Theni",77.48,10.01],["Thoothukudi",78.13,8.76],["Tiruchirappalli",78.69,10.79],["Tirunelveli",77.70,8.73],["Tirupathur",78.57,12.50],["Tiruppur",77.34,11.11],["Tiruvallur",79.91,13.14],["Tiruvannamalai",79.07,12.23],["Tiruvarur",79.63,10.77],["Vellore",79.13,12.92],["Viluppuram",79.49,11.94],["Virudhunagar",77.96,9.59]];
const count=Number(process.argv[2]??1000000);
if(!Number.isSafeInteger(count)||count<1)throw new Error("Count must be a positive integer");
const shardSize=10000;const manifest={recordCount:count,synthetic:true,shards:[]};
await mkdir("public/data/large",{recursive:true});
let features=[];
for(let i=0;i<count;i++){
  const district=districts[i%districts.length],local=Math.floor(i/districts.length),row=Math.floor(local/100)%100,col=local%100,cycle=Math.floor(local/10000),ward=(i%20)+1;
  const lon=district[1]-0.067+col*0.00135+(row%2)*0.00012+cycle*0.00001,lat=district[2]-0.059+row*0.00118+cycle*0.00001;
  const s=(i*37)%100;
  const status=s<68?"verified":s<86?"review":"conflict";
  const confidence=status==="verified"?88+(i%11):status==="review"?68+(i%18):42+(i%25);
  const issue=status==="verified"?"None":issues[1+(i%5)];
  const risk=status==="conflict"?(i%3===0?"critical":"high"):status==="review"?"medium":"low";
  const w=0.00092+(i%4)*0.00007,h=0.00078+(i%5)*0.00006;
  features.push({
    type:"Feature",
    id:`TN-${district[0].slice(0,3).toUpperCase()}-${String(i+1).padStart(6,"0")}`,
    properties:{parcelId:`TN-${district[0].slice(0,3).toUpperCase()}-${String(i+1).padStart(6,"0")}`,survey:`${120+Math.floor(i/25)}/${(i%25)+1}${String.fromCharCode(65+(i%4))}`,owner:`${first[i%first.length]} ${last[(i*3)%last.length]}`,ward,zone:["North","South","East","West","Central"][i%5],district:district[0],areaSqFt:1200+((i*173)%6800),status,confidence,source:sources[i%sources.length],issue,risk,lastUpdated:`2026-10-${String(1+(i%14)).padStart(2,"0")}`,ulPin:`33TN${String(10000000+i)}`,taxStatus:i%9===0?"Due":"Current"},
    geometry:{type:"Polygon",coordinates:[[[lon,lat],[lon+w,lat],[lon+w,lat+h],[lon,lat+h],[lon,lat]]]}
  });
  if(features.length===shardSize||i===count-1){const file=`large/parcels-${String(manifest.shards.length).padStart(4,"0")}.json`;await writeFile(`public/data/${file}`,JSON.stringify({type:"FeatureCollection",features}));manifest.shards.push({file,count:features.length});features=[];}
}
await writeFile("public/data/manifest.json",JSON.stringify(manifest));
console.log(`Generated ${count} synthetic parcels in ${manifest.shards.length} shards`);
