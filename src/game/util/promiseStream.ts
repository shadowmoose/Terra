/**
 * Chain promises sequentially, with a maximum stack size.
 */
export default class PromiseStream {
    private prom: Promise<any> = Promise.resolve();
    private readonly maxBackpressure: number;
    private backPressure: number = 0;

    constructor(maxBackpressure: number = 0) {
        this.maxBackpressure = maxBackpressure
    }

    get length() {
        return this.backPressure;
    }

    public queue(fn: Function, onError: Function|null = null) {
        if (this.maxBackpressure && this.backPressure >= this.maxBackpressure) {
            throw Error('Max backpressure reached!')
        }
        this.backPressure++;

        this.prom = this.prom.then( async () => {
            await fn();
        }).catch( async err => {
            if (onError) {
                await onError(err);
            } else {
                console.error(err);
            }
        }).then(() => {
            this.backPressure--;
        })
    }
}
