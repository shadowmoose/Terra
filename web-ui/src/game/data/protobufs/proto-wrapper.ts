import {Message} from "protobufjs/light";

/**
 * Wrapper for protobuf Message, which allows quick & typed constructor unpacking.
 */
export default class ProtoWrapper<T extends object = object> extends Message<T>{
    /**
     * Shortcut to assign the given values to this object, then return it.
     */
    assign(values: Partial<this>): this {
        return Object.assign(this, values)
    }
}
