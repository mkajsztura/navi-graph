export enum GeometryType {
  MultilineString = "MultiLineString",
  Point = "Point",
}

export interface FloorGeojson {
  type: string;
  name: string;
  features: FloorGeojsonFeatures[];
}

export interface FloorGeojsonFeatures {
  properties: {
    floor: string;
  };
  geometry: {
    type: GeometryType;
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface ResultGeojson {
  type: "FeatureCollection";
  name: string;
  features: ResultGeojsonFeatures[];
}

export interface ResultGeojsonFeatures {
  type: "Feature";
  properties: {
    id: string;
    nodes: PointNode[];
  };
  geometry: {
    type: GeometryType;
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface PointNode {
  [id: string]: {
    distance: number;
    isFloorChanger: boolean;
    invalidDistance: number | null;
  };
}

export interface GraphPoint {
  coordinates: number[];
  id: number;
}

export interface GraphItem {
  nodes: GraphPoint[];
  point: GraphPoint;
}
