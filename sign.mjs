import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ApkSigner, SigningKey } = await import(require.resolve('apk_sign_ts', { paths: [process.env.HOME + '/tools'] }));
const [, , inp, out] = process.argv;
const dir = new URL('.', import.meta.url).pathname;
const signer = new ApkSigner({
  signingKey: SigningKey.fromPEM(readFileSync(dir + 'keys/key.pem', 'utf8'), readFileSync(dir + 'keys/cert.pem', 'utf8')),
  digestAlgorithm: 'SHA-256'
});
const { signedApk } = await signer.sign(new Uint8Array(readFileSync(inp)));
writeFileSync(out, signedApk);
