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
            node.wrap('<%= expression %>');
        }
    })
    .deparse()
//'1 + f(5)'
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
### AstNode.is<NodeType>()
Returns a boolean indicating whether or note the node is of the specified type. 
### AstNode.unwrap()
Returns the SpiderMonkey AST for this node.
### AstNode.walk(callback)
Walk the AST starting at this node, calling the callback along the way.
### AstNode.deparse()
A shortcut for escodegen.generate(AstNode.unwrap()) 
### AstNode.wrap(codeOrTemplate)
Wrap the current expression in the expression specified by an underscore template.
The current expression should be represented as "expression" in the template. For
example:
node.wrap("f(<%= expression>)")

This method is only available for expression nodes.
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
