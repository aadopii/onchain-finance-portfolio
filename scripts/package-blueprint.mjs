// Build the themed blueprint from a reviewed Portfolio factory plus this repository's basket.
// Usage: node scripts/package-blueprint.mjs <factory-dir> <sailor-cli.js> <output.tar.gz>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [factoryArg,cliArg,outArg]=process.argv.slice(2);
if(!factoryArg||!cliArg||!outArg)throw new Error('Expected factory directory, CLI file, and output archive');
const factory=path.resolve(factoryArg), cli=path.resolve(cliArg), out=path.resolve(outArg);
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'onchain-blueprint-'));
try {
 fs.cpSync(factory,stage,{recursive:true,filter:src=>!['node_modules','out','cache','.git'].includes(path.basename(src))});
 for(const rel of ['basket.json','README.md','AGENTS.md','soul.md','dashboard/server.mjs','.sail/share.json']) {
  fs.mkdirSync(path.dirname(path.join(stage,rel)),{recursive:true});
  fs.copyFileSync(path.join(root,rel),path.join(stage,rel));
 }
 const result=spawnSync(process.execPath,[cli,'harbor','publish','--local','--out',out],{cwd:stage,stdio:'inherit'});
 if(result.status!==0)throw new Error('Blueprint packaging failed');
}finally{fs.rmSync(stage,{recursive:true,force:true});}
