# Runtime Type Checks

## Introduction

A reasonably-typed TypeScript application gives the developer enough confidence that the operations within the applicaiton are safe and predictable. As a result, you rarely see the `undefined is not a function` errors, which is often caused by passing a wrong type of object.

This is because the TypeScript type checker ensures that you only invoke functions with compatible parameters. The type checker, however, cannot verify this at the application or module boundary, where the application receives data from the backend, a web-worker, or just another module. Here, we cannot know statically if the data is correct. So we just have to trust that it is.

For example, imagine an application invoking some Session module to get the end date of the last session.

```
import {Session} from 'session';

class SessionProvider {
  getLastSessionEnd():Date {
    const s:Session = Session.getSession();
    return s.lastSessionEnd;
  }
}

invokeBusinessLogic(new SessionProvider().getLastSessionEnd());
```

If our understanding of the Session library is incorrect and `lastSessionEnd` is a string, not a date, then we may get an exception somewhere deep inside the `invokeBusinessLogic` function. Or what is even more likely, the type of an object changes with a new version of the Session library. This is possible because the Session library is not maintained by us.

To check that the session data entering our well-typed application is correct, we can use the Runtime Type Checks library. It allows us to decorate our application boundary to make sure that the objects are of the right type or the right shape.

```
import {Session} from 'session';

class SessionProvider {
  @CheckReturn() getLastSessionEnd():Date {
    const s:Session = Session.getSession();
    return s.lastSessionEnd;
  }
}

invokeBusinessLogic(new SessionProvider().getLastSessionEnd());
```

This will check at runtime that `lastSessionEnd` is a date. If not, calling `getLastSessionEnd` will throw an exception.

## What Else Can We Do?

### Running Custom Checks

By default, the Runtime Type Checks library just does the instanceof check. Often this is not enough. We can provide a custom check function, which will be used instead of the default check, as follows:

```
import {Session} from 'session';

function customCheck(value) {
  return value instanceof Data ? null : "Must be date!";
}

class SessionProvider {
  @CheckReturn({fn: customCheck}) getLastSessionEnd():Date {
    const s:Session = Session.getSession();
    return s.lastSessionEnd;
  }
}
```

### Allowing Nulls

By default, the Runtime Type Checks library ensures the objects are not null. We can allow nulls as follows:

```
import {Session} from 'session';

class SessionProvider {
  @CheckReturn({nullable:true}) getLastSessionEnd():Date {
    const s:Session = Session.getSession();
    return s.lastSessionEnd;
  }
}
```

### Checking Params

In addition to checking return values, we can also check constructor parameters

```
@CheckParams()
class Person {
  constructor(name:string){}
}
```

or method parameters

```
class SayHi {
  @CheckParams() sayHi(name:string){}
}
```

We can customize how we check parameters by using the Check decorator.

```
class SayHi {
  @CheckParams() sayHi(name:string, @Check({nullable:true}) greeting?:string){}
}
```

### Default Type Checks

If we have a type that we want to use a custom check for everywhere in our application, we can do it as follows:

```
@CustomCheck(t => t.value !== "expected" ? "Invalid" : null)
class Dependency { constructor(private value:any){}; }

@CheckParams() class MyClass { constructor(d:Dependency){} }
```

### Disabling Checks

We may want to disable checks in production or in unit tests to enable mocking. We can do it like this:

`RuntimeChecks.enableChecks = false;`.


## Only Application Boundary

Are these checks useful only at the application boundary? Any time we interact with untyped or reflective code, we can add some runtime checks.

## How to Install

...