import {CheckParams, Check, CheckReturn} from '../src/index';

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

    it("should support custom checks", () => {
      const fn = (value) => value === "expected" ? null : "CustomError";

      @CheckParams()
      class Target { constructor(@Check({fn}) a) {} }

      expect(() => new Target("blah")).toThrowError(/TypeCheckError when constructing/);
      expect(() => new Target("blah")).toThrowError(/CustomError/);
      expect(() => new Target("expected")).not.toThrow();
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

    it("should support custom checks", () => {
      const fn = (value) => value === "expected" ? null : "CustomError";
      class Target { @CheckReturn({fn}) method(v){ return v; } }

      expect(() => new Target().method("blah")).toThrowError(/CustomError/);
      expect(() => new Target().method("expected")).not.toThrow();
    });
  });
});