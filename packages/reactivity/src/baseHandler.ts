import { activeEffect } from "./effect"
import { track, trigger } from './reactiveEffect'
export enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive"
}

export const mutableHandlers: ProxyHandler<any> = {
    get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return true
        }
        track(target, key) // 收集这个对象上的这个属性和effect关联在一起
        return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
        const oldValue = target[key]
        let result = Reflect.set(target, key, value, receiver)
        if (oldValue !== value) {
            // 触发页面更新
            trigger(target, key, value, oldValue)

        }
        return result
    }
}