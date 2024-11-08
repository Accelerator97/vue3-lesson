export function effect(fn, options?) {
    // 创建一个effect,只要依赖的属性变化就要执行回调
    const _effect = new ReactiveEffect(fn, () => {
        _effect.run()
    })
    _effect.run()
    return _effect
}

export let activeEffect

class ReactiveEffect {
    _trackId = 0 // 用于记录effect执行了几次
    deps = [] // 用于记录存放了哪些依赖
    _depLength = 0 // 依赖项下标
    public active = true //  创建的effect默认为响应式

    // fn 用户编写的函数 public是让属性直接挂在到实例上
    // 如果fn中依赖的数据发生变化后，需要重新调用 即调用run方法
    constructor(public fn, public scheduler) { }

    run() {
        if (!this.active) { // 非响应式 执行完啥也不干
            return this.fn()
        }
        // 针对effect里面内嵌effect的处理
        let lastEffect = activeEffect
        try {
            activeEffect = this
            return this.fn()
        } finally {
            activeEffect = lastEffect
        }
    }
}

// 双向记忆 effect记录deps deps收集effect
export function trackEffect(effect, dep) {
    dep.set(effect, effect._trackId)
    // effect和dep关联
    effect.deps[effect._depLength++] = dep
}

export function triggerEffect(dep) {
    for (const effect of dep.keys()) {
        if (effect.scheduler) {
            effect.scheduler()
        }
    }
}