var _ = require('underscore'),
    esprima = require('esprima'),
    escodegen = require("escodegen");

/*
 * A map that groups together types of AST nodes.
 * This map doesn't have to be complete, but only nodes listed here will support replace/prefix/suffix 
 * operations properly.
 *
 * See the SpiderMonkeyAPI for the full list:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API
 **/
var syntaxMap = {
    //Nodes that contain arrays of statements. 
    BlockContainer: [
        "Program",
        "BlockStatement"
    ],
    Statement: [
        "EmptyStatement",
        "ExpressionStatement",
        "IfStatement",
        "LabeledStatement",
        "BreakStatement",
        "ContinueStatement",
        "WithStatement",
        "SwitchStatement",
        "ReturnStatement",
        "ThrowStatement",
        "TryStatement",
        "WhileStatement",
        "DoWhileStatement",
        "ForStatement",
        "ForInStatement",
        "ForOfStatement",
        "LetStatement",
        "DebuggerStatement",
        "FunctionDeclaration",
        "VariableDeclaration",
        "VariableDeclarator",
    ],
    Expression: [
        "ThisExpression",
        "ArrayExpression",
        "ObjectExpression",
        "FunctionExpression",
        "ArrowExpression",
        "SequenceExpression",
        "UnaryExpression",
        "BinaryExpression",
        "AssignmentExpression",
        "UpdateExpression",
        "LogicalExpression",
        "ConditionalExpression",
        "NewExpression",
        "CallExpression",
        "MemberExpression",
        "ComprehensionExpression",
        "GeneratorExpression",
        "GraphExpression",
        "YieldExpression",
        "GraphIndexExpression",
        "LetExpression",
        "Literal",
        "Identifier"
    ]
};

//A list of all the types, like [Identifier, CallExpression,...]
var types = _.chain(syntaxMap)
    .map(function(nodeTypes, key) {
        return  nodeTypes;
    })
    .flatten()
    .value();

//A base AST node prototype
var AstNode = _.chain(types)
    //First we create is<NodeType> methods for all types, like isLiteral, isFunctionCall, etc. 
    //These return false by default. 
    .map(function(type) {
        var x = {};
        x["is" + type] = function() {
            return false;
        };
        return x;
    })
    .reduce(function(acc, node) {
        return _.extend(acc, node)
    }, {})
    //Now we attach the core API methods.
    .extend({
        /**
         * @return Object
         * The SpiderMonkey AST for this ASTNode
         **/
        unwrap: function() {
            return (function _unwrap(node) {
                if (_.isArray(node)) {
                    return _.map(node, _unwrap);
                } else if (!_.isObject(node)) {
                    return node;
                } else {
                    var newdata = {};
                    _.each(_.keys(node.data), function(key) {
                        newdata[key] = _unwrap(node.data[key]);
                    })
                    return newdata;
                }
            })(this);
        },
        /**
         * Walk the tree starting at this node, calling the callback along the way.
         ***/
        walk: function(callback) {
            (function _walk(node, callback) {
                if (_.isArray(node)) {
                    _.each(node, function(n) {
                        _walk(n, callback);
                    });
                } else if (_.isObject(node)) {
                    callback(node);
                    _.each(_.values(node.data), function(datum) {
                        _walk(datum, callback);
                    });
                }
            })(this, callback);
            return this;
        },
        /**
         * Turn the AST back into codez
         ***/
        deparse: function() {
            return generateCode(this.unwrap());
        },
        /**
         * Replace this node.
         *
         * @param String code
         * A string to be parsed and used as the replacement for this node. 
         ***/
        replace: function(code) {
            var newNode = this.parseAndExtractCorrespondingNode(code); 
            if (this.parentArrayIndex === false) {
                this.parent.data[this.parentKey] = newNode;
            } else {
                this.parent.data[this.parentKey][this.parentArrayIndex] = newNode;
            }
        },
    })
    .value();

/**** Traits for functionality that is common across node types **/ 
ExpressionTrait = _.extend({}, {
    parseAndExtractCorrespondingNode: function(code) {
        var node = astblaster(esprima.parse(code));
        if (node.body().length > 1) {
            throw "Expected a single statement and got multiple";
        } else if (node.body().length == 0) {
            throw "Expected a single statement and found nothing.";
        } else {
            return node.body()[0].expression(); 
        }
    }    
});

StatementTrait = _.extend({}, {
    parseAndExtractCorrespondingNode: function(code) {
        var node = astblaster(esprima.parse(code));
        if (node.body().length > 1) {
            throw "Expected a single statement and got multiple";
        } else if (node.body().length == 0) {
            throw "Expected a single statement and found nothing.";
        } else {
            return node.body()[0];
        }
    },
    /**
     * Insert a statement before or after the current node.
     *
     * @param String code
     * The code to be parsed and inserted as a new node in the AST.
     *
     * @param bool append
     * A flag indicating whether to insert the new new after or before the current node 
     ***/
    affix: function(code, prefix) {
        if (this.parentArrayIndex === false) {
            throw "Cannot prepend an AST node that isn't part of a block";
        }
        var newNode = this.parseAndExtractCorrespondingNode(code),
            index = (prefix) ? this.parentArrayIndex : this.parentArrayIndex + 1;

        this.parent.data[this.parentKey] = this.parent.data[this.parentKey]
            .slice(0, index)
            .concat([newNode])
            .concat(this.parent.data[this.parentKey].slice(index)); 
    },
    /**
     * Parse the code, and prepend this node with the result. 
     * Will only work in arrays like the body of a program or a function.
     ***/
     prefix: function(code) {
         this.affix(code, true);
     },
    /**
     * Parse the code, and append this node with the result. 
     * Will only work in arrays like the body of a program or a function.
     ***/
     suffix: function(code) {
         this.affix(code, false);
     }
});

var traits = {
    "Statement": StatementTrait,
    "Expression": ExpressionTrait
};

//A map from node types to their prototypes.
var nodeTypePrototypes = _.chain(syntaxMap)
    .map(function(nodeTypes, trait) {
        return _.chain(nodeTypes)
            .map(function(nodeType) {
                var x = {};
                x["is" + nodeType] =  function() {
                    return true;
                };

                return [ 
                    nodeType, 
                    _.extend(
                        {},
                        AstNode, 
                        x, 
                        //Layer in traits
                        (_.has(traits, trait)) ? traits[trait] : {}
                    )
                ];
            })
            .object()
            .value();
    })
    .reduce(function(acc, nodes) {
        return _.extend(acc, nodes);
    }, {})
    .value();

var generateCode = function(code) {
    return escodegen.generate(code, {
        format: {
            semicolons: false
        }
    });
};

//Now add NodeType-specific functionality. Typically these are shortcuts. 
nodeTypePrototypes.Program = _.extend(nodeTypePrototypes.Program, {
    body: function() {
        return this.data.body
    }
});  


nodeTypePrototypes.Literal = _.extend(nodeTypePrototypes.Literal, {
    /**
     * Gets and optionally sets the value of the node.
     * @param newValue 
     **/
    value: function(newValue) {
        if (!_.isUndefined(newValue)) {
            this.data.value = newValue;
        }

        return this.data.value  
    }
});  


nodeTypePrototypes.ExpressionStatement = _.extend(nodeTypePrototypes.ExpressionStatement, {
    expression: function() {
        return this.data.expression;
    }
});  

nodeTypePrototypes.BinaryExpression = _.extend(nodeTypePrototypes.BinaryExpression, {
});  

nodeTypePrototypes.CallExpression = _.extend(nodeTypePrototypes.CallExpression, {
    calleeName: function() {
        if (this.data.callee
             && this.data.callee.isIdentifier()) {
            return this.data.callee.name(); 
        } 
        return null;
    },
    arguments: function() {
        return this.data.arguments;
    },
});  

nodeTypePrototypes.Identifier = _.extend(nodeTypePrototypes.Identifier, {
    isIdentifier: function() {
        return true;
    },
    /**
     * @return name
     ***/
    name: function() {
        return this.raw_node.name;
    }
});  


/**
 * Recursively wraps the raw node produced by esprima in a more useful object.  
 * If the input is some leaf attribute, like "value", or "type", this will return that value. 
 *
 * @param node
 * The SpiderMonkey AST node. 
 *
 * @parem node
 * A pointer to the parent of this node. Should be unspecified for the root.
 *
 * @parem node
 * They key in the parent's data that defines this node. 
 *
 * @param bool arrayIndex 
 * If this node is a part of an array in it's parent, what index is it?
 * Should be set to false if this node isn't part of an array.
 *
 ***/
var astblaster = function(node, parent, parentKey, arrayIndex) {
    var arrayIndex = _.isNumber(arrayIndex) ? arrayIndex : false; 

    if (_.isArray(node)) {
        return _.map(node, function(x, index) {
            return astblaster(x, parent, parentKey, index);
        }); 
    } else if (!_.isObject(node)) {
        return node;
    }

    var astPrototype = _.has(nodeTypePrototypes, node.type) ?
        nodeTypePrototypes[node.type] :
        AstNode;

    var wrappedNode = Object.create(
        astPrototype, 
        {
            parent: {
                value: parent,
            }, 
            parentKey: {
                value: parentKey,
            }, 
            parentArrayIndex: {
                value: arrayIndex
            },
            cache: {
                value: {}
            }
        } 
    );

    wrappedNode.data = function(){
        var data = {};
        _.each(_.keys(node), function(key){
            data[key] = astblaster(node[key], wrappedNode, key);
        });
        return data;
    }();

    return wrappedNode;
};

module.exports = astblaster;
