import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    // 1. API Anahtarını kontrol et
    const apiKey = process.env.RESEND_API_KEY;
    
    console.log("------------------------------------------------");
    console.log("API KEY DURUMU:", apiKey ? "✅ Bulundu" : "❌ BULUNAMADI (Undefined)");
    console.log("------------------------------------------------");

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Sunucu hatası: API Key tanımlanmamış (.env dosyasını kontrol et)' }, 
        { status: 500 }
      );
    }

    // 2. Resend'i BURADA başlat (En güvenli yer)
    const resend = new Resend(apiKey);

    const { email, code } = await req.json();

    const data = await resend.emails.send({
      from: 'YamanAI <onboarding@resend.dev>',
      to: email,
      subject: 'YamanAI Giriş Kodu',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #333;">YamanAI Giriş</h2>
          <p>Giriş yapmak için aşağıdaki doğrulama kodunu kullanın:</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0;">
            <span style="font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #000;">${code}</span>
          </div>
          <p style="color: #888; font-size: 12px;">Bu kod 10 dakika geçerlidir.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Mail hatası:", error);
    return NextResponse.json({ success: false, error: 'Mail gönderilemedi' }, { status: 500 });
  }
}