var _ = require('underscore'),
    esprima = require('esprima'),
    escodegen = require("escodegen");

//An array of the AST types that are currently supported
var supportedTypes = [
    "Program",
    "ExpressionStatement",
    "BinaryExpression",
    "Literal",
    "CallExpression",
    "Identifier"
];

//A dictionary from AST types to their node types.
var classManifest = {};

var generateCode = function(code) {
    return escodegen.generate(code, {
        format: {
            semicolons: false
        }
    });
};

//A Generic AST node.
AstNode = {
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
};

//Set isType functions like "isLiteral", "isExpressionStatement", etc 
_.each(supportedTypes, function(type) {
    AstNode["is" + type] = function() {
        return false;
    };
});

ProgramNode = _.extend({}, AstNode, {
    isProgram: function() {
        return true;
    },
    body: function() {
        return this.data.body
    }
});  
classManifest["Program"] = ProgramNode;

ExpressionTrait = _.extend({}, {
    parseAndExtractCorrespondingNode: function(code) {
        var node = wrapNode(esprima.parse(code));
        if (node.body().length > 1) {
            throw new Exception("Expected a single statement and got multiple");
        } else if (node.body().length == 0) {
            throw new Exception("Expected a single statement and found nothing.");
        } else {
            return node.body()[0].expression(); 
        }
    }    
});

StatementTrait = _.extend({}, {
    parseAndExtractCorrespondingNode: function(code) {
        var node = wrapNode(esprima.parse(code));
        if (node.body().length > 1) {
            throw new Exception("Expected a single statement and got multiple");
        } else if (node.body().length == 0) {
            throw new Exception("Expected a single statement and found nothing.");
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
            throw new Exception("Cannot prepend an AST node that isn't part of a block");
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
})


LiteralNode = _.extend({}, AstNode, ExpressionTrait, {
    isLiteral: function() {
        return true;
    },
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
classManifest["Literal"] = LiteralNode;

ExpressionStatementNode = _.extend({}, AstNode, StatementTrait, {
    isExpressionStatement: function() {
        return true;
    },
    expression: function() {
        return this.data.expression;
    }
});  
classManifest["ExpressionStatement"] = ExpressionStatementNode;

BinaryExpressionNode = _.extend({}, AstNode, ExpressionTrait, {
    isBinaryExpression: function() {
        return true;
    }
});  
classManifest["BinaryExpression"] = BinaryExpressionNode;

CallExpressionNode = _.extend({}, AstNode, ExpressionTrait, {
    isCallExpression: function() {
        return true;
    },
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
classManifest["CallExpression"] = CallExpressionNode; 

IdentifierNode = _.extend({}, AstNode, ExpressionTrait, {
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
classManifest["Identifier"] = IdentifierNode;


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
var wrapNode = function(node, parent, parentKey, arrayIndex) {
    var arrayIndex = _.isNumber(arrayIndex) ? arrayIndex : false; 

    if (_.isArray(node)) {
        return _.map(node, function(x, index) {
            return wrapNode(x, parent, parentKey, index);
        }); 
    } else if (!_.isObject(node)) {
        return node;
    }

    var astClass = _.has(classManifest, node.type) ?
        classManifest[node.type] :
        AstNode;

    var wrappedNode = Object.create(
        astClass, 
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
            data[key] = wrapNode(node[key], wrappedNode, key);
        });
        return data;
    }();

    return wrappedNode;
};

module.exports = wrapNode;
