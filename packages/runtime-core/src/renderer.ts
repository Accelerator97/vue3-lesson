// core 不关心如何渲染
import { ShapeFlags } from '@vue/shared'

export function createRenderer(renderOptions) {
    const {
        insert: hostInsert,
        remove: hostRemove,
        createElement: hostCreateElement,
        createText: hostCreateText,
        setText: hostSetText,
        setElementText: hostSetElementText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        patchProp: hostPatchProp
    } = renderOptions

    const mountChildren = (chidren, container) => {
        for (let i = 0; i < chidren.length; i++) {
            // TODO: children[i] 可能是纯文本的情况
            patch(null, chidren[i], container)
        }
    }

    const mountElement = (vnode, container) => {
        // shapFlag是vnode的节点类型和 子节点类型 取异或的值
        const { type, chidren, props, shapeFlag } = vnode
        let el = hostCreateElement(type)

        if (props) {
            for (let key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 9 & 8 > 0 说明儿子是文本元素
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, chidren)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 说明是儿子是数组
            mountChildren(chidren, el)
        }

        hostInsert(el, container)
    }

    // 渲染 更新
    const patch = (n1, n2, container) => {
        if (n1 === n2) return // 两次渲染同一个元素 跳过
        if (n1 === null) {
            mountElement(n2, container)
        }
    }

    // 多次调用render会进行虚拟节点的比较，再进行更新
    const render = (vnode, container) => {
        // 把虚拟节点变成真实节点渲染
        patch(container._vnode || null, vnode, container)
        // 第一次调渲染方法 保存vnode到container上 后续可以判断是不是更新
        container._vnode = vnode
    }

    return {
        render
    }
}