import { test } from "qunit";

interface MessageType {
    "object.base": string,
    "object.type": string,
    "string.base": string,
    "string.length.min": string,
    "string.length.max": string,
    "string.pattern": string,
    "number.base": string,
    "number.int": string,
    "number.float": string,
    "number.range.min": string,
    "number.range.max": string,
    "boolean.base": string,
    "function.base": string,
    "regExp.base": string,
    "array.base": string,
    "array.types": string,
    "array.length.min": string,
    "array.length.max": string,
    "any.base": string,
    "date.base": string,
    "date.range.min": string,
    "date.range.max": string,
    "enum.base": string,
}

/**
 * 错误文本表
 */
let errorMessages: MessageType = {
    "object.base": "不是对象",
    "object.type": "类型不是{0}",
    "string.base": "不是字符串",
    "string.length.min": "长度小于{0}",
    "string.length.max": "长度大于{1}",
    "string.pattern": "不符合模式{0}",
    "number.base": "不是数字",
    "number.int": "不是整数",
    "number.float": "不是浮点数",
    "number.range.min": "小于{0}",
    "number.range.max": "大于{1}",
    "boolean.base": "不是布尔值",
    "function.base": "不是函数",
    "regExp.base": "不是正则表达式",
    "array.base": "不是数组",
    "array.types": "没有匹配类型",
    "array.length.min": "数组长度小于{0}",
    "array.length.max": "数组长度大于{1}",
    "any.base": "",
    "date.base": "不是日期",
    "date.range.min": "日期小于{0}",
    "date.range.max": "日期大于{1}",
    "enum.base": "不在枚举值中{0}"
}

/**
 * 配置错误文本
 * @param errors 错误文本
 */
export function config(errors: Partial<MessageType>) {
    errorMessages = Object.assign({}, errorMessages, errors);
}

/**
 * 获取文本
 * @param key 文本索引
 */
function getMessage(key: keyof MessageType, args: IArguments) {
    return errorMessages[key].replace(/{([0-9]+)}/, ($$, $1) => {
        return args[$1].toString();
    })
}

/**
 * 验证器函数
 */
export interface Validator {
    /**
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    (value: any, object?: any, key?: string, path?: string[]): Promise<string | void> | string | void;
}

/**
 * 对象描述器
 */
export interface Descriptor {
    [key: string]: Type;
}

/**
 * 错误信息
 */
export interface ErrorMessage {
    /**
     * 错误发生的路径
     */
    path: string[];
    /**
     * 错误信息
     */
    message: string;
}

/**
 * 构造函数
 */
export interface IConstructor<T, Args extends any[]> {
    new(...args: Args[]): T;
}

/**
 * 用于复制对象的属性表
 */
const paramArr: { constructor: Function, key: string, index: number }[] = [];

/**
 * 装饰器，用于指明构造函数参数应该来自哪个字段
 * @param key 被复制的字段
 */
function param(key: string) {
    return function (fn: any, _: any, index: number) {
        paramArr.push({
            constructor: fn,
            key,
            index
        });
    }
}

/**
 * 类型描述类
 */
export abstract class Type {
    /**
     * 生成对象描述类
     * @param descriptor 对象描述符
     */
    static object(descriptor?: Descriptor) {
        return new ObjectType(descriptor);
    }

    /**
     * 生成字符串描述类
     */
    static get string() {
        return new StringType();
    }

    /**
     * 生成数字描述类
     */
    static get number() {
        return new NumberType();
    }

    /**
     * 生成布尔描述类
     */
    static get boolean() {
        return new BooleanType();
    }

    /**
     * 生成函数描述类
     */
    static get function() {
        return new FunctionType();
    }

    /**
     * 生成正则描述类
     */
    static get regExp() {
        return new RegExpType();
    }

    /**
     * 生成数组描述类
     * @param types 数组元素类型描述，只需满足一个就能通过检查
     */
    static array(types?: Type[]) {
        return new ArrayType(types);
    }

    /**
     * 生成任意描述类
     */
    static get any() {
        return new AnyType();
    }

    /**
     * 生成枚举描述类
     * @param enumItems 枚举值
     */
    static enum(enumItems: any[]) {
        return new EnumType(enumItems);
    }

    /**
     * 生成日期描述类
     */
    static get date() {
        return new DateType();
    }

    /**
     * 自定义验证器数组
     */
    protected validators: Validator[] = [];

    /**
     * 基础验证方法，同步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    abstract baseValidateSync(value: any, object?: any, key?: string | undefined, path?: string[]): ErrorMessage[];

    /**
     * 基础验证方法，异步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    async baseValidate(value: any, object?: any, key?: string | undefined, path?: string[]): Promise<ErrorMessage[]> {
        // @ts-ignore
        return this.baseValidateSync(...arguments);
    }

    /**
     * 复制描述类
     */
    copy(): this {
        let params = paramArr
            .filter(it => it.constructor === this.constructor)
            .map(it => {
                let value = (this as any)[it.key];
                if (Array.isArray(value)) return [...value];
                if (typeof value === "object") return { ...value };
                return value;
            })

        // @ts-ignore
        let obj = new this.constructor(...params);
        obj.isNullable = this.isNullable;
        return obj;
    }

    /**
     * 检查对象，并返回错误信息，同步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    checkSync(value: any, object?: any, key?: string, path: string[] = []): ErrorMessage[] {
        if (this.isNullable) {
            let isNull = value === null || value === undefined;
            if (isNull) return [];
        }

        let errorArr2 = this.baseValidateSync(value, object, key, path);
        let errorArr3 = this.customValidateSync(value, object, key, path);

        let errors = [...errorArr2, ...errorArr3];
        return errors;
    }

    /**
     * 检查对象，并返回错误信息，异步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    async check(value: any, object?: any, key?: string, path: string[] = []): Promise<ErrorMessage[]> {
        if (this.isNullable) {
            let isNull = value === null || value === undefined;
            if (isNull) return [];
        }

        let errorArr2 = this.baseValidate(value, object, key, path);
        let errorArr3 = this.customValidate(value, object, key, path);

        let errors = await Promise.all([errorArr2, errorArr3]);

        return errors.reduce((res, arr) => res.concat(arr));
    }

    /**
     * 检查对象，如有错误信息通过异常抛出，同步
     * @param value 被验证的值
     */
    validateSync(value: any) {
        let errors = this.checkSync(value);
        if (errors.length) throw errors;
    }

    /**
     * 检查对象，如有错误信息通过异常抛出，异步
     * @param value 被验证的值
     */
    async validate(value: any) {
        let errors = await this.check(value);
        if (errors.length) throw errors;
    }

    /**
     * 对对象进行自定义检查，并返回错误信息，异步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    private customValidateSync(value: any, object?: any, key?: string, path: string[] = []): ErrorMessage[] {
        let errors: ErrorMessage[] = [];
        for (let validator of this.validators) {
            let newPath = key ? [...path, key] : path;
            let msg = validator(value, object, key, newPath);
            if (msg instanceof Promise) throw new Error("被类型不能使用同步校验");
            if (msg) {
                errors.push({
                    path,
                    message: msg,
                });
            }
        }
        return errors;
    }

    /**
     * 对对象进行自定义检查，并返回错误信息，同步
     * @param value 被验证的值
     * @param object 该值来自的对象
     * @param key 该值在对象上的属性
     * @param path 该值的路径
     */
    private async customValidate(value: any, object?: any, key?: string, path: string[] = []): Promise<ErrorMessage[]> {
        let pArr = this.validators.map(async validator => {
            let newPath = key ? [...path, key] : path;
            let msg = await validator(value, object, key, newPath);
            if (msg) {
                return {
                    path,
                    message: msg,
                } as ErrorMessage;
            }
        });

        let errors = await Promise.all(pArr);

        return errors.filter(it => it) as ErrorMessage[];
    }

    /**
     * 返回同步验证器，会抛出错误信息
     */
    getSyncValidator() {
        return this.validateSync.bind(this);
    }

    /**
     * 返回异步验证器，会抛出错误信息
     */
    getAsyncValidator() {
        return this.validate.bind(this);
    }

    /**
     * 返回同步验证器，会返回错误信息
     */
    getSyncChecker() {
        return this.checkSync.bind(this);
    }

    /**
     * 返回异步验证器，会返回错误信息
     */
    getAsyncChecker() {
        return this.check.bind(this);
    }

    /**
     * 添加自定义验证器
     * @param validator 验证器
     */
    custom(validator: Validator): this {
        let type = this.copy();
        type.validators.push(validator);
        return type as this;
    }

    /**
     * 是否可空
     */
    private isNullable = false;

    /**
     * 可空
     */
    get nullable(): this {
        let type = this.copy();
        type.isNullable = true;
        return type as this;
    }
}

/**
 * 对象描述类
 */
export class ObjectType extends Type {
    /**
     * @param descriptor 对象描述器
     */
    constructor(@param("descriptor") private descriptor: Descriptor = {}) {
        super();
    }

    /**
     * 符合类型
     */
    type<T, Args extends any[]>(klass: IConstructor<T, Args>) {
        return this.custom(value => {
            if (!(value instanceof klass)) return getMessage("object.type", arguments);
        });
    }

    baseValidateSync(obj: any, object?: any, key?: string, path: string[] = []) {
        if (Object.prototype.toString.call(obj) !== "[object Object]") return [{
            path,
            message: getMessage("object.base", arguments)
        }];
        let errors: ErrorMessage[] = [];
        let keys = getKeys(obj, this.descriptor);
        for (let key of keys) {
            let item = obj[key];
            let type = this.descriptor[key];
            let res = type.checkSync(item, obj, key, [...path, key!]);
            errors.push(...res);
        }
        return errors;
    }

    async baseValidate(obj: any, object?: any, key?: string, path: string[] = []) {
        if (Object.prototype.toString.call(obj) !== "[object Object]") return [{
            path,
            message: getMessage("object.base", arguments)
        }];

        let pArr: Promise<ErrorMessage[]>[] = [];
        let keys = getKeys(obj, this.descriptor);
        for (let key of keys) {
            let item = obj[key];
            let type = this.descriptor[key];
            let p = type.check(item, obj, key, [...path, key!]);
            pArr.push(p);
        }

        let errors = await Promise.all(pArr);

        return errors.reduce((res, arr) => res.concat(arr));;
    }
}

/**
 * 字符串描述类
 */
export class StringType extends Type {
    baseValidateSync(value: any, object?: any, key?: string, path: string[] = []) {
        let isString = typeof value === "string";
        return isString ? [] : [{
            path,
            message: getMessage("string.base", arguments)
        }];
    }

    /**
     * 符合长度
     * @param min 最小值
     * @param max 最大值
     * @param include 最大值是否包含在范围内
     */
    length(min: number, max?: number, include = true) {
        if (max !== undefined && min > max) throw new Error("min > max");
        return this.custom(value => {
            if (value.length < min) return getMessage("string.length.min", arguments);
            if (max !== undefined) {
                if (include) {
                    if (value.length > max) return getMessage("string.length.max", arguments);
                } else {
                    if (value.length >= max) return getMessage("string.length.max", arguments);
                }
            }
        });
    }

    /**
     * 符合模式
     * @param reg 正则表达式
     */
    pattern(reg: RegExp) {
        return this.custom(value => {
            if (!reg.test(value)) return getMessage("string.pattern", arguments);
        })
    }
}

/**
 * 数字描述类
 */
export class NumberType extends Type {
    baseValidateSync(value: any, object?: any, key?: string, path: string[] = []) {
        let isNumber = typeof value === "number";
        return isNumber ? [] : [{
            path,
            message: getMessage("number.base", arguments)
        }];
    }

    /**
     * 为整数
     */
    get int() {
        return this.custom(value => {
            if (
                typeof value === "number" &&
                ~~value !== value
            ) {
                return getMessage("number.int", arguments);
            }
        })
    }

    /**
     * 为浮点数
     */
    get float() {
        return this.custom(value => {
            if (
                typeof value === "number" &&
                value % 1 === 0
            ) {
                return getMessage("number.float", arguments);
            }
        })
    }

    /**
     * 在范围内
     * @param min 最小值
     * @param max 最大值
     * @param include 最大值是否包含在范围内
     */
    range(min: number, max?: number, include = true) {
        if (max !== undefined && min > max) throw new Error("min > max");
        return this.custom(value => {
            if (value < min) return getMessage("number.range.min", arguments);
            if (max !== undefined) {
                if (include) {
                    if (value > max) return getMessage("number.range.max", arguments);
                } else {
                    if (value >= max) return getMessage("number.range.max", arguments);
                }
            }
        });
    }
}

/**
 * 布尔描述类
 */
export class BooleanType extends Type {
    baseValidateSync(value: any, object?: any, key?: string, path: string[] = []) {
        let isBoolean = typeof value === "boolean";
        return isBoolean ? [] : [{
            path,
            message: getMessage("boolean.base", arguments)
        }];
    }
}

/**
 * 函数描述类
 */
export class FunctionType extends Type {
    baseValidateSync(value: any, object?: any, key?: string, path: string[] = []) {
        let isFunction = typeof value === "function";
        return isFunction ? [] : [{
            path,
            message: getMessage("function.base", arguments)
        }];
    }
}

/**
 * 正则描述类
 */
export class RegExpType extends Type {
    baseValidateSync(value: any, object?: any, key?: string | undefined, path: string[] = []) {
        let isReg = Object.prototype.toString.call(value) === "[object RegExp]";
        return isReg ? [] : [{
            path,
            message: getMessage("regExp.base", arguments)
        }];
    }
}

/**
 * 数组描述类
 */
export class ArrayType extends Type {
    /**
     * @param types 数组元素类型描述，只需满足一个就能通过检查
     */
    constructor(@param("types") private types?: Type[]) {
        super();
    }
    baseValidateSync(arr: any, object?: any, key?: string, path: string[] = []) {
        if (!Array.isArray(arr)) return [{
            path,
            message: getMessage("array.base", arguments)
        }];
        let errors: ErrorMessage[] = [];
        outter: for (let i = 0; i < arr.length; i++) {
            let item = arr[i];

            let types = this.types ?? [];
            if (types.length === 0) continue;

            for (let type of types) {
                let res = type.checkSync(item, object, key, [...path, i.toString()]);
                if (res.length === 0) continue outter;
            }
            errors.push({
                path,
                message: getMessage("array.types", arguments)
            })
        }
        return errors;
    }
    async baseValidate(arr: any, object?: any, key?: string, path: string[] = []) {
        if (!Array.isArray(arr)) return [{
            path,
            message: getMessage("array.base", arguments)
        }];

        let outterArr: Promise<ErrorMessage[]>[] = [];
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];

            let p = this.innerValidate(item, object, key, path, i);

            outterArr.push(p);
        }

        let errors = await Promise.all(outterArr);

        return errors.reduce((res, arr) => res.concat(arr));;
    }

    private async innerValidate(item: any, object: any | undefined, key: string | undefined, path: string[], index: number): Promise<ErrorMessage[]> {
        let types = this.types ?? [];
        if (types.length === 0) return [];

        let innerArr: Promise<ErrorMessage[]>[] = [];
        for (let type of types) {
            let p = type.check(item, object, key, [...path, index.toString()]);
            innerArr.push(p);
        }

        let resArr = await Promise.all(innerArr);
        let isMatch = resArr.some(arr => arr.length === 0);
        return isMatch ? [] : [{
            path,
            message: getMessage("array.types", arguments)
        }];
    }

    /**
     * 符合长度
     * @param min 最小值
     * @param max 最大值
     * @param include 最大值是否包含在范围内
     */
    length(min: number, max?: number, include = true) {
        if (max !== undefined && min > max) throw new Error("min > max");
        return this.custom(value => {
            if (value.length < min) return getMessage("array.length.min", arguments);
            if (max !== undefined) {
                if (include) {
                    if (value.length > max) return getMessage("array.length.max", arguments);
                } else {
                    if (value.length >= max) return getMessage("array.length.max", arguments);
                }
            }
        });
    }
}

/**
 * 任意描述类
 */
export class AnyType extends Type {
    baseValidateSync(value: any, object?: any, key?: string | undefined, path?: string[]) {
        return [];
    }
    async baseValidate(value: any, object?: any, key?: string | undefined, path?: string[]) {
        return [];
    }
}

/**
 * 日期描述类
 */
export class DateType extends Type {
    baseValidateSync(value: any, object?: any, key?: string | undefined, path: string[] = []) {
        return value instanceof Date ? [] : [{
            path,
            message: getMessage("date.base", arguments)
        }];
    }

    /**
     * 在范围内
     * @param min 最小值
     * @param max 最大值
     * @param include 最大值是否包含在范围内
     */
    range(min: Date, max?: Date, include = true) {
        if (max !== undefined && min > max) throw new Error("min > max");
        return this.custom(value => {
            if (value < min) return getMessage("date.range.min", arguments);
            if (max !== undefined) {
                if (include) {
                    if (value > max) return getMessage("date.range.max", arguments);
                } else {
                    if (value >= max) return getMessage("date.range.max", arguments);
                }
            }
        });
    }
}

/**
 * 枚举描述类
 */
export class EnumType extends Type {
    /**
     * @param enumItems 枚举值
     */
    constructor(@param("enumItems") private enumItems: any[]) {
        super();
    }

    baseValidateSync(value: any, object?: any, key?: string | undefined, path: string[] = []) {
        for (let item of this.enumItems) {
            if (value === item) return [];
        }

        return [{
            path,
            message: getMessage("enum.base", arguments)
        }];
    }
}

/**
 * 获取对象数组里面的所有对象的所有字段名称
 * @param objArr 对象数组
 */
function getKeys(...objArr: object[]): string[] {
    let res: string[] = [];
    for (let it of objArr) {
        let keys = Object.keys(it);
        for (let key of keys) {
            let isIn = res.includes(key);
            if (isIn) continue;
            res.push(key);
        }
    }
    return res;
}