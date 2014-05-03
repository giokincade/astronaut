
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

};