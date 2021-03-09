

export function collides(r1: any, r2: any) {
    //Define the variables we'll need to calculate
    let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

    //Find the center points of each sprite
    r1.centerX = r1.x + r1.width / 2;
    r1.centerY = r1.y + r1.height / 2;
    r2.centerX = r2.x + r2.width / 2;
    r2.centerY = r2.y + r2.height / 2;

    //Find the half-widths and half-heights of each sprite
    r1.halfWidth = r1.width / 2;
    r1.halfHeight = r1.height / 2;
    r2.halfWidth = r2.width / 2;
    r2.halfHeight = r2.height / 2;

    //Calculate the distance vector between the sprites
    vx = r1.centerX - r2.centerX;
    vy = r1.centerY - r2.centerY;

    //Figure out the combined half-widths and half-heights
    combinedHalfWidths = r1.halfWidth + r2.halfWidth;
    combinedHalfHeights = r1.halfHeight + r2.halfHeight;

    //Check for a collision on the x axis
    if (Math.abs(vx) < combinedHalfWidths) {
        //A collision might be occurring. Check for a collision on the y axis
        hit = Math.abs(vy) < combinedHalfHeights;
    } else {
        //There's no collision on the x axis
        hit = false;
    }

    //`hit` will be either `true` or `false`
    return hit;
}


/**
 * Basic event emitter implementation, to avoid extra requirements.
 * @internal
 */
export default class Subscribable {
    private events: Record<string, Set<any>> = {};
    private history: Record<string, any> = {};
    private permanentHandlers: Record<string, any[]> = {};

    /**
     * Listen for events that are emitted of a specific type.
     * @param event
     * @param callback
     * @param useHistory If existing historic data should be returned.
     * @returns A function which, when called, will unregister the callback.
     */
    public on(event: string, callback: any, useHistory = false) {
        this.events[event] = this.events[event] || new Set();
        this.events[event].add(callback);

        if (useHistory && this.history.hasOwnProperty(event)) {
            callback(this.history[event]);
        }

        return () => {
            if (this.events[event]) {
                this.events[event].delete(callback);
                if (!this.events[event].size) {
                    delete this.events[event];
                }
            }
        }
    }

    /**
     * Same as {@link on on()}, but only triggers one time & automatically cleans up.
     * @param event
     * @param callback
     * @param useHistory
     * @see {@link on} for the available specific events.
     */
    public once(event: string, callback: Function, useHistory = false) {
        const unsub = this.on(event, (val: any) => {
            unsub();
            callback(val)
        }, useHistory);

        return unsub;
    }

    /**
     * Emit the given value for the given event, to all listeners.
     * @param event
     * @param val
     * @param useHistory If this data should be stored in history.
     * @protected
     */
    public emit(event: string, val?: any, useHistory = true) {
        const listeners = this.events[event];

        if (useHistory) this.history[event] = val;

        if (listeners) {
            listeners.forEach(l => {
                l(val);
            })
        }
        if (this.events['']) {
            this.events[''].forEach(l => {
                l(event, val);
            })
        }
    }

    /**
     * Register an event that cannot be cleared, even by {@link removeAllListeners}.
     * Used internally to guarantee certain events (close, etc.) are detected.
     * @param event
     * @param handler
     * @ignore
     */
    public permanent(event: string, handler: any) {
        this.permanentHandlers[event] = this.permanentHandlers[event] || [];
        this.permanentHandlers[event].push(handler);
        this.on(event, handler);
    }

    /**
     * Removes all non-permanent callbacks for the given event type, or every event type if none is given.
     * @param event
     */
    public removeAllListeners(event?: string): this {
        if (event) {
            delete this.events[event];
        } else {
            for (const k of Object.keys(this.events)) {
                delete this.events[k];
            }
        }

        const events = event? [event] : Object.keys(this.permanentHandlers);
        events.forEach(ev => {
            const handlers = this.permanentHandlers[ev];
            if (handlers) {
                handlers.forEach(h => this.on(ev, h, false))
            }
        })

        return this;
    }
}

