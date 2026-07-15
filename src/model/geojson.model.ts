export enum GeometryType {
  LineString = "LineString",
  Point = "Point",
}

export interface PathGeojson {
  type: string;
  name: string;
  features: PathGeojsonFeatures[];
}

export interface PathGeojsonFeatures {
  properties: {
    floor: string;
  };
  geometry: {
    type: GeometryType.LineString;
    coordinates: number[][];
  };
}

export interface PointGeojson {
  type: string;
  name: string;
  features: PointGeojsonFeatures[];
}

export interface PointGeojsonFeatures {
  properties: {
    type: string;
    id: string;
    nodes: string; // Id'ki punktów zmiany pięter, z którymi jest połączony punkt, po przecinku
  };
  geometry: {
    type: GeometryType.Point;
    coordinates: number[];
  };
}

export interface ResultGeojson {
  type: "FeatureCollection";
  features: ResultGeojsonFeatures[];
}

export interface ResultGeojsonFeatures {
  type: "Feature";
  properties: {
    id: string;
    nodes: CalculatedNode[];
    floor: string;
    name?: string;
  };
  geometry: {
    type: GeometryType.Point;
    coordinates: number[];
  };
}

export interface CalculatedNode {
  id: string;
  distance: number;
  invalidDistance: number | null;
}

export interface GraphPoint {
  coordinates: number[];
  id: string;
  floorChangeNodesString?: string;
  type?: string;
}

export interface GraphItem {
  nodes: GraphPoint[];
  point: GraphPoint;
}

export interface CalculatedGraphItem {
  nodes: CalculatedNode[];
  point: GraphPoint;
  name?: string;
}
