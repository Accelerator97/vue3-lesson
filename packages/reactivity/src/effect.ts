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
    _trackId = 0 // 用于记录effect执行了几次 防止一个属性在effect中多次收集依赖
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
            // effect执行前，需要将上一次的依赖清空 effect.deps
            preCleanEffect(this)
            return this.fn()
        } finally {
            activeEffect = lastEffect
            postCleanEffect(this);
        }
    }
}

// 双向记忆 effect记录deps deps收集effect
export function trackEffect(effect, dep) {
    if (dep.get(effect) !== effect._trackId) {
        dep.set(effect, effect._trackId) // 优化多余的收集

        let oldDep = effect.deps[effect._depLength]
        if (oldDep !== dep) {
            if (oldDep) {
                // 删掉老的
                cleanDepEffect(oldDep, effect)
            }
            effect.deps[effect._depLength++] = dep
        } else {
            effect._depLength++
        }
    }
}


export function triggerEffect(dep) {
    for (const effect of dep.keys()) {
        if (effect.scheduler) {
            effect.scheduler()
        }
    }
}

function preCleanEffect(effect) {
    effect._depLength = 0
    effect._trackId++ // 每次执行id+1，如果当前同一个effect执行，id相同
}

function postCleanEffect(effect) {
    if (effect.deps.length > effect._depLength) {
        for (let i = effect._depLength; i < effect.deps.length; i++) {
            cleanDepEffect(effect.deps[i], effect)
        }
        effect.deps.length = effect._depLength
    }
}


function cleanDepEffect(dep, effect) {
    dep.delete(effect)
    if (dep.size === 0) {
        dep.cleanup()
    }
}