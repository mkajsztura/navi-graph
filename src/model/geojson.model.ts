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
    name: string;
    type: string;
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
    id: number;
    nodes: CalculatedNode[];
    floor: string;
    isFloorChanger: boolean;
    name?: string;
  };
  geometry: {
    type: GeometryType.Point;
    coordinates: number[];
  };
}

export interface CalculatedNode {
  distance: number;
  invalidDistance: number | null;
}

export interface GraphPoint {
  coordinates: number[];
  id: number;
}

export interface GraphItem {
  nodes: GraphPoint[];
  point: GraphPoint;
}

export interface CalculatedGraphItem {
  nodes: CalculatedNode[];
  point: GraphPoint;
  isFloorChanger: boolean;
  name?: string;
}
