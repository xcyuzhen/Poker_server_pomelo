var utils = module.exports;

var print_r;
print_r = function (obj, indent) {
  if (typeof(obj) === "function") {
    return "Function";
  }
    if (typeof(obj) !== "object") {
        return obj;
    }
    var result_str = "";
    indent = indent || 0;
    for (var key in obj) {
      var val = obj[key];
        if (typeof(key) === "string") {
            key = "\"" + key + "\"";
        }
        var szSuffix = "";
        if (typeof(val) == "object") {
            szSuffix = "{";
        }
        var szPrefix = new Array(indent + 1).join("    ");
        var formatting = szPrefix + "[" + key + "]" + " = " + szSuffix;
        if (typeof(val) == "object") {
            result_str = result_str + formatting + "\n" + print_r(val, indent + 1) + szPrefix + "},\n"
        } else {
            var szValue = print_r(val)
            result_str = result_str + formatting + szValue + ",\n"
        }
    }
    return result_str;
};

/**
 * 检查mid是否合法
 */
utils.midCheck = function (mid) {
    if (mid && mid > 0) {
        return true;
    }

    return false;
};

/**
 * print object
 */
utils.printObj = function (obj) {
    console.log(print_r(obj));
};

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function(cb) {
    if(!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * clone an object
 */
utils.clone = function(origin) {
    if(!origin) {
        return;
    }

    var obj = {};
    for(var f in origin) {
        if(origin.hasOwnProperty(f)) {
            obj[f] = origin[f];
        }
    }
    return obj;
};

utils.size = function(obj) {
    if(!obj) {
        return 0;
    }

    var size = 0;
    for(var f in obj) {
        if(obj.hasOwnProperty(f)) {
            size++;
        }
    }

    return size;
};

// print the file name and the line number ~ begin
function getStack(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
        return stack;
    };
    var err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
}

function getFileName(stack) {
    return stack[1].getFileName();
}

function getLineNumber(stack){
    return stack[1].getLineNumber();
}

utils.debugTrace = function() {
    if (isPrintFlag) {
        var len = arguments.length;
        if(len <= 0) {
            return;
        }
        var stack = getStack();
        var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
        for(var i = 0; i < len; ++i) {
            aimStr += arguments[i] + ' ';
        }
        console.log('\n' + aimStr);
    }
};

utils.randomNum = function (minNum, maxNum){ 
    switch(arguments.length){ 
        case 1: 
            return parseInt(Math.random()*minNum+1,10); 
            break; 
        case 2: 
            return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10); 
            break; 
        default: 
            return 0; 
            break; 
    } 
}