import { isObject, isString, ShapeFlags } from "@vue/shared"


export const Text = Symbol("text")
export const Fragment = Symbol("fragment")

export function isVnode(value) {
    return !!(value && value.__v_isVnode)
}


export function isSameVnode(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key
}

export function createVnode(type, props, children?) {
    // type : div h1  h2这种标签  或者 组件
    const shapeFlag = isString(type)
        ? ShapeFlags.ELEMENT // 元素
        : isObject(type)
            ? ShapeFlags.STATEFUL_COMPONENT // 组件
            : 0
    const vnode = {
        __v_isVnode: true,
        type,
        props,
        children,
        key: props?.key, // diff算法需要的key
        el: null, // 虚拟节点对应的真实节点
        shapeFlag,
        ref: props?.ref
    }

    if (children) {
        if (Array.isArray(children)) {
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN
        } else if (isObject(children)) {
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.SLOTS_CHILDREN
        } else {
            children = String(children)
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
        }
    }

    return vnode
}