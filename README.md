# lavats-validate
lavats-validate是一个由typescript写成的类型验证器。

支持同步、异步验证。

## 文档
[文档链接](https://xiaozs.github.io/lavats-validate/)

## 安装
在命令行中输入：
```
npm install lavats-validate
```

## 引入

### cmd
```javascript
var Type = require("lavats-validate").Type;
```

### amd
```javascript
require(["lavats-validate"], function(validate) {
    var Type = validate.Type;
})
```
```javascript
define(["lavats-validate"], function(validate) {
    var Type = validate.Type;
})
```

### es6
```javascript
import { Type } from "lavats-validate";
```

### \<script>
```html
<script src="./node_modules/lavats-validate/dist/index.js"></script>
<script>

var Type = lavatsValidate.Type;

</script>
```

## 使用

* 配置类型
```js
import { Type } from "lavats-validate";

// 任何类型
let type = Type.any;

// 数组类型
type = Type.array();

// 数组类型，带子元素类型验证，或逻辑
type = Type.array([
    Type.string,    // 字符串类型
    Type.number,    // 数字类型
]);

// 数组类型，长度校验
type = Type.array.length(5);               // 5 <= length
type = Type.array.length(5, 10);           // 5 <= length <= 10
type = Type.array.length(5, 10, false);    // 5 <= length <  10

// 布尔类型
type = Type.boolean;

// 日期类型
type = Type.date;

// 日期类型，范围校验
type = Type.date.range(date);               // date <= range
type = Type.date.range(date1, date2);       // date1 <= range <= date2
type = Type.date.range(date1, date2, false);// date1 <= range <  date2

// 枚举类型, 值可以是 "1" 或 1 或 null
type = Type.enum(["1", 1, null]);

// 函数类型
type = Type.function;

// 数字类型
type = Type.number;

// 数字类型，整数
type = Type.number.int;

// 数字类型，浮点数
type = Type.number.float;

// 数字类型，范围校验
type = Type.number.range(5);               // 5 <= range
type = Type.number.range(5, 10);           // 5 <= range <= 10
type = Type.number.range(5, 10, false);    // 5 <= range <  10

// 对象类型
type = Type.object()

// 对象类型，特定类型
class Test {

}
type = Type.object().type(Test)

// 对象类型，带属性类型校验，与逻辑
type = Type.object({
    key1: Type.string,  // 字符串类型
    key2: Type.string   // 字符串类型
})

// 正则类型
type = Type.regExp;

// 字符串类型
type = Type.string;

// 字符串类型，长度校验
type = Type.string.length(5);               // 5 <= length
type = Type.string.length(5, 10);           // 5 <= length <= 10
type = Type.string.length(5, 10, false);    // 5 <= length <  10

// 字符串类型，正则校验
type = Type.string.pattern(/^[0-9]+$/);

// 可空类型
type = type.nullable;

// 自定义校验，同步
type = type.custom(val => {
    let isError = true;
    if(isError) return "errorMessage";
})

// 自定义校验，异步
type = type.custom(async val => {
    await wait(10);
    let isError = true;
    if(isError) return "errorMessage";
})

```

* 同步校验
```js
let type = Type.object({
    key1: Type.string.nullable,
    key2: Type.string
});

let res = Type.checkSync({
    key2: 1
})

res   // => [{ path: ["key2"], errorMessage: "不是字符串" }]

try {
    Type.validate({ key2: 1 });
} catch(e) {
    e // => [{ path: ["key2"], errorMessage: "不是字符串" }]
}

```

* 异步校验
```js
let type = Type.object({
    key1: Type.string.custom(async val => {
        await wait(10);
        if(val !== "async") return "字符串不为'async'"; 
    }),
    key2: Type.string
});

let item = {
    key1: "sync",
    key2: ""
};

let res = await Type.check(item)
res   // => [{ path: ["key1"], errorMessage: "字符串不为'async'" }]

try {
    Type.validate({ key2: 1 });
} catch(e) {
    e // => [{ path: ["key1"], errorMessage: "字符串不为'async'" }]
}

```

* 获取异步校验函数
```js
let type = Type.object({
    key1: Type.string.custom(async val => {
        await wait(10);
        if(val !== "async") return "字符串不为'async'"; 
    }),
    key2: Type.string
});

let item = {
    key1: "sync",
    key2: ""
};

let Checker = type.getAsyncChecker();
let validator = type.getAsyncValidator();

let res = await checker(item);
res   // => [{ path: ["key1"], errorMessage: "字符串不为'async'" }]

try {
    validator({ key2: 1 });
} catch(e) {
    e // => [{ path: ["key1"], errorMessage: "字符串不为'async'" }]
}

```

* 获取同步校验函数
```js
let type = Type.object({
    key1: Type.string.nullable,
    key2: Type.string
});

let item = {
    key2: 1
};

let checker = type.getSyncChecker();
let validator = type.getSyncValidator();

let res = checker(item);
res   // => [{ path: ["key2"], errorMessage: "不是字符串" }]

try {
    validator(item);
} catch(e) {
    e // => [{ path: ["key2"], errorMessage: "不是字符串" }]
}

```

## 注意
当检验类型中含有异步校验时，不能使用同步方法进行校验，否则将抛出异常
```js
let type = Type.any.custom(async val => {
    await wait(10);
});

try {
    let res = type.checkSync({});
} catch(e) {
    e // => new Error("该类型不能使用同步校验")
}
```

## 复杂校验
`Type`的每一次`.`操作都会生成一个新的`Type`对象，所以可以通过不断的进行链式调用，丰富校验的描述
```js
let type = Type.object({
    key1: Type.object().nullable.custom(obj => {
        let keys = Object.keys(obj);
        if(keys.length < 10) return "对象字段不足10个";
    }),
    key2: Type.array([
        Type.string.nullable.length(5, 10),
        Type.number.float.range(5, 10)
    ]).nullable
})
```