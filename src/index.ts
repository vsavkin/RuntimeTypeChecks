import * as rm from 'reflect-metadata';
var x = rm; // enable reflect-metadata

export function CheckParams() {
  return (type, methodName?, descriptor?) => {
    if (methodName) {
      const expectedTypes = Reflect.getMetadata("design:paramtypes", type, methodName);
      const customChecks = Reflect.getMetadata("runtime-type-checks:paramchecks", type, methodName);
      const checks = new CreateChecks(type.constructor, methodName, expectedTypes, customChecks).createParamsCheck();

      return {
        value: (...args) => {
          assert(checks, args);
          return descriptor.value(...args);
        },
        writeable: descriptor.writable,
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable
      };

    } else {
      const expectedTypes = Reflect.getMetadata("design:paramtypes", type);
      const customChecks = Reflect.getMetadata("runtime-type-checks:paramchecks", type);
      const checks = new CreateChecks(type, methodName, expectedTypes, customChecks).createParamsCheck();

      function Gen(...args) {
        assert(checks, args);
        type.call(this, args);
      }

      Gen.prototype = Object.create(type.prototype);
      return Gen;
    }
  };
}

export function CheckReturn({fn}:{fn?:Function} = {}) {
  return (type, methodName, descriptor) => {
    const expectedType = Reflect.getMetadata("design:returntype", type, methodName);
    const check = new CreateChecks(type, methodName, [expectedType], [fn]).createReturnCheck();

    return {
      value: (...args) => {
        const res = descriptor.value(...args);
        check(res);
        return res;
      },
      writeable: descriptor.writable,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    };
  };
}

export function Check({fn}:{fn?:Function} = {}) {
  return (type, fnName, index) => {
    let customChecks = Reflect.getMetadata("runtime-type-checks:paramchecks", type, fnName);
    if (customChecks === undefined) {
      customChecks = [];
      Reflect.defineMetadata("runtime-type-checks:paramchecks", customChecks, type, fnName);
    }
    customChecks[index] = fn;
  };
}

class CreateChecks {
  constructor(private type:Function,
              private methodName:string,
              private expectedTypes:Function[],
              private customChecks:Function[]){}

  createParamsCheck():Function[] {
    const res = [];
    for (let i = 0; i < this.expectedTypes.length; ++i) {
      if (this.customChecks !== undefined && this.customChecks[i] !== undefined) {
        res.push(this.createCustomParamTypeCheck(i, this.customChecks[i]));
      } else {
        res.push(this.createDefaultParamTypeCheck(i, this.expectedTypes[i]));
      }
    }
    return res;
  }

  createReturnCheck():Function {
    if (this.customChecks !== undefined && this.customChecks[0] !== undefined) {
      return this.createCustomReturnTypeCheck(this.customChecks[0]);
    } else {
      return this.createDefaultReturnTypeCheck(this.expectedTypes[0]);
    }
  }

  private createCustomParamTypeCheck(index:number, fn:Function):Function {
    return arg => {
      const res = fn(arg);
      if (res)
        throw new Error(this.createCustomParamErrorMessage(index, res));
    };
  }

  private createDefaultParamTypeCheck(index:number, expectedType:Function):Function {
    return arg => {
      if (!(arg instanceof expectedType))
        throw new Error(this.createDefaultParamErrorMessage(index, expectedType, arg));
    };
  }

  private createDefaultParamErrorMessage(index:number, expectedType:Function, arg:any):string {
    const paramPart = `The parameter '${index}' is expected of type '${expectedType.name}', but was '${arg}' of type '${arg.constructor.name}`;
    return `${this.errorBasePart()} ${paramPart}`;
  }

  private createCustomParamErrorMessage(index:Number, res:string):string {
    const paramPart = `The parameter '${index}' failed the check: ${res}`;
    return `${this.errorBasePart()} ${paramPart}`;
  }


  private createDefaultReturnTypeCheck(expectedType:Function):Function {
    return arg => {
      if (!(arg instanceof expectedType))
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
    const retPart = `The return value is expected of type '${expectedType.name}', but was '${arg}' of type '${arg.constructor.name}`;
    return `${this.errorBasePart()} ${retPart}`;
  }

  private createCustomReturnErrorMessage(res:string):string {
    const retPart = `The return value failed failed the check: ${res}`;
    return `${this.errorBasePart()} ${retPart}`;
  }

  private errorBasePart():string {
    if (this.methodName !== undefined) {
      return `TypeCheckError when invoking '${this.methodName}' of ${this.type.name}.`;
    } else {
      return `TypeCheckError when constructing an instance of '${this.type.name}'.`;
    }
  }
}

function assert(checks:Function[], args:any[]):void {
  for (let i = 0; i < args.length; ++i) {
    checks[i](args[i]);
  }
}