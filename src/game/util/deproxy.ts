/**
 * Strip out any proxied observables, and convert them to standard values.
 * @param obj
 */
export default function stripProxy(obj: any): any {
    const ret = {};
    for (const e of Object.entries(obj)) {
        let v = e[1];

        if (v instanceof Array) {
            v = Array.from(v);
        }
        // @ts-ignore
        ret[e[0]] = v;
    }
    return ret;
}
