import {CheckParams, Check, CheckReturn, CustomCheck} from '../src/index';

describe("RTC:: Integration Specs", () => {
  class Dependency1 {}
  class Dependency2 {}
  const d1 = new Dependency1();
  const d2 = new Dependency2();

  describe("constructor params", () => {
    it("should not throw when types match", () => {
      @CheckParams()
      class Target { constructor(a:Dependency1) {} }

      const t = new Target(d1);

      expect(t instanceof Target).toBe(true);
    });

    it("should throw a type does not match", () => {
      @CheckParams()
      class Target { constructor(a:Dependency1, b:Dependency2) {} }

      expect(() => new Target(d1, d1)).toThrowError(/The parameter '1'/);
    });

    it("should throw when given null", () => {
      @CheckParams()
      class Target { constructor(a:Dependency1) {} }

      expect(() => new Target(null)).toThrowError(/The parameter '0'/);
    });

    it("should support custom checks", () => {
      const fn = (value) => value === "expected" ? null : "CustomError";

      @CheckParams()
      class Target { constructor(@Check({fn}) a) {} }

      expect(() => new Target("blah")).toThrowError(/TypeCheckError when constructing/);
      expect(() => new Target("blah")).toThrowError(/CustomError/);
      expect(() => new Target("expected")).not.toThrow();
    });

    it("should not throw when given null and the param is nullable", () => {
      @CheckParams()
      class Target { constructor(@Check({nullable:true}) a:Dependency1) {} }

      expect(() => new Target(null)).not.toThrow();
    });

    it("should use custom type check when available", () => {
      @CustomCheck(t => t.value !== "expected" ? "Invalid" : null)
      class Dependency { constructor(private value:any){}; }

      @CheckParams()
      class Target { constructor(d:Dependency) {} }

      expect(() => new Target(new Dependency("invalid"))).toThrowError(/The parameter '0'/);
      expect(() => new Target(new Dependency("expected"))).not.toThrow();
    });
  });

  describe("method params", () => {
    it("should not throw when types match", () => {
      class Target { @CheckParams() method(a:Dependency1){} }
      expect(() => new Target().method(d1)).not.toThrow();
    });

    it("should throw when a type does not match", () => {
      class Target { @CheckParams() method(a:Dependency1, b:Dependency2){} }
      expect(() => new Target().method(d1, d1)).toThrowError(/The parameter '1'/);
    });

    it("should support custom checks", () => {
      const fn = (value) => value === "expected" ? null : "CustomError";
      class Target { @CheckParams() method(@Check({fn}) a){} }

      expect(() => new Target().method("blah")).toThrowError(/CustomError/);
      expect(() => new Target().method("expected")).not.toThrow();
    });
  });

  describe("method return value", () => {
    it("should not throw when types match", () => {
      class Target { @CheckReturn() method():Dependency1{ return d1; } }
      expect(() => new Target().method()).not.toThrow();
    });

    it("should throw when a type does not match", () => {
      class Target { @CheckReturn() method():Dependency1{ return d2; } }
      expect(() => new Target().method()).toThrowError(/The return/);
    });

    it("should throw when given null", () => {
      class Target { @CheckReturn() method():Dependency1{ return null; } }
      expect(() => new Target().method()).toThrowError(/The return/);
    });

    it("should support custom checks", () => {
      const fn = (value) => value === "expected" ? null : "CustomError";
      class Target { @CheckReturn({fn}) method(v){ return v; } }

      expect(() => new Target().method("blah")).toThrowError(/CustomError/);
      expect(() => new Target().method("expected")).not.toThrow();
    });

    it("should throw when given null", () => {
      class Target { @CheckReturn({nullable:true}) method():Dependency1{ return null; } }
      expect(() => new Target().method()).not.toThrow();
    });

    it("should use custom type check when available", () => {
      @CustomCheck(t => t.value !== "expected" ? "Invalid" : null)
      class Dependency { constructor(private value:any){}; }

      class Target { @CheckReturn() method(v):Dependency { return v; } }

      expect(() => new Target().method(new Dependency("invalid"))).toThrowError(/The return/);
      expect(() => new Target().method(new Dependency("expected"))).not.toThrow();
    });
  });
});