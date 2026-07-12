import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from '../src/common/interfaceAdapter/api/openapi/buildOpenApiDocument.js';
import { greetingContractGroup } from '../src/template/interfaceAdapter/api/contract/greetingContract.js';

// OpenAPI に載せる全フィーチャーの ContractGroup をここに集約する。
const groups = [greetingContractGroup];

const document = buildOpenApiDocument(groups);

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '../openapi.json');
writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n');

console.log(`OpenAPI document written to ${outPath}`);
