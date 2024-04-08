import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const path = join(process.cwd(),'dist');

if(existsSync(path)) rmSync(path,{recursive:true});