// 验证 App Store Connect API 与 App Store Server API 密钥是否有效。
// 用法：node verify-iap.js "<.p8 完整路径>" <KeyID>
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const ISSUER_ID = '66746481-62c5-4176-9ed9-84442f35e6af';
const BUNDLE_ID = 'com.warrescue.app';
const p8Path = process.argv[2];
const KEY_ID = process.argv[3];

if (!p8Path || !KEY_ID) {
  console.error('用法：node verify-iap.js "<.p8 完整路径>" <KeyID>');
  process.exit(1);
}

const p8 = fs.readFileSync(p8Path, 'utf8');

function b64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJwt(includeBid) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1'
  };
  if (includeBid) payload.bid = BUNDLE_ID;

  const signingInput =
    b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })) +
    '.' +
    b64url(JSON.stringify(payload));
  const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
    key: p8,
    dsaEncoding: 'ieee-p1363'
  });
  return `${signingInput}.${b64url(signature)}`;
}

function probe(label, host, path, jwt, expectedStatuses) {
  return new Promise((resolve) => {
    const request = https.request(
      {
        hostname: host,
        path,
        method: 'GET',
        headers: { Authorization: `Bearer ${jwt}` },
        timeout: 15000
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          const ok = expectedStatuses.includes(response.statusCode);
          const detail = body ? `  ${body.slice(0, 160)}` : '  (空响应)';
          console.log(`${ok ? '✓' : '✗'} [${label}] HTTP ${response.statusCode}${detail}`);
          resolve(ok);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('请求超时'));
    });
    request.on('error', (error) => {
      console.error(`✗ [${label}] 网络错误：${error.message}`);
      resolve(false);
    });
    request.end();
  });
}

(async () => {
  console.log(`KeyID=${KEY_ID}\n`);

  const results = await Promise.all([
    probe(
      'Connect API（确认密钥有效）',
      'api.appstoreconnect.apple.com',
      '/v1/apps?limit=1',
      makeJwt(false),
      [200]
    ),
    probe(
      'Server API 生产环境（带 bid）',
      'api.storekit.itunes.apple.com',
      '/inApps/v1/transactions/0',
      makeJwt(true),
      [400, 404]
    ),
    probe(
      'Server API 沙盒环境（带 bid）',
      'api.storekit-sandbox.itunes.apple.com',
      '/inApps/v1/transactions/0',
      makeJwt(true),
      [400, 404]
    )
  ]);

  if (results.some((ok) => !ok)) {
    console.error('\n验证失败：至少一个环境未返回预期状态。');
    process.exitCode = 1;
  } else {
    console.log('\n验证成功：Connect API、生产环境和沙盒环境均接受该密钥。');
  }
})().catch((error) => {
  console.error(`验证异常：${error.message}`);
  process.exitCode = 1;
});
