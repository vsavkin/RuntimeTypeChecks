import * as rm from 'reflect-metadata';
var x = rm; // enable reflect-metadata

export function CheckParams() {
  return (type, methodName?, descriptor?) => {
    if (methodName) {
      const expectedTypes = Reflect.getMetadata("design:paramtypes", type, methodName);
      const customChecks = Reflect.getMetadata("runtime-type-checks:paramchecks", type, methodName);
      const checks = _createChecks(type, methodName, expectedTypes, customChecks);

      return {
        value: (...args) => {
          _assert(checks, args);
          return descriptor.value(...args);
        },
        writeable: descriptor.writable,
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable
      };

    } else {
      const expectedTypes = Reflect.getMetadata("design:paramtypes", type);
      const customChecks = Reflect.getMetadata("runtime-type-checks:paramchecks", type);
      const checks = _createChecks(type, methodName, expectedTypes, customChecks);

      function Gen(...args) {
        _assert(checks, args);
        type.call(this, args);
      }
      Gen.prototype = Object.create(type.prototype);
      return Gen;
    }
  };
}

export function CheckReturn({fn}:{fn?:Function} = {}) {
  return (type, methodName, descriptor) => {
    let check;
    if (fn) {
      check = (arg) => {
        const res = fn(arg);
        if (res) {
          throw new Error(res);
        }
      };

    } else {
      const expectedType = Reflect.getMetadata("design:returntype", type, methodName);
      check = (arg) => {
        if (!(arg instanceof expectedType)) {
          throw new Error(`The return value of '${type.name}' was supposed to be an instance of ${expectedType.name}`);
        }
      };
    }

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
    customChecks[index] = (arg) => {
      const res = fn(arg);
      if (res) {
        throw new Error(res);
      }
    };
  };
}

function _createChecks(type, methodName, expectedTypes, customChecks) {
  const res = [];
  for (let i = 0; i < expectedTypes.length; ++i) {
    if (customChecks && customChecks[i]) {
      res.push(customChecks[i]);
    } else {
      const et = expectedTypes[i];
      const index = i;
      const check = arg => {
        if (!(arg instanceof et)) {
          const message = `Error when constructor an instance of '${type.name}'.
        The parameter with index ${index} was expected to be of type '${et.name}', but was '${arg}' of type ${arg.constructor.name}`;
          throw new Error(message);
        }
      };
      res.push(check);
    }
  }
  return res;
}

function _assert(checks, args) {
  for (let i = 0; i < args.length; ++i) {
    checks[i](args[i]);
  }
}