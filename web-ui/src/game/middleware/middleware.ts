
export default abstract class Middleware {
    private hooks: any[] = [];
    public static isShiftDown = false;

    public eject() {
        this.hooks.forEach(h => h());
        setActive(null);
        this.onCleanup();
    }

    public attach() {
        setActive(this);
        this.register();
    }

    /** Automatically cleaned up when this middleware is ejected. */
    protected listener(cb: any): () => void {
        this.hooks.push(cb);
        return cb;
    }

    /** Called once an element is registered. */
    protected abstract register(): void;
    /** Called after all hooks have been cleaned up. */
    protected abstract onCleanup(): void;

    public onShiftPress(): void {};
    public onShiftRelease(): void {};
}

window.addEventListener('keydown', ke => {
    if (ke.code.startsWith('Shift')) {
        Middleware.isShiftDown = true;
        if (active) {
            active.onShiftPress();
        }
    }
});

window.addEventListener('keyup', ke => {
    if (ke.code.startsWith('Shift')) {
        Middleware.isShiftDown = false;
        if (active) {
            active.onShiftRelease();
        }
    }
});


let active: Middleware|null = null;

export function setActive(middle: Middleware|null) {
    active = middle;
}
