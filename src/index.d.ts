// src/index.d.ts
// TypeScript type definitions for dot.js

declare module 'dotjs' {
  export interface DotApp {
    draw(callback: () => void): DotApp;
    start(): DotApp;
    stop(): DotApp;
    resize(width: number, height: number): DotApp;
    destroy(): void;
    getCanvas(): HTMLCanvasElement;
    getWorker(): Worker;
    getConfig(): any;
    getFPS(): number;
  }

  export interface Shape {
    setRef(key: string): Shape;
    fill(color?: string): Shape;
    stroke(color?: string, width?: number): Shape;
    opacity(value: number): Shape;
    wavy(amplitude: number, frequency?: number, axis?: string): Shape;
    double(iterations?: number): Shape;
    translate(dx: number, dy: number): Shape;
    rotate(angle: number, cx?: number, cy?: number): Shape;
    scale(sx: number, sy: number, cx?: number, cy?: number): Shape;
    clone(): Shape;
    getRef(): string | null;
    isRegistered(): boolean;
  }

  export interface Group {
    setRef(key: string): Group;
    fill(color?: string): Group;
    stroke(color?: string, width?: number): Group;
    opacity(value: number): Group;
    wavy(amplitude: number, frequency?: number, axis?: string): Group;
    translate(dx: number, dy: number): Group;
    rotate(angle: number, cx?: number, cy?: number): Group;
    scale(sx: number, sy: number, cx?: number, cy?: number): Group;
    addShape(key: string, shape: Shape): Group;
    removeShape(key: string): Group;
    getShape(key: string): Shape | null;
    getShapeKeys(): string[];
    getShapes(): Record<string, Shape>;
    getCenter(): { x: number; y: number };
    clone(): Group;
  }

  export function createCanvas(width: number, height: number, config?: any): DotApp;
  export function createCanvas(config: any): DotApp;
  
  export function circle(x: number, y: number, radius: number, options?: any): Shape;
  export function rect(x: number, y: number, width: number, height: number, options?: any): Shape;
  export function line(x1: number, y1: number, x2: number, y2: number, options?: any): Shape;
  export function polygon(points: Array<{x: number, y: number}>, options?: any): Shape;
  
  export function join(...shapes: Shape[]): Shape;
  export function isJoined(shape: Shape): boolean;
  export function explode(shape: Shape): Shape[];
  
  export function group(shapes: Record<string, Shape>): Group;
  export function isGroup(obj: any): boolean;
  export function getGroupShapes(group: Group): Shape[];
  
  export function useRef(key: string): any;
  export function hasRef(key: string): Promise<boolean>;
  export function deleteRef(key: string): Promise<boolean>;
  export function getRefs(): Promise<string[]>;
  
  export function fill(shape: Shape, color?: string): Shape;
  export function stroke(shape: Shape, color?: string, width?: number): Shape;
  export function noFill(shape: Shape): Shape;
  export function noStroke(shape: Shape): Shape;
  export function dashed(shape: Shape, color?: string, width?: number, dashPattern?: number[]): Shape;
  export function dotted(shape: Shape, color?: string, width?: number): Shape;
  
  export function getActiveApp(): DotApp | null;
  
  // Utils
  export function distance(x1: number, y1: number, x2: number, y2: number): number;
  export function angle(x1: number, y1: number, x2: number, y2: number): number;
  export function midpoint(x1: number, y1: number, x2: number, y2: number): { x: number; y: number };
  export function lerp(x1: number, y1: number, x2: number, y2: number, t: number): { x: number; y: number };
  export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
  export function constrain(value: number, min: number, max: number): number;
  export function pointInPolygon(x: number, y: number, polygon: Array<{x: number, y: number}>): boolean;
  export function pointInCircle(x: number, y: number, cx: number, cy: number, radius: number): boolean;
  export function pointInRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean;
  export function centroid(points: Array<{x: number, y: number}>): { x: number; y: number };
  export function polygonArea(points: Array<{x: number, y: number}>): number;
  export function polygonPerimeter(points: Array<{x: number, y: number}>, closed?: boolean): number;
}