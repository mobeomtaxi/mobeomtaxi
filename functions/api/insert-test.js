export async function onRequest({ env }) {
  await env.DB.prepare(`
    INSERT INTO users (username, password_hash, nickname)
    VALUES (?, ?, ?)
  `)
  .bind("testuser1", "hashedpw", "테스트닉")
  .run();

  return new Response("Inserted");
}
