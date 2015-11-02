import * as rm from 'reflect-metadata';
var x = rm; // enable reflect-metadata

const PARAM_CHECKS_METADATA_KEY = "runtime-type-checks:paramchecks";
const CUSTOM_CHECK_METADATA_KEY = "runtime-type-checks:customcheck";

export interface CheckConfig { fn?:Function; nullable?:boolean;
}

export const RuntimeChecks = {enableChecks: true};

export function CheckParams() {
  return (type, methodName?, descriptor?) => {
    const expectedTypes = Reflect.getMetadata("design:paramtypes", type, methodName);
    const customChecks = Reflect.getMetadata(PARAM_CHECKS_METADATA_KEY, type, methodName);
    const checks = new CreateChecks(type.constructor, methodName, expectedTypes, customChecks).createParamsCheck();
    return methodName ? wrapMethod(descriptor, checks) : wrapConstructor(type, checks);
  };
}

export function CheckReturn(config:CheckConfig = {}) {
  return (type, methodName, descriptor) => {
    const expectedType = Reflect.getMetadata("design:returntype", type, methodName);
    const check = new CreateChecks(type, methodName, [expectedType], [config]).createReturnCheck();

    return wrapValue(descriptor, (...args) => {
      const res = descriptor.value(...args);
      assertReturn(check, res);
      return res;
    });
  };
}

export function Check(config:CheckConfig = {}) {
  return (type, fnName, index) => {
    let customChecks = Reflect.getMetadata(PARAM_CHECKS_METADATA_KEY, type, fnName);
    if (customChecks === undefined) {
      customChecks = [];
      Reflect.defineMetadata(PARAM_CHECKS_METADATA_KEY, customChecks, type, fnName);
    }
    customChecks[index] = config;
  };
}

export function CustomCheck(fn:Function) {
  return (type) => {
    Reflect.defineMetadata(CUSTOM_CHECK_METADATA_KEY, fn, type);
  };
}

function wrapMethod(descriptor, checks) {
  return wrapValue(descriptor, (...args) => {
    assertArgs(checks, args);
    return descriptor.value(...args);
  });
}

function wrapConstructor(type, checks) {
  function Gen(...args) {
    assertArgs(checks, args);
    type.call(this, args);
  }

  Gen.prototype = Object.create(type.prototype);
  return Gen;
}

class CreateChecks {
  constructor(private type:Function,
              private methodName:string,
              private expectedTypes:Function[],
              private customChecks:CheckConfig[]) {
  }

  createParamsCheck():Function[] {
    const res = [];
    for (let i = 0; i < this.expectedTypes.length; ++i) {
      const et = this.expectedTypes[i];
      if (this.customChecks !== undefined && this.customChecks[i].fn !== undefined) {
        res.push(this.createCustomParamTypeCheck(i, this.customChecks[i].fn));
      } else {
        const customTypeCheckFn = this._readTypeCheck(et);
        if (customTypeCheckFn !== undefined) {
          res.push(this.createCustomParamTypeCheck(i, customTypeCheckFn));
        } else {
          const nullable = this.customChecks !== undefined && this.customChecks[i].nullable;
          res.push(this.createDefaultParamTypeCheck(i, et, nullable));
        }
      }
    }
    return res;
  }

  createReturnCheck():Function {
    if (this.customChecks !== undefined && this.customChecks[0].fn !== undefined) {
      return this.createCustomReturnTypeCheck(this.customChecks[0].fn);
    } else {
      const customTypeCheckFn = this._readTypeCheck(this.expectedTypes[0]);
      if (customTypeCheckFn !== undefined) {
        return this.createCustomReturnTypeCheck(customTypeCheckFn);
      } else {
        const nullable = this.customChecks !== undefined && this.customChecks[0].nullable;
        return this.createDefaultReturnTypeCheck(this.expectedTypes[0], nullable);
      }
    }
  }

  private createCustomParamTypeCheck(index:number, fn:Function):Function {
    return arg => {
      const res = fn(arg);
      if (res)
        throw new Error(this.createCustomParamErrorMessage(index, res));
    };
  }

  private createDefaultParamTypeCheck(index:number, expectedType:Function, nullable:boolean):Function {
    return arg => {
      if (!defaultCheck(arg, expectedType, nullable))
        throw new Error(this.createDefaultParamErrorMessage(index, expectedType, arg));
    };
  }

  private createDefaultParamErrorMessage(index:number, expectedType:Function, arg:any):string {
    const paramPart = `The parameter '${index}' is expected of type '${expectedType.name}', but was '${arg}' of type '${typeName(arg)}'`;
    return `${this.errorBasePart()} ${paramPart}`;
  }

  private createCustomParamErrorMessage(index:Number, res:string):string {
    const paramPart = `The parameter '${index}' failed the check: ${res}`;
    return `${this.errorBasePart()} ${paramPart}`;
  }


  private createDefaultReturnTypeCheck(expectedType:Function, nullable:boolean):Function {
    return arg => {
      if (!defaultCheck(arg, expectedType, nullable))
        throw new Error(this.createDefaultReturnErrorMessage(expectedType, arg));
    };
  }

  private createCustomReturnTypeCheck(fn:Function):Function {
    return arg => {
      const res = fn(arg);
      if (res)
        throw new Error(this.createCustomReturnErrorMessage(res));
    };
  }

  private createDefaultReturnErrorMessage(expectedType:Function, arg:any):string {
    const retPart = `The return value is expected of type '${typeName(expectedType)}', but was '${arg}' of type '${typeName(arg)}'`;
    return `${this.errorBasePart()} ${retPart}`;
  }

  private createCustomReturnErrorMessage(res:string):string {
    const retPart = `The return value failed failed the check: ${res}`;
    return `${this.errorBasePart()} ${retPart}`;
  }

  private errorBasePart():string {
    if (this.methodName !== undefined) {
      return `TypeCheckError when invoking '${this.methodName}' of ${typeName(this.type)}.`;
    } else {
      return `TypeCheckError when constructing an instance of '${typeName(this.type)}'.`;
    }
  }

  private _readTypeCheck(type:Function):Function {
    return Reflect.getMetadata(CUSTOM_CHECK_METADATA_KEY, type);
  }
}

function defaultCheck(arg:any, expectedType:Function, nullable:boolean):boolean {
  if (nullable && (arg === null || arg === undefined)) return true;
  if (expectedType == Number && typeof arg === "number") return true;
  if (expectedType == String && typeof arg === "string") return true;
  if (expectedType == Boolean && typeof arg === "boolean") return true;
  return arg instanceof expectedType;
}

function typeName(obj):string {
  if (obj === null) return 'null';
  if (obj.name) return obj.name;
  if (obj.constructor.name) return obj.constructor.name;
  return obj;
}

function wrapValue(descriptor, value) {
  return {
    value: value,
    writeable: descriptor.writable,
    enumerable: descriptor.enumerable,
    configurable: descriptor.configurable
  };
}

function assertArgs(checks:Function[], args:any[]):void {
  if (!RuntimeChecks.enableChecks) return;
  for (let i = 0; i < args.length; ++i) {
    checks[i](args[i]);
  }
}

function assertReturn(check:Function, arg:any):void {
  if (!RuntimeChecks.enableChecks) return;
  check(arg);
}