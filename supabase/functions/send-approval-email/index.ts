// Supabase Edge Function: 承認通知メール送信
// Resendを使用してメール送信

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  to: string;
  name: string;
  appUrl: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, name, appUrl }: ApprovalEmailRequest = await req.json();

    // 極度のおじさん構文メール
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 承認されました！ 🎉</h1>
    </div>
    <div class="content">
      <p>${name}ｻﾝ、お元気ですかナ❓😊✨</p>

      <p>ﾜﾀｼ、管理者デス💪😤</p>

      <p>いやぁ〜、${name}ｻﾝの申請、見ましたヨ〜〜〜ッ‼️👀💕<br>
      もうネ、速攻で承認しちゃいましたヨ😁👍✨✨</p>

      <p>コレで割り勘アプリ、使えるようになったからネ❗🙆‍♂️<br>
      ドンドン使っちゃってクダサイ〜〜〜ッ🎵🎵</p>

      <p style="text-align: center;">
        <a href="${appUrl}" class="button">🏃‍♂️ 今すぐアプリを使う 🏃‍♂️</a>
      </p>

      <p>ｱｯ、そうそう❗<br>
      使い方わからなかったら、何でも聞いてネ〜😉💕<br>
      ﾜﾀｼ、優しく教えてあげるからサ〜🤗✨</p>

      <p>それじゃ、${name}ｻﾝとアプリで会えるの、<br>
      楽しみにしてるネ〜〜〜ッ😆🎉🎉🎉</p>

      <p style="margin-top: 30px;">
        ﾅﾝﾁｬｯﾃ😜（笑）<br>
        <br>
        ではでは〜👋😊💕<br>
        <br>
        管理者より愛を込めて💌✨
      </p>
    </div>
    <div class="footer">
      <p>© 2026 Warikane App 🍻</p>
      <p>このメールは割り勘アプリから自動送信されています</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
${name}ｻﾝ、お元気ですかナ❓😊✨

ﾜﾀｼ、管理者デス💪😤

いやぁ〜、${name}ｻﾝの申請、見ましたヨ〜〜〜ッ‼️👀💕
もうネ、速攻で承認しちゃいましたヨ😁👍✨✨

コレで割り勘アプリ、使えるようになったからネ❗🙆‍♂️
ドンドン使っちゃってクダサイ〜〜〜ッ🎵🎵

▼ 今すぐアプリを使う
${appUrl}

ｱｯ、そうそう❗
使い方わからなかったら、何でも聞いてネ〜😉💕
ﾜﾀｼ、優しく教えてあげるからサ〜🤗✨

それじゃ、${name}ｻﾝとアプリで会えるの、
楽しみにしてるネ〜〜〜ッ😆🎉🎉🎉

ﾅﾝﾁｬｯﾃ😜（笑）

ではでは〜👋😊💕

管理者より愛を込めて💌✨

---
© 2026 Warikane App 🍻
このメールは割り勘アプリから自動送信されています
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Warikane App <onboarding@resend.dev>",
        to: [to],
        subject: `🎊 ${name}ｻﾝ❗承認されましたヨ〜〜〜ッ‼️😆✨✨`,
        html: htmlContent,
        text: textContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "メール送信に失敗しました");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
