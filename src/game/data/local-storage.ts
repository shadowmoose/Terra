// Small wrapper utility for storing arbitrary data.

export function get(key: string, def: any = null) {
    const ret = localStorage.getItem(key)
    return ret ? JSON.parse(ret) : def;
}


export function set(key: string, val: any) {
    localStorage.setItem(key, JSON.stringify(val));
}


export enum STORAGE {
    SHOW_GRID = 'showGrid',
    SHOW_NAMES = 'showNames',
    SHOW_MEASURES = 'showShapes',
}
