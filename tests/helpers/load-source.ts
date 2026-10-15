import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import { NextResponse } from 'next/server';

/** Execute real source with explicit I/O substitutes, without loading credentials or making network calls. */
export function loadSource(path: string, dependencies: Record<string, unknown>, env: Record<string, string | undefined> = {}) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(output, {
    exports, URL, Buffer, Response, Request, setTimeout,
    process: { env },
    console: { error() {}, warn() {} },
    require(name: string) {
      if (name === 'next/server') return { NextResponse };
      if (name === 'crypto') return crypto;
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}
