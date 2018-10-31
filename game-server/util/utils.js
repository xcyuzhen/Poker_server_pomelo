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

utils._debug = function (obj) {
    console.log(print_r(obj));
};