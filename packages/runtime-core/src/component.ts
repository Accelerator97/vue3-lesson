import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"

export function createComponentInstance(vnode) {
    const instance = {
        data: null, // 状态
        vnode, // 组件的虚拟节点
        subTree: null, // 子树
        isMounted: false, // 是否挂载完成
        update: null, // 组件更新函数
        props: {},
        attrs: {},
        propsOptions: vnode.type.props,// 用户声明的哪些属性是组件的属性
        component: null,
        proxy: null, // 用来代理props attrs data 让用户更方便的访问
    }

    return instance
}

// 初始化属性
const initProps = (instance, rawProps) => {
    const attrs = {}
    const props = {}

    const propsOptions = instance.propsOptions || {}

    if (rawProps) {
        for (let key in rawProps) {
            const value = rawProps[key]
            if (key in propsOptions) {
                props[key] = value
            } else {
                attrs[key] = value
            }
        }
    }

    instance.attrs = attrs
    instance.props = reactive(props)
}

const handler = {
    get(target, key, value) {
        const { data, props } = target
        if (data && hasOwn(data, key)) {
            return data[key]
        } else if (props && hasOwn(props, key)) {
            return props[key]
        }

        const getter = publicProperty[key]
        if (getter) {
            return getter(target)
        }
    },
    set(target, key, value, receiver) {
        const { data, props } = target
        if (data && hasOwn(data, key)) {
            data[key] = value
        } else if (props && hasOwn(props, key)) {
            // props[key] = value
            console.warn("props are readonly")
            return false
        }
        return true
    }
}

const publicProperty = {
    $attrs: (instance) => instance.attrs
}

export function setupComponent(instance) {
    // 根据propsOptions 来区分出props,attrs
    const { vnode } = instance
    initProps(instance, vnode.props)
    instance.proxy = new Proxy(instance, handler)
    const { data = () => { }, render } = vnode.type
    if (!isFunction(data)) {
        return console.warn("data options must be a function ")
    } else {
        instance.data = reactive(data.call(instance.proxy))
    }
    instance.render = render
}