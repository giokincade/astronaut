# Astronaut 
Astronaut is a library for traversing and manipulating the javascript AST.
[![Build Status](https://travis-ci.org/giokincade/astronaut.svg?branch=master)](https://travis-ci.org/giokincade/astronaut)
# Examples
Let's replace all instances of 5 with 4:
```
astronaut('1 + 5')
    .walk(function(node) { 
        if (node.isLiteral() 
                && node.value() === 5) { 
            node.value(4);
        }
    })
    .deparse()
//'1 + 4'
```
Let's replace all instances of 5 with a call to the function "f":
```
astronaut('1 + 5')
    .walk(function(node) { 
        if (node.isLiteral() 
                && node.value() === 5) { 
            node.replace('f()');
        }
    })
    .deparse()
//'1 + f()'
```
Or how about we wrap them in a call to the function f:
```
astronaut('1 + 5')
    .walk(function(node) { 
        if (node.isLiteral() 
                && node.value() === 5) { 
            node.wrap('f(<%= node %>)');
        }
    })
    .deparse()
//'1 + f(5)'
```
Let's prefix all calls to f where the second argument is an array expression with a call to g and the same array:
```
var code = "f(); f(1, [1,2,3]);";
astronaut(code).walk(function(node) {
    if (node.isCallExpression() 
            && node.calleeName() === "f"
            && node.arguments().length > 1
            && node.arguments()[1].isArrayExpression()) {
        node.prefix("g(" + node.arguments()[1].deparse() + ')');
    }
}).deparse()
//"f();g([1,2,3]);f(1,[1,2,3]);",
```
Let's wrap a function body in a try/catch:
```
var code = "function f(a) { return a; }";
astronaut(code).walk(function(node) {
    if (node.isBlockStatement() && node.parent.isFunctionDeclaration()) {
        node.wrap("try { <%= node %> } catch(e) {} }");
    }
}).deparse()
//"function f(a) { try { return a; } catch(e) {} }";
```

# Api
## astronaut
```
var astronaut = require('astronaut')
```
Astronaut takes a string to be parsed (using Esprima), or an already-parsed Esprima/SpiderMonkey AST, and returns
an AstNode.

## AstNode
### AstNode.data 
The SpiderMonkey AST data for this node, with sub-nodes wrapped in AstNodes. Updates to this mutate the tree, 
but for non-primitive values it's recommended to use the replace/wrap functions.
### AstNode.parent
A pointer to the parent of this node 
### AstNode.parentKey
The key in the parent that points to this node.
### AstNode.parentArrayIndex
If parent[key] is an array, the index of this node in that array. This enables affix functions. 
### AstNode.is &lt;NodeType&gt;()
Returns a boolean indicating whether or note the node is of the specified type. 
### AstNode.ast()
Returns the SpiderMonkey AST for this node.
### AstNode.walk(callback)
Walk the AST starting at this node, calling the callback along the way.
### AstNode.map(callback)
Walk the tree, replacing nodes with new nodes produced by callback(node). 
To avoid thrashing the tree, if the callback returns null/undefined, no replacement occurs. 
### AstNode.reduce(accumulator, callback)
Reduce the tree down to a single value. 
`callback` should be a function that expects the accumulator as the first argument, the current node as the second, and returns the new accumulator.
### AstNode.deparse(options)
A shortcut for escodegen.generate(AstNode.ast(), options) 
### AstNode.wrap(codeOrTemplate)
Wrap the current node in the code specified by an underscore template. The template can be a string to be parsed or a compiled template. The current node should be represented as `node` in the template. For
example:
node.wrap("f(<%= node =>)")

### AstNode.replace(code)
Replace the current node with the results of parsing the input `code` 
### AstNode.prefix(code)
Insert the statement specified in code prior to the statement encoded by the current node. 
### AstNode.suffix(code)
Insert the statement specified in code after the statement encoded by the current node. 

# Installation 
```
npm install astronaut
```
# Acknowledgements 
I was inspired by [burrito](https://github.com/substack/node-burrito), but was dissapointed by the lack of child pointers and wanted something that supported the Esprima AST. 
[Falafel](https://github.com/substack/node-falafel) seems like it may have solved both problems.
