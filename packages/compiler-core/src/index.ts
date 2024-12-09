// 1.模板转为ast语法树
// 2.生成codegennode
// 3.转换成render函数

import { NodeTypes } from "./ast"


export function parse(template) {
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
        if (c.startsWith("{{")) { // 表达式 {{ xxx }}
            // node = parseInterpolation(context)
        } else if (c[0] === "<") { // 元素标签
            // node = parseElement(context)
        } else { // 文本
            node = parseText(context)
            console.log("node", node)
            break
        }
        nodes.push(node)
    }
    return nodes
}


function parseInterpolation() {

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
    const start = getCursor(context)
    // 0 - endIndex为文字内容
    let content = parseTextData(context, endIndex)
    return {
        type: NodeTypes.TEXT,
        content,
        loc: getSelection(context, start)
    }
}

function parseTextData(context, endIndex) {
    const content = context.source.slice(0, endIndex)
    advanceBy(context, endIndex)
    return content
}

function parseTag(context) {
    const start = getCursor(context)
    const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
    const tag = match[1]
    advanceBy(context, match[0].length)
    advanceSpaces(context)
    const isSelfClosing = context.source.startsWith("/>")
    advanceBy(context, isSelfClosing ? 2 : 1)
    return {
        type: NodeTypes.ELEMENT,
        tag,
        isSelfClosing,
        loc: getSelection(context, start)
    }
}

function parseElement(context) {
    const ele = parseTag(context);
    if (context.source.startsWith("</")) {
        parseTag(context) // 闭合标签直接移除
    }
    (ele as any).children = [];
    (ele as any).loc = getSelection(context, ele.loc.start);
    return ele
}

function advanceBy(context, endIndex) {
    // 每次删掉内容的时候 都需要更新最新的行列和偏移量信息
    let source = context.source
    advancePositionWithMutation(context, source, endIndex)
    context.source = source.slice(endIndex)
}

function advancePositionWithMutation(context, source, endIndex) {
    let linesCount = 0
    let linePos = -1
    for (let i = 0; i < endIndex; i++) {
        if (source.charCodeAt(i) === 10) { // 换行
            linesCount++
            linePos = i
        }
    }
    context.line += linesCount
    context.column = linePos === -1 ? context.column + endIndex : endIndex - linePos
    context.offset += endIndex
}

function advanceSpaces(context) {
    const match = /^[ \t\r\n]+/.exec(context.source);
    if (match) {
        // 删除空格
        advanceBy(context, match[0].length);
    }
}


function getSelection(context, start, e?) {
    let end = e || getCursor(context);
    // eslint 可以根据 start，end找到要报错的位置
    return {
        start,
        end,
        source: context.originalSource.slice(start.offset, end.offset),
    };
}

function getCursor(context) {
    let { line, column, offset } = context;
    return { line, column, offset };
}

function isEnd(context) {
    const c = context.source
    if (c.startsWith("</")) return true
    return !context.source
}




