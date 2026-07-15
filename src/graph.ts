import {
  CalculatedGraphItem,
  CalculatedNode,
  GeometryType,
  GraphItem,
  GraphPoint,
  PathGeojson,
  PointGeojson,
  ResultGeojsonFeatures,
} from "./model/geojson.model";
import { distanceMeters } from "./utils";

export interface FloorResult {
  features: ResultGeojsonFeatures[];
  floorChangers: number;
}

/**
 * Builds the Dijkstra graph points for a single floor.
 *
 * For every vertex on the uploaded paths it assigns a stable id, links it to
 * its neighbours and computes the distance to each. Floor-change points get
 * extra edges to the levels they connect, with fixed costs (lifts/travelators
 * cheaper, stairs blocked for wheelchair users via a large invalidDistance).
 */
export function calculateNaviPoints(
  pathGeojson: PathGeojson,
  pointsGeojson: PointGeojson,
  floorName: string,
  startId: number
): { result: FloorResult; nextId: number } {
  const lines = pathGeojson.features;

  if (!lines) {
    throw new Error(`Brak linii we wgranym pliku geojson: ${pathGeojson.name}`);
  }

  if (!floorName) {
    throw new Error(`Wystąpił błąd, brak nazwy dla piętra: ${pathGeojson.name}`);
  }

  let nextId = startId;

  const linesWithPointsId: GraphPoint[][] = lines
    .map((line) => line.geometry.coordinates)
    .reduce((result: GraphPoint[][], current: number[][]) => {
      const pointsWithIds = current.map((cords) => {
        const pointInResults = result.find((line) =>
          line.some(
            (linePoint) =>
              linePoint.coordinates[0] === cords[0] &&
              linePoint.coordinates[1] === cords[1]
          )
        );
        if (pointInResults) {
          return {
            coordinates: cords,
            id: pointInResults.find(
              (linePoint) =>
                linePoint.coordinates[0] === cords[0] &&
                linePoint.coordinates[1] === cords[1]
            )?.id,
          } as GraphPoint;
        } else {
          const floorChangePoint = pointsGeojson.features.find(
            (point) =>
              point.geometry.coordinates[0] === cords[0] &&
              point.geometry.coordinates[1] === cords[1]
          );
          if (floorChangePoint) {
            return {
              coordinates: cords,
              id: floorChangePoint.properties.id,
            } as GraphPoint;
          } else {
            nextId++;
            return {
              coordinates: cords,
              id: nextId.toString(),
            } as GraphPoint;
          }
        }
      });

      return [...result, pointsWithIds];
    }, []);

  const pointIds: GraphPoint[] = linesWithPointsId.reduce(
    (result: GraphPoint[], current: GraphPoint[]) => {
      const newPoints = current.filter(
        (point) => !result.some((p) => p.id === point.id)
      );
      return [...result, ...newPoints];
    },
    []
  );

  const graph: GraphItem[] = pointIds.map((point: GraphPoint) => {
    const nodes: GraphPoint[] = linesWithPointsId.reduce(
      (result: GraphPoint[], current: GraphPoint[]) => {
        const matchId = current.find((p) => point.id === p.id);
        const opposite = current.find((p) => point.id !== p.id);
        return matchId && opposite ? [...result, opposite] : result;
      },
      []
    );

    return { nodes, point };
  });

  let floorChangerCounter = 0;
  const graphWithDistances: CalculatedGraphItem[] = graph.map((graphItem) => {
    const floorChangePoint = pointsGeojson.features.find(
      (point) =>
        point.geometry.coordinates[0] === graphItem.point.coordinates[0] &&
        point.geometry.coordinates[1] === graphItem.point.coordinates[1]
    );
    let floorChangerNodes: CalculatedNode[] = [];
    if (floorChangePoint?.properties.nodes) {
      const { type, nodes } = floorChangePoint.properties;
      const isLiftOrTrav = type === "lift" || type === "trav";
      floorChangerNodes = nodes.split(",").map((nodeId) => {
        return {
          id: nodeId,
          distance: isLiftOrTrav ? 200 : 100, // 200 dla windy, 100 dla reszty
          invalidDistance: isLiftOrTrav ? 200 : 10000, // 10000 aby nie poprowadzić inwalidy przez schody
        };
      });
    }

    const nodes: CalculatedNode[] = graphItem.nodes.map((node) => {
      const dist = distanceMeters(graphItem.point.coordinates, node.coordinates);

      return {
        id: node.id,
        distance: +dist.toFixed(2),
        invalidDistance: +dist.toFixed(2),
      };
    });
    if (floorChangePoint) {
      floorChangerCounter++;
    }
    return {
      point: graphItem.point,
      nodes: [...nodes, ...floorChangerNodes],
    };
  });

  const features: ResultGeojsonFeatures[] = graphWithDistances.map((item) => {
    return {
      type: "Feature",
      properties: {
        id: item.point.id,
        floor: floorName,
        nodes: item.nodes,
        name: item.name,
      },
      geometry: {
        type: GeometryType.Point,
        coordinates: item.point.coordinates,
      },
    };
  });

  return {
    result: { features, floorChangers: floorChangerCounter },
    nextId,
  };
}
