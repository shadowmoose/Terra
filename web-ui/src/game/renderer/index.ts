import * as PIXI from 'pixi.js'
import {Viewport} from 'pixi-viewport'
import {
    CULLER,
    ENTITY_LAYER,
    getForceCull, GRID_DIMENSIONS,
    GRID_TILE_PX,
    OVERLAY_LAYER,
    setForceCull,
    TERRAIN_LAYER,
    WORLD_SIZE_PX
} from './ui-data/globals';
import * as GRID from './ui-components/ui-grid';
import {EVENT_STREAM, GridPoint} from "./ui-data/ui-event-stream";
import * as TOOLTIP from "./ui-components/ui-tooltip";

/*
export * as CONSTS from './ui-data/globals';
export * as EVENTS from './ui-data/ui-event-stream';
export * as TERRAIN from './ui-components/ui-terrain';
export * as ENTITIES from './ui-components/ui-entity';
export * as SHAPES from './ui-components/ui-shape';
export * as MARKER from './ui-components/ui-marker';
*/

const app = new PIXI.Application({ resizeTo: document.body, backgroundColor: 0x484848 });
document.body.appendChild(app.view);

app.view.addEventListener('contextmenu', (ev: any) => {
    ev.preventDefault();
    return false;
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// create viewport
const viewport = new Viewport({
    screenWidth: app.view.offsetWidth,
    screenHeight: app.view.offsetHeight,
    worldWidth: WORLD_SIZE_PX,
    worldHeight: WORLD_SIZE_PX
});

app.stage.addChild(viewport);
viewport
    .drag()
    //.pinch()  // Disabled, because this is buggy & not really required for mobile.
    .bounce()
    .wheel({smooth: 60/5})
    .decelerate({ friction: .92 })
    .clamp({direction: 'all'})
    .clampZoom({minScale: 0.5, maxScale: 4})
    .moveCenter(WORLD_SIZE_PX/2, WORLD_SIZE_PX/2);


// Add all parents to viewport:
viewport.addChild(TERRAIN_LAYER);
viewport.addChild(GRID.grid);
viewport.addChild(ENTITY_LAYER);
viewport.addChild(OVERLAY_LAYER);

CULLER.addContainer(TERRAIN_LAYER, true);
CULLER.cull(viewport.getVisibleBounds());

// cull whenever the viewport moves
PIXI.Ticker.shared.add(() => {
    if (viewport.dirty || getForceCull()) {
        CULLER.cull(viewport.getVisibleBounds());
        viewport.dirty = false;
        setForceCull(false);

        // Rather than rendering a huge grid texture, creep the grid along with the camera:
        GRID.grid.position.set(Math.max(0, viewport.left - viewport.left % GRID_TILE_PX), Math.max(0, viewport.top - viewport.top % GRID_TILE_PX));
        GRID.grid.width = Math.min(WORLD_SIZE_PX, viewport.screenWidthInWorldPixels + GRID_TILE_PX);
        GRID.grid.height = Math.min(WORLD_SIZE_PX, viewport.screenHeightInWorldPixels + GRID_TILE_PX);
    }
});

viewport.on('zoomed-end', () => {
    // Assist with clean rendering by snapping "close enough" zoom at 1x
    if (Math.abs(1 - viewport.scaled) < 0.1) viewport.scaled = 1;
});

window.addEventListener('resize', () => {
    const t = getCenterViewportTile();
    updateInPage(false);
    viewport.moveCenter(t.tx*GRID_TILE_PX+GRID_TILE_PX/2, t.ty*GRID_TILE_PX+GRID_TILE_PX/2);
});
window.addEventListener('load', function () {
    updateInPage(true);
})

EVENT_STREAM.on('hover', ev => {
    TOOLTIP.setTilePos(ev.tx , ev.ty);
});


app.view.addEventListener('mousedown', e => {
    const type = e.button === 1 ? 'mouse-middle-down' : e.button === 0 ? 'mouse-down' : 'mouse-right-down';
    fireMouseEvent(type, e);
});

window.addEventListener('mouseup', e => {
    const type = e.button === 1 ? 'mouse-middle-up' : e.button === 0 ? 'mouse-up' : 'mouse-right-up';
    fireMouseEvent(type, e);
});


function fireMouseEvent(type: any, e: any) {
    const bounds = e.target.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const px = viewport.left + (x/bounds.width) * viewport.screenWidthInWorldPixels;
    const py = viewport.top + (y/bounds.height) * viewport.screenHeightInWorldPixels;

    EVENT_STREAM.emit(type, {
        tx: Math.min(GRID_DIMENSIONS-1, Math.max(0, Math.floor(px/GRID_TILE_PX))),
        ty: Math.min(GRID_DIMENSIONS-1, Math.max(0, Math.floor(py/GRID_TILE_PX)))
    })
}


/**
 * Enable or disable camera zoom+pan inputs.
 * @param enabled
 */
export function toggleViewportInput(enabled: boolean) {
    viewport.pause = !enabled;
}

/**
 * Find the tile that is currently centered within the viewport.
 */
export function getCenterViewportTile(): GridPoint {
    return {
        tx: Math.floor((viewport.left + viewport.screenWidthInWorldPixels/2)/GRID_TILE_PX),
        ty: Math.floor((viewport.top + viewport.screenHeightInWorldPixels/2)/GRID_TILE_PX)
    }
}

/**
 * Adjusts all sizes and elements to be sure they fit within the window properly.
 * Automatically called when the window resizes and when the DOM initially loads.
 * @param center
 */
export function updateInPage(center = false) {
    app.resize();  // Trigger resize right away so we can resize viewport without a race condition.
    viewport.resize(app.view.offsetWidth, app.view.offsetHeight);
    viewport.dirty = true

    if (center) {
        viewport.moveCenter(WORLD_SIZE_PX/2, WORLD_SIZE_PX/2);
    }
}
