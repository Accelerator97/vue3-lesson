

import { nodeOps } from './nodeOps'
import patchProp from './patchProp'


const renderOptions = Object.assign(nodeOps, { patchProp })

function createRenderer() {

}


export { renderOptions }
export * from '@vue/reactivity'