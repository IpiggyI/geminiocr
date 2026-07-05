const FORBIDDEN_PUBLIC_ENV = ['REACT_APP_GEMINI_API_KEY'];

const findUnsafePublicEnv = (env = process.env) =>
  FORBIDDEN_PUBLIC_ENV.filter((name) => Boolean(env[name]));

const assertSafePublicEnv = (env = process.env) => {
  const unsafe = findUnsafePublicEnv(env);
  if (!unsafe.length) return;

  throw new Error(
    `禁止设置公开构建变量 ${unsafe.join(', ')}。请改用 Vercel 服务端 GEMINI_API_KEY，或在页面设置中填写自己的 API Key。`
  );
};

if (require.main === module) {
  try {
    assertSafePublicEnv();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  FORBIDDEN_PUBLIC_ENV,
  findUnsafePublicEnv,
  assertSafePublicEnv,
};
