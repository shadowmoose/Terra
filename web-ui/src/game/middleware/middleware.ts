
export default abstract class Middleware {
    private ele: HTMLElement|null = null;
    private hooks: any[] = [];

    public eject() {
        this.hooks.forEach(h => h());
        this.onCleanup();
        this.ele = null;
    }

    public attach(ele: HTMLElement) {
        this.ele = ele;
        this.register();
    }

    /** Attach an event listener that is automatically cleaned up when this middleware is ejected.
     * The `cb` callback should return `true` if the event should stop here. */
    protected listen(event: string, cb: any, target?: HTMLElement|Window): Function {
        const wrapped = (event: Event) => {
            const res = cb(event);
            if (res) {
                event.stopPropagation();
                event.preventDefault();
            }
            return res;
        };
        const trg = target || this.ele;
        const rem = () => trg?.removeEventListener(event, wrapped);
        trg?.addEventListener(event, wrapped);
        this.hooks.push(rem);
        return rem;
    }

    /** Called once an element is registered and ready to call `listen()`. */
    protected abstract register(): void;
    /** Called after all hooks have been cleaned up. */
    protected abstract onCleanup(): void;
}
