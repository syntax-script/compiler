# @syntaxs/compiler `v0.0.1-alpha`
![Stars](https://badgen.net/github/stars/syntax-script/compiler)
![Releases](https://badgen.net/github/release/syntax-script/compiler)
![Version](https://badgen.net/npm/v/@syntaxs/compiler)
![License](https://badgen.net/github/license/syntax-script/compiler)

> Main compiler module of Syntax Script.

This module is used to either compile a syntax script project, or create diagnostic reports for language servers.

# Usage

Using the compiler.

```typescript
import { SyntaxScriptCompiler } from '@syntaxs/compiler';

const compiler = new SyntaxScriptCompiler('/path/to/root/dir','/path/to/out/dir','ts');
compiler.compile();
```

Creating diagnostic reports for language servers.

```typescript
import {createSyntaxScriptDiagnosticReport} from '@syntaxs/compiler';

const report = createSyntaxScriptDiagnosticReport('/path/to/file.syx');
console.log(`${report.items.length} Problems found in the file.`);
```

Handling compiler errors 
```typescript
import { SyntaxScriptCompiler,isCompilerError } from '@syntaxs/compiler';

const compiler = new SyntaxScriptCompiler('/path/to/root/dir','/path/to/out/dir','ts');
try {
    compiler.compile();
} catch (e) {
    if(isCompilerError(e)) {
        console.log(`There is a syntax error in the file: ${e.message}`);
        console.log(`This problem is at line ${e.range.start.line}`);
        console.log(`There are ${e.actions.length} recommended solutions to this problem.`)
    }
}
```