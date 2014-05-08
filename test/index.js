
var astronaut = require('../src/index.js'),
    esprima = require("esprima"),
    escodegen = require("escodegen"), 
    _ = require('underscore');

var onePlusOne = esprima.parse("1 + 1"); 

module.exports = {
    testDeparse: function(test) {
        test.equals(
            "1",
            astronaut(esprima.parse("1")).deparse()
        );
        test.done();
    },
    testPassingCode: function(test) {
        test.equals(
            "1 + 1",
            astronaut("1 + 1").deparse()
        );
        test.done();
    },
    testWalk: function(test) {
        var calls = 0;
        
        astronaut(onePlusOne).walk(function(node) {
            calls++;
        });
        test.equals(5,calls);
        test.done();
    },
    testReduce: function(test) {
        var calls = astronaut(onePlusOne).reduce(0, function(acc, node) {
            return acc + 1;
        });
        test.equals(5,calls);
        test.done();
    },
    testUpdatingLiteralValues: function(test) {
        test.equals(
            "2 + 2",
            astronaut(onePlusOne).walk(function(node) {
                if (node.isLiteral()
                        && node.value() === 1) {
                    node.value(2);
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testReplace: function(test) {
        test.equals(
            "2 + 2",
            astronaut(onePlusOne).walk(function(node) {
                if (node.isLiteral()
                        && node.value() === 1) {
                    node.replace("2");
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testMap: function(test) {
        test.equals(
            "2 + 2",
            astronaut(onePlusOne).map(function(node) {
                if (node.isLiteral()
                        && node.value() === 1) {
                    return "2"; 
                }
            }).deparse()
        );
        test.done();
    },
    testReplaceStatement: function(test) {
        test.equals(
            "2 + 2",
            astronaut(onePlusOne).walk(function(node) {
                if (node.isExpressionStatement()) {
                    node.replace("2 + 2");
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testReplacePrepend: function(test) {
        test.equals(
            "2 + 2;\n1 + 1",
            astronaut(onePlusOne).walk(function(node) {
                if (node.isExpressionStatement()) {
                    node.prefix("2 + 2");
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testAppend: function(test) {
        test.equals(
            "1 + 1;\n2 + 2",
            astronaut(onePlusOne).walk(function(node) {
                if (node.isExpressionStatement()) {
                    node.affix("2 + 2");
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testWrap: function(test) {
        test.equals(
            "1 + 2 + f(5)",
            astronaut("1 + 2 + 5").walk(function(node) {
                if (node.isLiteral() && node.value() === 5) {
                    node.wrap("f(<%= node %>)");
                }
                return node;
            }).deparse()
        );
        test.done();
    },
    testComplexExampleWithChildConditions: function(test) {
        var options = {
            format: {
                compact: true,
            }
        };

        var code = "f(); f(1, [1,2,3]);";
        test.equals(
            "f();g([1,2,3]);f(1,[1,2,3]);",
            astronaut(code).walk(function(node) {
                if (node.isCallExpression() 
                        && node.calleeName() === "f"
                        && node.arguments().length > 1
                        && node.arguments()[1].isArrayExpression()) {
                    node.prefix("g(" + node.arguments()[1].deparse(options) + ')');
                }
            }).deparse(options)
        );
        test.done();
    },
    testRegex: function(test) {
        var code = '/(.[^.]+)$/g';
        var astro = astronaut(code);
        test.equals(
            code,
            astro.deparse()
        )
        test.done();
    },
    testWrapFunctionBody: function(test) {
        var code = "function f(a) { return a; }";
        var options = {
            format: {
                compact: true,
            }
        };


        test.equals(
            "function f(a){try{return a;}catch(e){}}",
            astronaut(code).walk(function(node) {
                if (node.isBlockStatement() && node.parent.isFunctionDeclaration()) {
                    node.wrap("try { <%= node %> } catch(e) {}");
                }
            }).deparse(options)
        )
        test.done();
    },
    testWrapFunctionExpressionBody: function(test) {
        var code = "var x = function(a) { return a; }";
        var options = {
            format: {
                compact: true,
            }
        };


        test.equals(
            "var x=function(a){try{return a;}catch(e){}};",
            astronaut(code).walk(function(node) {
                if (node.isBlockStatement()) {
                    node.wrap("try { <%= node %> } catch(e) {}");
                }
            }).deparse(options)
        )
        test.done();
    }

};
