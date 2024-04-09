# @syntaxs/compiler `v0.0.1-alpha`

> Main compiler module of Syntax Script.

This module is used to either compile a syntax script project, or create diagnostic reports for language servers.

# Usage

Using the compiler.

```typescript
// Compiling
import { SyntaxScriptCompiler } from '@syntaxs/compiler';

const compiler = new SyntaxScriptCompiler('/path/to/root/dir','/path/to/out/dir','ts');
compiler.compile();
```

Creating diagnostic reports.

```typescript
//TODO
```