// core 不关心如何渲染
import { ShapeFlags, isString, hasOwn } from '@vue/shared'
import { isSameVnode, Text, createVnode, Fragment } from './vnode'
import getSequence from './seq'
import { effect, reactive, ReactiveEffect } from '@vue/reactivity'
import { queueJob } from './scheduler'
import { createComponentInstance, setupComponent } from './component'

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

    const mountChildren = (children, container) => {
        for (let i = 0; i < children.length; i++) {
            const child = normalize(children, i)
            patch(null, child, container)
        }
    }

    const normalize = (children, i) => {
        // 检测如果是字符串的话，就把字符串转换成文本节点    
        if (isString(children[i])) {
            let vnode = createVnode(Text, null, children[i])
            children[i] = vnode
        }
        return children[i]
    }

    const mountElement = (vnode, container, anchor) => {
        // shapFlag是vnode的节点类型和 子节点类型 取异或的值
        const { type, children, props, shapeFlag } = vnode
        let el = (vnode.el = hostCreateElement(type))
        if (props) {
            for (let key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 9 & 8 > 0 说明儿子是文本元素
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 说明是儿子是数组
            mountChildren(children, el)
        }

        hostInsert(el, container, anchor)
    }

    const processElement = (n1, n2, container, anchor) => {
        if (n1 === null) {
            mountElement(n2, container, anchor)
        } else {
            patchElement(n1, n2, container)
        }
    }

    // 比较两元素的差异
    const patchElement = (n1, n2, container) => {
        // 1.比较元素的差异 要复用dom元素
        // 2.比较属性和子节点

        let el = n2.el = n1.el // 复用dom元素
        let oldProps = n1.props || {}
        let newProps = n2.props || {}


        // 比较props hostPatchProps 只针对某一个属性来处理  class style event attr
        patchProps(oldProps, newProps, el)

        // 比较儿子节点
        patchChildren(n1, n2, el)
    }

    const patchProps = (oldProps, newProps, el) => {
        // 新的要全部生效
        for (let key in newProps) {
            hostPatchProp(el, key, oldProps[key], newProps[key])
        }

        for (let key in oldProps) {
            if (!(key in newProps)) { // 新的没有 则删掉
                hostPatchProp(el, key, oldProps[key], null)
            }
        }

    }

    const unmountChildren = (children) => {
        for (let i = 0; i < children.length; i++) {
            unmount(children[i]) // 把dom节点从页面上移除
        }
    }

    const patchKeyedchildren = (c1, c2, el) => {
        // 比较两个儿子的差异 更新el
        // appendChild removeChild insertBefore
        // 1.减少比对范围，先从头开始比，再从尾部开始比，确定不一样的范围
        // 2.从头比对 再从尾巴比对，如果有多余或者新增 直接操作

        let i = 0 // 开始比对的索引
        let e1 = c1.length - 1 // 第一个数组的尾部索引
        let e2 = c2.length - 1 // 第二个数组的尾部索引

        // [a,b,c,d]
        // [a,b,c,d,e]
        while (i <= e1 && i <= e2) {  // 有一方达到数组上限，退出比较
            const n1 = c1[i]
            const n2 = c2[i]

            if (isSameVnode(n1, n2)) {
                patch(n1, n2, el) // 更新当前节点的属性和儿子 （递归比较子节点）
            } else { // 虚拟节点不相同 退出循环
                break
            }
            i++
        }


        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (isSameVnode(n1, n2)) {
                patch(n1, n2, el)
            } else {
                break
            }
            e1--
            e2--
        }


        // 处理特殊情况 增加或删除
        // [a,b,c] [a,b] | [c,a,b] [a,b]

        // 最终比对乱序的情况
        // 老数组：a b
        // 新数组：a b c  ->   i = 2 , e1 = 1, e2 = 2     i>e1 && i<=e2  (尾部新增)

        // 老数组：a b
        // 新数组：c a b ->    i = 0, e1 = -1  e2 = 0     i> e1 && i <=e2  新多老的少 （头部新增）


        // 老数组：a,b,c
        // 新数组：a,b   i = 2   e1 = 2  e2 = 1    i>e2   i<=e1  （尾部删除）

        // 老数组：c,a,b
        // 新数组：a,b    i = 0  e1= 1    e2=-1    i>e2   i<=e1 （头部删除）

        if (i > e1) { // 新的多
            if (i <= e2) { // 有插入的部分
                let nextPos = e2 + 1 // 判断是头部插入还是尾部插入
                let anchor = c2[nextPos]?.el // anchor不存在 则是尾部插入，存在则是头部插入
                while (i <= e2) {
                    patch(null, c2[i], el, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            if (i <= e1) {
                while (i <= e1) {
                    unmount(c1[i]) // 将元素 一个个删除
                    i++
                }
            }
        } else {
            // 以上是确认不变化的节点，对插入或者移除进行了处理
            // 接下来是其他情况的特殊处理
            let s1 = i
            let s2 = i

            const keyToNewIndexMap = new Map() // 做一个映射表 用于快速查找老的是否在新的里面还有 没有就删除 有的话更新
            let toBePatched = e2 - s2 + 1 // 要插入的个数
            let newIndexToOldMapIndex = new Array(toBePatched).fill(0) // 节点在老数组中对应的下标 如果为0说明是新增节点 

            for (let i = s2; i <= e2; i++) {
                const vnode = c2[i]
                keyToNewIndexMap.set(vnode.key, i)
            }

            for (let i = s1; i <= e1; i++) {
                const vnode = c1[i]
                const newIndex = keyToNewIndexMap.get(vnode.key)
                if (newIndex === undefined) {
                    // 老节点没有对应 则要删掉这个老节点
                    unmount(vnode)
                } else {
                    // 有可能i为0 为了保证0是没有比对过的元素 直接i+1
                    newIndexToOldMapIndex[newIndex - s2] = i
                    //  比较前后节点的差异，更新属性和儿子
                    patch(vnode, c2[newIndex], el)
                }
            }

            let increasingSeq = getSequence(newIndexToOldMapIndex)
            let j = increasingSeq.length - 1
            // 调整顺序 可以按照新的队列 倒序插入
            for (let i = toBePatched - 1; i >= 0; i--) {
                let newIndex = s2 + i // 要插入的节点 在 新数组中 对应的索引，找他下个元素作为参照物进行插入
                let anchor = c2[newIndex + 1]?.el
                let vnode = c2[newIndex]

                if (!vnode.el) { // 之前没有创建过真实dom
                    patch(null, vnode, el, anchor)
                } else {
                    if (i === increasingSeq[j]) {
                        j--
                    } else {
                        hostInsert(vnode.el, el, anchor)
                    }
                }
            }
        }
    }

    // 儿子 有可能是text array 或者null 
    const patchChildren = (n1, n2, el) => {

        const c1 = n1.children
        const c2 = n2.children

        const preShapeFlag = n1.shapeFlag
        const shapeFlag = n2.shapeFlag

        // 1.新的是文本，老的是数组移除老的；
        // 2.新的是文本，老的也是文本，内容不相同替换
        // 3.老的是数组，新的是数组，全量 diff 算法
        // 4.老的是数组，新的不是数组，移除老的子节点
        // 5.老的是文本，新的是空
        // 6.老的是文本，新的是数组

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 针对情况1,2
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unmountChildren(c1)
            }
            if (c1 !== c2) {
                hostSetElementText(el, c2)
            }
        } else {
            if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {  // 情况3
                    patchKeyedchildren(c1, c2, el)
                } else { // 情况4
                    unmountChildren(c1)
                }
            } else {
                if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) { // 情况5
                    hostSetElementText(el, "")
                }
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {  // 情况6
                    mountChildren(c2, el)
                }

            }
        }

    }

    const processText = (n1, n2, container) => {
        if (n1 === null) {
            // 虚拟节点关联真实节点
            // 插入到页面中
            hostInsert(n2.el = hostCreateText(n2.children), container)
        } else {
            const el = (n2.el = n1.el)
            if (n1.children !== n2.children) {
                hostSetElementText(el, n2.children)
            }
        }
    }


    const processFragment = (n1, n2, container) => {
        if (n1 === null) {
            mountChildren(n2.children, container)
        } else {
            patchChildren(n1, n2, container)
        }
    }


    const setupRenderEffect = (instance, container, anchor) => {
        const { render } = instance
        const componentUpdateFn = () => {
            if (!instance.isMounted) {
                const subTree = render.call(instance.proxy, instance.proxy)
                patch(null, subTree, container, anchor)
                instance.isMounted = true
                instance.subTree = subTree
            } else {
                // 基于状态的组件更新
                const subTree = render.call(instance.proxy, instance.proxy)
                patch(instance.subTree, subTree, container, anchor)
                instance.subTree = subTree
            }
        }
        // 3.创建一个effect
        const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update))

        const update = (instance.update = () => effect.run())
        update()
    }



    const mountComponent = (vnode, container, anchor) => {
        // 1.创建组件实例 并且把这个实例放到虚拟节点上
        const instance = (vnode.component = createComponentInstance(vnode))
        // 2. 给实例属性赋值
        setupComponent(instance)
        // 3.创建一个effect
        //  组件可以基于自己的状态重新渲染 其实每个组件相当于一个effect
        setupRenderEffect(instance, container, anchor)
    }

    

    const updateProps = (instance, preProps, nextProps) => {

    }

    const updateComponent = (n1, n2) => {
        const instance = (n2.component = n1.component) // 复用组件实例

        const { props: preProps } = n1
        const { props: nextProps } = n2

        updateProps(instance, preProps, nextProps)

    }

    const processComponent = (n1, n2, container, anchor) => {
        if (n1 === null) { // 初始渲染
            mountComponent(n2, container, anchor)
        } else { // 组件更新
            updateComponent(n1, n2)
        }

    }

    // 渲染 更新
    const patch = (n1, n2, container, anchor = null) => {
        if (n1 === n2) return // 两次渲染同一个元素 跳过
        if (n1 && !isSameVnode(n1, n2)) {
            unmount(n1)
            n1 = null
        }
        // 两个节点是相同的虚拟节点 比较差异
        const { type, shapeFlag } = n2

        switch (type) {
            case Text: {
                processText(n1, n2, container)
                break
            }
            case Fragment: {
                processFragment(n1, n2, container)
                break
            }
            default: {
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    processComponent(n1, n2, container, anchor)
                }
                break
            }
        }
    }


    const unmount = (vnode) => {
        if (vnode.type === Fragment) {
            unmountChildren(vnode.children)
        } else {
            hostRemove(vnode.el)
        }
    }

    // 多次调用render会进行虚拟节点的比较，再进行更新
    const render = (vnode, container) => {
        if ((vnode === null) && container._vnode) {
            unmount(container._vnode)
        } else {
            // 把虚拟节点变成真实节点渲染
            patch(container._vnode || null, vnode, container)
            // 第一次调渲染方法 保存vnode到container上 后续可以判断是不是更新
            container._vnode = vnode
        }
    }
    return {
        render
    }
}