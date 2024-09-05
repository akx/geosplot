import React from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FeatureCollection, GeoJsonObject } from "geojson";
import { parse } from "papaparse";
import { interpolateViridis, scaleSequential } from "d3";

function isFeatureCollection(geo: GeoJsonObject): geo is FeatureCollection {
  return geo.type === "FeatureCollection";
}

function assignFeatures(geo: GeoJsonObject, features: { [k: string]: number }) {
  if (!isFeatureCollection(geo)) {
    return;
  }
  const vals = Object.values(features).filter((v) => !isNaN(v));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const colorScale = scaleSequential(interpolateViridis).domain([min, max]);
  for (const geoFeature of geo.features) {
    const value =
      features[geoFeature.properties?.name || geoFeature.properties?.code];
    if (value === undefined) continue;
    const color = colorScale(value);
    geoFeature.properties = {
      ...geoFeature.properties,
      value,
      color,
    };
  }
}

function App() {
  const [geojsonString, setGeojsonString] = React.useState("");
  const [featureData, setFeatureData] = React.useState("");

  const features = React.useMemo(() => {
    if (!featureData) return null;
    try {
      return Object.fromEntries(
        parse<string[]>(featureData, { header: false }).data.map((row) => [
          row[0]!,
          parseFloat(row[1]!),
        ]),
      );
    } catch (e) {
      console.error("Failed to parse feature data", e);
      return null;
    }
  }, [featureData]);
  const [gen, geojson] = React.useMemo(() => {
    if (!geojsonString) return [0, null];
    try {
      const geo = JSON.parse(geojsonString) as GeoJsonObject;
      if (features) assignFeatures(geo, features);
      return [+new Date(), geo];
    } catch (e) {
      console.error("Failed to parse GeoJSON data", e);
      return [0, null];
    }
  }, [geojsonString, features]);
  return (
    <div className="grow grid grid-cols-2">
      <MapContainer zoom={5} center={[61.9241, 25.7482]}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojson ? (
          <GeoJSON
            key={gen}
            data={geojson}
            style={(feature) => ({
              fill: true,
              fillColor: feature?.properties?.color,
              weight: 1,
              color: feature?.properties?.color ?? "black",
            })}
          />
        ) : null}
      </MapContainer>
      <div className="p-2">
        <textarea
          placeholder="GeoJSON data"
          value={geojsonString}
          onChange={(e) => setGeojsonString(e.target.value)}
          className="w-full h-64 border border-purple-500 p-2"
        />
        <textarea
          placeholder="Feature data (TSV)"
          value={featureData}
          onChange={(e) => setFeatureData(e.target.value)}
          className="w-full h-64 border border-purple-500 p-2"
        />
      </div>
    </div>
  );
}

export default App;
