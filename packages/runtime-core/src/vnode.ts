import { isObject, isString, ShapeFlags } from "@vue/shared"

export function isVnode(value) {
    return !!(value && value.__v_isVnode)
}


export function createVnode(type, props, chidren?) {
    // type : div h1  h2这种标签
    const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0
    const vnode = {
        __v_isVnode: true,
        type,
        props,
        chidren,
        key: props?.key, // diff算法需要的key
        el: null, // 虚拟节点对应的真实节点
        shapeFlag
    }

    if (chidren) {
        if (Array.isArray(chidren)) {
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN
        } else {
            chidren = String(chidren)
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
        }
    }

    return vnode
}