# Runtime Type Checks

## Introduction

Runtime Type Checks is a small library complementing the optional type system of TypeScript.

A reasonable-typed TypeScript application gives the developer enough confidence that the operations within the applicaiton are safe and predictable. As a result, you rarely see the error often caused by passing a wrong type of object -- `undefined is not a function`. The situation is different at the application or module boundary, where you receive data from the backend, a web-worker, or just another module. Here, the TypeScript type checker cannot verify statically that the data is correct, and your application just has to trust it.

That is where the Runtime Type Checks library comes in. It allows you to decorator your application boundary to make sure that the types are of the right type or the right shape. Since these checks are performed only at the application boundary, they do not affect the performance or the ergonomics of the application.

## How to Use It

See `integration.spec.ts`