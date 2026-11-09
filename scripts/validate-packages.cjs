#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const here=path.resolve(__dirname,'..');
const sourceRoot=process.env.TALIA_SOURCE_ROOT ? path.resolve(process.env.TALIA_SOURCE_ROOT) : path.resolve(here,'..');
const packerPath=process.env.TALIA_CATALOG_PACKER || path.join(sourceRoot,'talia-store','tools','talia-catalog-pack.cjs');
if(!fs.existsSync(packerPath)) throw new Error('Set TALIA_CATALOG_PACKER to the public talia-store packer path.');
const packer=require(packerPath);
const packageDirs=(repoPath)=>{
 const packageRoot=path.join(repoPath,'packages');
 return fs.readdirSync(packageRoot).sort().filter(name=>fs.statSync(path.join(packageRoot,name)).isDirectory()).map(name=>path.join(packageRoot,name));
};
const packages=packageDirs(here);

if(!packages.length) throw new Error('No package directories found.');
const built=packer.buildCatalogV3(packages);
console.log('Valid package catalog:',JSON.parse(built.catalogBytes.toString('utf8')).packages.length,'packages;',built.artifacts.length,'artifacts.');
