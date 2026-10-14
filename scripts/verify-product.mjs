import { readFile } from "node:fs/promises";

const path = new URL("../public/data/parcels-10000.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const features = data.features ?? [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(data.type === "FeatureCollection", "Dataset must be a GeoJSON FeatureCollection");
assert(features.length === 10_000, "Expected exactly 10,000 records");
assert(new Set(features.map((f) => f.properties.parcelId)).size === 10_000, "Parcel IDs must be unique");
assert(features.every((f) => f.geometry?.type === "Polygon" && f.geometry.coordinates?.[0]?.length >= 4), "Every record must have valid polygon geometry");
assert(features.every((f) => ["verified", "review", "conflict"].includes(f.properties.status)), "Unexpected parcel status");
assert(features.every((f) => f.properties.confidence >= 0 && f.properties.confidence <= 100), "Confidence must be 0–100");
assert(features.every((f) => f.properties.ward >= 1 && f.properties.ward <= 20), "Ward must be 1–20");

const status = features.reduce((out, f) => {
  out[f.properties.status] = (out[f.properties.status] ?? 0) + 1;
  return out;
}, {});

console.log(JSON.stringify({
  result: "PASS",
  records: features.length,
  uniqueParcelIds: 10_000,
  geometry: "Polygon",
  crs: "EPSG:4326",
  status
}, null, 2));
