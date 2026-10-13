import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript");
const root=process.cwd();
const get=path=>readFileSync(resolve(root,path),"utf8");
const ops=get("src/app/actions/operations.ts");
const data=get("src/lib/operations/server-data.ts");
const auth=get("src/lib/auth/require-permission.ts");
const config=get("src/lib/supabase/config.ts");
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]); }
function ast(path) { return ts.createSourceFile(path, get(path), ts.ScriptTarget.Latest, true,ts.ScriptKind.TS); }

test("Seguridad estatica: modulo operacional nunca accede directamente a tablas", () => {
  assert.doesNotMatch(ops,/\.from\s*\(/);
  assert.doesNotMatch(data,/\.from\s*\(/);
});
test("Seguridad estatica: server actions tienen bandera use server", () => {
  assert.match(ops.slice(0,150),/["']use server["']/);
});
test("Seguridad estatica: funciones exportadas validan, comprueban permiso y usan RPC", () => {
  const source=ast("src/app/actions/operations.ts");
  const names=[];
  source.forEachChild(node=>{
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)) {
      const name=node.name?.text;
      if (name) {
        names.push(name);
        const body=node.body?.getText(source)??"";
        assert.match(body,/\.safeParse\(/,name);
        assert.match(body,/(?:call\s*\(|requirePermission\s*\()/,name);
        assert.doesNotMatch(body,/\.from\s*\(/,name);
      }
    }
  });
  assert.ok(names.length>=10, `Se esperaban >=10 acciones: ${names.join(',')}`);
});
test("Seguridad estatica: requirePermission comprueba identidad, rol y permiso", () => {
  assert.match(auth,/\.auth\.getUser\(/);
  assert.match(auth,/\.rpc\(["']current_app_role["']\)/);
  assert.match(auth,/hasPermission\s*\(/);
});
test("Seguridad estatica: configuracion publica no utiliza claves privilegiadas", () => {
  assert.match(config,/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(config,/SERVICE_ROLE|sb_secret_|DATABASE_URL/);
});
test("Seguridad estatica: sin claves privilegiadas literales en src", () => {
  const sourceFiles=files(resolve(root,"src")).filter(f=>/\.(tsx?|mjs|jsx?)$/.test(f));
  for (const file of sourceFiles) {
    const content=readFileSync(file,"utf8");
    assert.doesNotMatch(content,/sb_secret_[A-Za-z0-9_-]{10,}|sk_(?:live|test)_[A-Za-z0-9_-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,file);
  }
});
