"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recursiveGetMetadata = void 0;
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-07-06 10:29:20
 */
const koatty_container_1 = require("koatty_container");
const functionPrototype = Object.getPrototypeOf(Function);
// get property of an object
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function ordinaryGetPrototypeOf(obj) {
    const proto = Object.getPrototypeOf(obj);
    if (typeof obj !== "function" || obj === functionPrototype) {
        return proto;
    }
    // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
    // Try to determine the superclass constructor. Compatible implementations
    // must either set __proto__ on a subclass constructor to the superclass constructor,
    // or ensure each class has a valid `constructor` property on its prototype that
    // points back to the constructor.
    // If this is not the same as Function.[[Prototype]], then this is definately inherited.
    // This is the case when in ES6 or when using __proto__ in a compatible browser.
    if (proto !== functionPrototype) {
        return proto;
    }
    // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
    const prototype = obj.prototype;
    const prototypeProto = prototype && Object.getPrototypeOf(prototype);
    // tslint:disable-next-line: triple-equals
    if (prototypeProto == undefined || prototypeProto === Object.prototype) {
        return proto;
    }
    // If the constructor was not a function, then we cannot determine the heritage.
    const constructor = prototypeProto.constructor;
    if (typeof constructor !== "function") {
        return proto;
    }
    // If we have some kind of self-reference, then we cannot determine the heritage.
    if (constructor === obj) {
        return proto;
    }
    // we have a pretty good guess at the heritage.
    return constructor;
}
/**
 * get metadata value of a metadata key on the prototype chain of an object and property
 * @param metadataKey metadata's key
 * @param target the target of metadataKey
 */
function recursiveGetMetadata(metadataKey, target, propertyKey) {
    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    const metadata = koatty_container_1.IOCContainer.listPropertyData(metadataKey, target) || {};
    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        const pmetadata = koatty_container_1.IOCContainer.listPropertyData(metadataKey, parent);
        if (pmetadata) {
            for (const n in pmetadata) {
                if (!metadata.hasOwnProperty(n)) {
                    metadata[n] = pmetadata[n];
                }
            }
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return metadata;
}
exports.recursiveGetMetadata = recursiveGetMetadata;
//# sourceMappingURL=lib.js.map