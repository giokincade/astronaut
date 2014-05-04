# Astronaut 
Astronaut is a library for traversing and manipulating the javascript AST.

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
Or how about we wrap them in the function f:
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
# Installation 
```
npm install astronaut
```
