// src/utils/geometry.test.js
// Unit tests for geometry utilities

// Note: This would be run with vitest or jest
// For now, just showing the structure

/*
import { describe, it, expect } from 'vitest';
import {
  distance,
  angle,
  midpoint,
  centroid,
  polygonArea,
  pointInPolygon,
  circlesIntersect,
} from './geometry.js';

describe('Geometry Utilities', () => {
  it('should calculate distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(distance(1, 1, 1, 1)).toBe(0);
  });

  it('should calculate angle', () => {
    expect(angle(0, 0, 1, 0)).toBe(0);
    expect(angle(0, 0, 0, 1)).toBe(Math.PI / 2);
  });

  it('should calculate midpoint', () => {
    expect(midpoint(0, 0, 2, 2)).toEqual({ x: 1, y: 1 });
    expect(midpoint(1, 2, 3, 4)).toEqual({ x: 2, y: 3 });
  });

  it('should calculate centroid', () => {
    const triangle = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }];
    expect(centroid(triangle)).toEqual({ x: 2/3, y: 2/3 });
  });

  it('should calculate polygon area', () => {
    const triangle = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }];
    expect(polygonArea(triangle)).toBe(2);
  });

  it('should check if point is in polygon', () => {
    const polygon = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 }];
    expect(pointInPolygon(1, 1, polygon)).toBe(true);
    expect(pointInPolygon(3, 1, polygon)).toBe(false);
  });

  it('should check if circles intersect', () => {
    expect(circlesIntersect(0, 0, 1, 2, 0, 1)).toBe(true);
    expect(circlesIntersect(0, 0, 1, 3, 0, 1)).toBe(false);
  });
});
*/