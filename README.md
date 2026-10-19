# YMusic Download API

API مستقل لتحميل المسار الصوتي من رابط YouTube، مناسب للنشر على Vercel.

## الاستخدام

`GET https://YOUR-DOMAIN.vercel.app/api/download?url=VIDEO_URL`

يرجع مسار الصوت الأصلي المتاح مثل M4A، ولا يحتاج ffmpeg.

## النشر على Vercel

1. استورد مستودع GitHub إلى Vercel.
2. اترك Framework على Other.
3. بعد النشر استخدم `/api/download?url=...` في تطبيق YMusic.

استخدم الخدمة مع المحتوى الذي تملك حق تنزيله أو لديك إذن بحفظه.
