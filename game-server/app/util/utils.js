var utils = module.exports;

/**
 * 根据serverID获取场次
 */
utils.getGroupLevelByServerID = function (serverID) {
    if (typeof(serverID) == "string") {
        var arr = serverID.split("-");
        if (arr.length >= 3) {
            return parseInt(arr[2]);
        }
    }
};

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
    var result = Array.isArray(origin) ? [] : {};
    for (var key in origin) {
        if (origin.hasOwnProperty(key)) {
            if (typeof origin[key] === 'object') {
                result[key] = utils.clone(origin[key]);
            } else {
                result[key] = origin[key];
            }
        }
    }
    return result;
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
};

utils.randomNum = function (minNum, maxNum){
    if (minNum == undefined || minNum == null) {
        minNum = 0;
    }

    if (maxNum == undefined || maxNum == null) {
        maxNum = 10;
    }

    var delta = maxNum + 1 - minNum;

    return Math.floor(Math.random() * delta) + minNum;
}