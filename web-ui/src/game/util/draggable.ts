
function renderer(minScale: number, maxScale: number, element: HTMLElement, scaleSensitivity: number = 10){
    const state = {
        element,
        minScale,
        maxScale,
        scaleSensitivity,
        transformation: {
            originX: 0,
            originY: 0,
            translateX: 0,
            translateY: 0,
            scale: 1
        },
    };
    return Object.assign({}, canZoom(state), canPan(state), {state});
}

const pan = ({ state, originX, originY }: any) => {
    state.transformation.translateX += originX;
    state.transformation.translateY += originY;
    state.element.style.transform =
        getMatrix({ scale: state.transformation.scale, translateX: state.transformation.translateX, translateY: state.transformation.translateY });
};

const canPan = (state: any) => ({
    panBy: ({ originX, originY }: any) => pan({ state, originX, originY }),
    panTo: ({ originX, originY, scale }: any) => {
        state.transformation.scale = scale;
        pan({ state, originX: originX - state.transformation.translateX, originY: originY - state.transformation.translateY });
    },
});


const canZoom = (state: any) => ({
    zoom: ({ x, y, deltaScale }: any) => {
        const { left, top } = state.element.getBoundingClientRect();
        const { minScale, maxScale, scaleSensitivity } = state;
        const [scale, newScale] = getScale({ scale: state.transformation.scale, deltaScale, minScale, maxScale, scaleSensitivity });
        const originX = x - left;
        const originY = y - top;
        const newOriginX = originX / scale;
        const newOriginY = originY / scale;
        const translate = getTranslate({ scale, minScale, maxScale });
        const translateX = translate({ pos: originX, prevPos: state.transformation.originX, translate: state.transformation.translateX });
        const translateY = translate({ pos: originY, prevPos: state.transformation.originY, translate: state.transformation.translateY });

        state.element.style.transformOrigin = `${newOriginX}px ${newOriginY}px`;
        state.element.style.transform = getMatrix({ scale: newScale, translateX, translateY });
        state.transformation = { originX: newOriginX, originY: newOriginY, translateX, translateY, scale: newScale };
    }
});

const getScale = ({ scale, minScale, maxScale, scaleSensitivity, deltaScale }: any) => {
    let newScale = scale + (deltaScale / (scaleSensitivity / scale));
    newScale = Math.max(minScale, Math.min(newScale, maxScale));
    return [scale, newScale];
};

const hasPositionChanged = ({ pos, prevPos }: any) => pos !== prevPos;

const valueInRange = ({ minScale, maxScale, scale }: any) => scale <= maxScale && scale >= minScale;

const getTranslate = ({ minScale, maxScale, scale }: any) => ({ pos, prevPos, translate }: any) =>
    valueInRange({ minScale, maxScale, scale }) && hasPositionChanged({ pos, prevPos })
        ? translate + (pos - prevPos * scale) * (1 - 1 / scale)
        : translate;

const getMatrix = ({ scale, translateX, translateY }: any) =>
    `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`;

const listeners: any = [];

function listen (ele: HTMLElement|Document|Window, event: string, cb: any, opts: any = {}) {
    ele.addEventListener(event, cb);
    const rem = () => ele.removeEventListener(event, cb, opts);
    listeners.push(rem)
    return rem;
}

export default function Draggable(ele: HTMLElement, parent: HTMLElement) {
    const instance = renderer(.65, 5, ele, 10);
    let dragging = false;
    let lx=0, ly=0;
    // Global vars to cache event state
    let evCache: any = [], noScroll = new Set();
    let prevDiff = -1;
    listen(parent, "wheel", (event: WheelEvent) => {
        event.preventDefault();
        instance.zoom({
            deltaScale: Math.sign(event.deltaY) > 0 ? -1 : 1,
            x: event.pageX,
            y: event.pageY
        });
    }, { blocking: true });

    listen(parent, 'mouseup', (ev: MouseEvent) => {
        evCache.splice(0, evCache.length); // Don't cache events for mice.
        noScroll.clear();
        dragging = false;
        prevDiff = -1;
    });

    // Pointer stuff:
    listen(parent, 'pointerdown', (ev: PointerEvent) => {
        evCache.push(ev);
        lx = ev.clientX;
        ly = ev.clientY;
        dragging = true;
    });
    listen(window, 'pointermove', (ev: PointerEvent) => {
        ev.preventDefault();
        if (!dragging) return;
        // Find this event in the cache and update its record with this event
        for (let i = 0; i < evCache.length; i++) {
            if (ev.pointerId === evCache[i].pointerId) {
                evCache[i] = ev;
                break;
            }
        }
        // If two pointers are down, check for pinch gestures
        if (evCache.length === 2) {
            // Calculate the distance between the two pointers
            let curDiff = Math.abs(Math.sqrt(Math.pow(evCache[0].clientX - evCache[1].clientX, 2) + Math.pow(evCache[0].clientY - evCache[1].clientY, 2)));

            if (prevDiff > 0) {
                let delta = prevDiff - curDiff;
                let change = (Math.sign(delta) > 0 ? -0.2 : 0.2) * Math.abs(delta)/10;
                instance.zoom({
                    deltaScale: change,
                    x: ev.pageX,
                    y: ev.pageY
                });
                noScroll.add(evCache[0].pointerId);
                noScroll.add(evCache[1].pointerId);
            }

            // Cache the distance for the next move event
            prevDiff = curDiff;
        } else if (evCache.length === 1 && dragging && !noScroll.has(ev.pointerId)) {
            instance.panBy({
                originX: ev.clientX - lx,
                originY: ev.clientY - ly
            });
            lx = ev.clientX;
            ly = ev.clientY;
        }
    });

    listen(window, 'pointerup', (ev: PointerEvent) => {
        // Remove this event from the target's cache
        for (let i = 0; i < evCache.length; i++) {
            if (evCache[i].pointerId === ev.pointerId) {
                evCache.splice(i, 1);
                break;
            }
        }
        noScroll.delete(ev.pointerId);

        if (evCache.length < 1) {
            dragging = false;
        }

        // If the number of pointers down is less than two then reset diff tracker
        if (evCache.length < 2) {
            prevDiff = -1;
        }
    });

    return Object.assign({}, instance, {unregister: () => listeners.forEach((l: any) => l())})
}
