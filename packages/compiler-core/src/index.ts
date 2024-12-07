// 1.模板转为ast语法树
// 2.生成codegennode
// 3.转换成render函数

import { NodeTypes } from "./ast"





function parse(template) {
    // 根据template 产生树 
    const context = createParserContext(template)
    return createRoot(parseChildren(context))
}

function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children
    }
}

function createParserContext(content: any) {
    return {
        originalSource: content,
        source: content, // 字符串会不停减少
        line: 1,
        column: 1,
        offset: 0
    }
}

function parseChildren(context) {
    const nodes = []
    while (!isEnd(context)) {
        const c = context.source // 现在解析的内容
        let node
        if (c.startWith("{{")) {

        } else if (c[0] === "<") {
            node = parseElement(context)
        } else { // 文本
            node = parseText(context)
        }
        nodes.push(node)
    }
    return nodes
}

function parseText(context) {
    let tokens = ['<', '{{']
    let endIndex = context.source.length  // 先假设找不到
    for (let i = 0; i < tokens.length; i++) {
        const index = context.source.indexOf(tokens[i], 1) // 跳过第一个字符
        if (index !== -1 && endIndex > index) {
            endIndex = index
        }
    }
    // 0 - endIndex为文字内容
    let content = parseTextData(context, endIndex)
    return {
        type: NodeTypes.TEXT,
        content
    }
}

function parseTextData(context, endIndex) {
    const content = context.source.slice(0, endIndex)
    advanceBy(context, endIndex)
    return content
}

function parseTag(context) {
    const tag = ""
    const isSelfClosing = false

    return {
        type: NodeTypes.ELEMENT,
        tag,
        isSelfClosing
    }

}

function parseElement(context) {
    const ele = parseTag(context);
    (ele as any).children = [];
    (ele as any).loc = [];
    return ele
}

function advanceBy(context, endIndex) {
    let c = context.source
    context.source = c.slice(endIndex)
}

function isEnd(context) {
    return !context.source
}

