import { AnyType, ArrayType, BooleanType, DateType, EnumType, FunctionType, NumberType, ObjectType, RegExpType, StringType, Type } from "../src"

let { assert, test } = QUnit;

async function wait(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

QUnit.module("Type 静态方法", () => {
    test("object", () => {
        assert.ok(Type.object() instanceof ObjectType);
    })
    test("string", () => {
        assert.ok(Type.string instanceof StringType);
    })
    test("number", () => {
        assert.ok(Type.number instanceof NumberType);
    })
    test("boolean", () => {
        assert.ok(Type.boolean instanceof BooleanType);
    })
    test("function", () => {
        assert.ok(Type.function instanceof FunctionType);
    })
    test("regExp", () => {
        assert.ok(Type.regExp instanceof RegExpType);
    })
    test("array", () => {
        assert.ok(Type.array() instanceof ArrayType);
    })
    test("any", () => {
        assert.ok(Type.any instanceof AnyType);
    })
    test("enum", () => {
        assert.ok(Type.enum([]) instanceof EnumType);
    })
    test("date", () => {
        assert.ok(Type.date instanceof DateType);
    })
});

QUnit.module("Type 普通方法", () => {
    let syncType = Type.object({
        "key1": Type.string
    });

    let asyncType = Type.object({
        "key1": Type.any.custom(async val => {
            await wait(50);
        })
    });

    let item = { key1: "" };

    test("copy", () => {
        let type1 = Type.any;
        let type2 = type1.copy();
        assert.ok(type1 !== type2);
        for (let key in type1) {
            let value1 = (type1 as any)[key];
            let value2 = (type2 as any)[key];
            assert.deepEqual(value1, value2);
        }
    })
    test("checkSync", () => {
        let res = syncType.checkSync({
            key1: ""
        });

        assert.ok(res.length === 0);
    })
    test("asyncType 用 checkSync 执行测试时抛出异常", () => {
        assert.throws(() => {
            asyncType.checkSync(item);
        });
    })
    test("check 同步调用", () => {
        let res = asyncType.check(item);
        assert.ok(res instanceof Promise);
    })
    test("check 异步调用", async () => {
        let res = await asyncType.check(item);
        assert.ok(res.length === 0);
    })
    test("validateSync", () => {
        syncType.validateSync(item);
        assert.ok(true);
    })
    test("asyncType 用 validateSync 执行测试时抛出异常", () => {
        assert.throws(() => {
            asyncType.validateSync(item);
        })
    })
    test("validate 同步调用", () => {
        let res = asyncType.validate(item);
        assert.ok(res instanceof Promise);
    })
    test("validate 异步调用", async () => {
        await asyncType.validate(item);
        assert.ok(true);
    })
    test("asyncType 的 getSyncValidator", () => {
        let validator = asyncType.getSyncValidator();
        assert.throws(() => {
            validator(item);
        })
    })
    test("syncType 的 getSyncValidator", () => {
        let validator = syncType.getSyncValidator();
        validator(item);
        assert.ok(true);
    })
    test("asyncType 的 getAsyncValidator", async () => {
        let validator = asyncType.getAsyncValidator();
        await validator(item);
        assert.ok(true);
    })
    test("syncType 的 getAsyncValidator", async () => {
        let validator = syncType.getAsyncValidator();
        await validator(item);
        assert.ok(true);
    })
    test("syncType 的 getSyncChecker", () => {
        let validator = syncType.getSyncChecker();
        validator(item);
        assert.ok(true);
    })
    test("asyncType 的 getSyncChecker", () => {
        let validator = asyncType.getSyncChecker();
        assert.throws(() => {
            validator(item);
        })
    })
    test("syncType 的 getAsyncChecker", async () => {
        let validator = syncType.getAsyncChecker();
        let res = await validator(item);
        assert.ok(res.length === 0);
    })
    test("asyncType 的 getAsyncChecker", async () => {
        let validator = asyncType.getAsyncChecker();
        let res = await validator(item);
        assert.ok(res.length === 0);
    })
    test("custom", () => {
        let type = Type.any.custom(val => {
            if (val === 10) return "error";
        });
        assert.throws(() => {
            type.validateSync(10);
        })

        type.validateSync(1);
        assert.ok(true);
    })
    test("nullable", () => {
        let type = Type.any.nullable;
        type.validateSync(null);
        assert.ok(true);
        type.validateSync(undefined);
        assert.ok(true);
    })
})


QUnit.module("ObjectType 的方法", () => {

    test("基础同步使用", () => {
        let type = Type.object({
            "key1": Type.string,
            "key2": Type.string
        });

        let res = type.checkSync({
            key1: "",
            key2: ""
        });
        assert.ok(res.length === 0);

        res = type.checkSync({
            key1: "",
            key2: 1
        })
        assert.ok(res.length === 1);
    })

    test("基础异步使用", async () => {
        let type = Type.object({
            "key1": Type.string,
            "key2": Type.any.custom(async val => {
                if (val !== "") return "应该为空字符串";
            })
        });

        let matchItem = {
            key1: "",
            key2: ""
        };

        assert.throws(() => {
            type.checkSync(matchItem);
        });

        let res = await type.check(matchItem);
        assert.ok(res.length === 0);

        res = await type.check({
            key1: "",
            key2: 1
        })
        assert.ok(res.length === 1);
    })

    test("nullable", () => {
        let type = Type.object().nullable;

        let res = type.checkSync(null);
        assert.ok(res.length === 0);

        res = type.checkSync({});
        assert.ok(res.length === 0);

        res = type.checkSync(1);
        assert.ok(res.length === 1);
    })

    test("type", () => {
        class Test1 { }
        class Test2 { }

        let test1 = new Test1();
        let test2 = new Test2();

        let type = Type.object().type(Test1);

        let res = type.checkSync(test1);
        assert.ok(res.length === 0);

        res = type.checkSync(test2);
        assert.ok(res.length === 1);
    })
})


QUnit.module("StringType 的方法", () => {
    test("基本使用", () => {
        let type = Type.string;

        let res = type.checkSync("");
        assert.ok(res.length === 0);

        res = type.checkSync(1);
        assert.ok(res.length === 1);
    })

    test("length 参数错误", () => {
        assert.throws(() => {
            let type = Type.string.length(0, -1);
        })
    })

    test("length(min)", () => {
        let type = Type.string.length(5);

        let res = type.checkSync("12345");
        assert.ok(res.length === 0);

        res = type.checkSync("123456");
        assert.ok(res.length === 0);

        res = type.checkSync("1");
        assert.ok(res.length === 1);
    })

    test("length(min, max)", () => {
        let type = Type.string.length(5, 6);

        let res = type.checkSync("12345");
        assert.ok(res.length === 0);

        res = type.checkSync("123456");
        assert.ok(res.length === 0);

        res = type.checkSync("1");
        assert.ok(res.length === 1);
    })

    test("length(min, max, false)", () => {
        let type = Type.string.length(5, 6, false);

        let res = type.checkSync("12345");
        assert.ok(res.length === 0);

        res = type.checkSync("123456");
        assert.ok(res.length === 1);

        res = type.checkSync("1");
        assert.ok(res.length === 1);
    })

    test("pattern", () => {
        let type = Type.string.pattern(/^[0-9]+$/);

        let res = type.checkSync("1000");
        assert.ok(res.length === 0);

        res = type.checkSync("test");
        assert.ok(res.length === 1);
    })

})

QUnit.module("NumberType 的方法", () => {
    test("基本使用", () => {
        let type = Type.number;

        let res = type.checkSync(1);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })

    test("int", () => {
        let type = Type.number.int;

        let res = type.checkSync(1);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);

        res = type.checkSync(1.1);
        assert.ok(res.length === 1);
    })

    test("float", () => {
        let type = Type.number.float;

        let res = type.checkSync(1.2);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })

    test("range 参数错误", () => {
        assert.throws(() => {
            let type = Type.number.range(0, -1);
        })
    })

    test("range(min)", () => {
        let type = Type.number.range(0);

        let res = type.checkSync(-1);
        assert.ok(res.length === 1);

        res = type.checkSync(0);
        assert.ok(res.length === 0);
    })

    test("range(min, max)", () => {
        let type = Type.number.range(0, 1);

        let res = type.checkSync(-1);
        assert.ok(res.length === 1);

        res = type.checkSync(0);
        assert.ok(res.length === 0);

        res = type.checkSync(1);
        assert.ok(res.length === 0);

        res = type.checkSync(2);
        assert.ok(res.length === 1);
    })

    test("range(min, max, false)", () => {
        let type = Type.number.range(0, 1, false);

        let res = type.checkSync(-1);
        assert.ok(res.length === 1);

        res = type.checkSync(0);
        assert.ok(res.length === 0);

        res = type.checkSync(1);
        assert.ok(res.length === 1);

        res = type.checkSync(2);
        assert.ok(res.length === 1);
    })
})

QUnit.module("BooleanType 的方法", () => {
    test("基本使用", () => {
        let type = Type.boolean;

        let res = type.checkSync(true);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })
})

QUnit.module("FunctionType 的方法", () => {
    test("基本使用", () => {
        let type = Type.function;

        let res = type.checkSync(() => { });
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })
})

QUnit.module("RegExpType 的方法", () => {
    test("基本使用", () => {
        let type = Type.regExp;

        let res = type.checkSync(/test/);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })
})

QUnit.module("ArrayType 的方法", () => {
    test("基本使用", () => {
        let type = Type.array();

        let res = type.checkSync([]);
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })
    test("基本使用，带类型", () => {
        let type = Type.array([
            Type.string,
            Type.number
        ]);

        let res = type.checkSync([]);
        assert.ok(res.length === 0);

        res = type.checkSync(["", 1]);
        assert.ok(res.length === 0);

        res = type.checkSync([null]);
        assert.ok(res.length === 1);
    })

    test("基本使用，带类型", () => {
        let type = Type.array([
            Type.string,
            Type.number
        ]);

        let res = type.checkSync([]);
        assert.ok(res.length === 0);

        res = type.checkSync(["", 1]);
        assert.ok(res.length === 0);

        res = type.checkSync([null]);
        assert.ok(res.length === 1);
    })

    test("length 参数错误", () => {
        assert.throws(() => {
            let type = Type.array().length(0, -1);
        })
    })

    test("length(min)", () => {
        let type = Type.array().length(5);

        let res = type.checkSync("12345".split(""));
        assert.ok(res.length === 0);

        res = type.checkSync("123456".split(""));
        assert.ok(res.length === 0);

        res = type.checkSync("1".split(""));
        assert.ok(res.length === 1);
    })

    test("length(min, max)", () => {
        let type = Type.array().length(5, 6);

        let res = type.checkSync("12345".split(""));
        assert.ok(res.length === 0);

        res = type.checkSync("123456".split(""));
        assert.ok(res.length === 0);

        res = type.checkSync("1".split(""));
        assert.ok(res.length === 1);
    })

    test("length(min, max, false)", () => {
        let type = Type.array().length(5, 6, false);

        let res = type.checkSync("12345".split(""));
        assert.ok(res.length === 0);

        res = type.checkSync("123456".split(""));
        assert.ok(res.length === 1);

        res = type.checkSync("1".split(""));
        assert.ok(res.length === 1);
    })
})

QUnit.module("AnyType 的方法", () => {
    test("基本使用", () => {
        let type = Type.any;

        let res = type.checkSync(null);
        assert.ok(res.length === 0);

        res = type.checkSync(undefined);
        assert.ok(res.length === 0);
    })
})

QUnit.module("DateType 的方法", () => {

    test("基本使用", () => {
        let type = Type.date;

        let res = type.checkSync(new Date(0));
        assert.ok(res.length === 0);

        res = type.checkSync("");
        assert.ok(res.length === 1);
    })

    test("range 参数错误", () => {
        assert.throws(() => {
            let type = Type.date.range(new Date(10), new Date(0));
        })
    })

    test("range(min)", () => {
        let type = Type.date.range(new Date(10));

        let res = type.checkSync(new Date(0));
        assert.ok(res.length === 1);

        res = type.checkSync(new Date(10));
        assert.ok(res.length === 0);
    })

    test("range(min, max)", () => {
        let type = Type.date.range(new Date(10), new Date(20));

        let res = type.checkSync(new Date(0));
        assert.ok(res.length === 1);

        res = type.checkSync(new Date(10));
        assert.ok(res.length === 0);

        res = type.checkSync(new Date(20));
        assert.ok(res.length === 0);

        res = type.checkSync(new Date(21));
        assert.ok(res.length === 1);
    })

    test("range(min, max, false)", () => {
        let type = Type.date.range(new Date(10), new Date(20), false);

        let res = type.checkSync(new Date(0));
        assert.ok(res.length === 1);

        res = type.checkSync(new Date(10));
        assert.ok(res.length === 0);

        res = type.checkSync(new Date(20));
        assert.ok(res.length === 1);

        res = type.checkSync(new Date(21));
        assert.ok(res.length === 1);
    })
})

QUnit.module("性能约束", () => {
    test("ObjectType 各个属性并发验证", async (assert) => {
        // @ts-ignore
        assert.timeout(80);

        let type = Type.object({
            key1: Type.any.custom(async () => {
                await wait(50);
            }),
            key2: Type.any.custom(async () => {
                await wait(50);
            }),
        })

        let res = await type.check({
            key1: "",
            key2: ""
        });

        assert.ok(res.length === 0);
    })
    test("ArrayType 各个属性并发验证", async (assert) => {
        // @ts-ignore
        assert.timeout(80);

        let type = Type.array([
            Type.any.custom(async () => {
                await wait(50);
            }),
            Type.any.custom(async () => {
                await wait(50);
            }),
        ])

        let res = await type.check(["", ""]);

        assert.ok(res.length === 0);
    })
})