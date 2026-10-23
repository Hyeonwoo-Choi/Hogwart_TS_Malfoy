import type { Zone } from './places'

/**
 * 지도의 시각적 배치(개념도). 실제 호그와트의 지리를 가장하지 않는다 — 규칙은 places.ts, 여기에는 좌표와 도형만 둔다.
 * 좌표는 viewBox 0 0 100 75 기준(마커는 이 비율을 %로 환산한다). 이미지 지도로 교체할 때는 MARKERS 좌표만 바꾸면 된다.
 */
export const MAP_VIEW = { w: 100, h: 75 }

export const ZONES: { id: Zone; label: string; hint: string }[] = [
  { id: 'castle', label: '성 내부', hint: '층별 개념도 — 위가 높은 층' },
  { id: 'grounds', label: '성 밖 부지', hint: '성 바깥 개념도' },
]

export const MARKERS: Record<string, { zone: Zone; x: number; y: number }> = {
  common: { zone: 'castle', x: 68, y: 11 },
  classroom4: { zone: 'castle', x: 30, y: 25.5 },
  library: { zone: 'castle', x: 62, y: 40.5 },
  hall: { zone: 'castle', x: 38, y: 55.5 },
  potions: { zone: 'castle', x: 24, y: 69 },
  greenhouse: { zone: 'grounds', x: 72, y: 15 },
  courtyard: { zone: 'grounds', x: 26, y: 31 },
  pitch: { zone: 'grounds', x: 74, y: 49 },
  lake: { zone: 'grounds', x: 28, y: 62 },
}

export type Shape =
  | { k: 'rect'; x: number; y: number; w: number; h: number; cls: string; rx?: number }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number; cls: string }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; cls: string }
  | { k: 'text'; x: number; y: number; t: string; cls: string }

export const SHAPES: Record<Zone, Shape[]> = {
  castle: [
    { k: 'rect', x: 2, y: 4, w: 96, h: 13, cls: 'floor', rx: 1 }, { k: 'text', x: 4, y: 9, t: '탑', cls: 'flabel' },
    { k: 'rect', x: 2, y: 19, w: 96, h: 13, cls: 'floor', rx: 1 }, { k: 'text', x: 4, y: 24, t: '4층', cls: 'flabel' },
    { k: 'rect', x: 2, y: 34, w: 96, h: 13, cls: 'floor', rx: 1 }, { k: 'text', x: 4, y: 39, t: '도서관 층', cls: 'flabel' },
    { k: 'rect', x: 2, y: 49, w: 96, h: 13, cls: 'floor', rx: 1 }, { k: 'text', x: 4, y: 54, t: '1층', cls: 'flabel' },
    { k: 'rect', x: 2, y: 64, w: 96, h: 9, cls: 'floor deep', rx: 1 }, { k: 'text', x: 4, y: 69, t: '지하', cls: 'flabel' },
    { k: 'line', x1: 90, y1: 10, x2: 90, y2: 68, cls: 'stairs' }, { k: 'text', x: 91.5, y: 41, t: '계단', cls: 'flabel vert' },
  ],
  grounds: [
    { k: 'rect', x: 4, y: 3, w: 44, h: 15, cls: 'bldg', rx: 1.5 }, { k: 'text', x: 8, y: 8, t: '성', cls: 'flabel' },
    { k: 'rect', x: 10, y: 22, w: 32, h: 18, cls: 'yard', rx: 2 },
    { k: 'rect', x: 58, y: 6, w: 28, h: 18, cls: 'glass', rx: 2 },
    { k: 'ellipse', cx: 74, cy: 49, rx: 21, ry: 13, cls: 'field' },
    { k: 'ellipse', cx: 28, cy: 62, rx: 25, ry: 11, cls: 'water' },
    { k: 'line', x1: 26, y1: 18, x2: 26, y2: 22, cls: 'path' },
    { k: 'line', x1: 42, y1: 14, x2: 58, y2: 14, cls: 'path' },
    { k: 'line', x1: 42, y1: 36, x2: 56, y2: 44, cls: 'path' },
    { k: 'line', x1: 26, y1: 40, x2: 28, y2: 52, cls: 'path' },
  ],
}
