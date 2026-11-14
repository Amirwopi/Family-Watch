# 🎬 Family Watch Together (`familywatchtogether`)

A modern, synchronized watch-together platform built with **Node.js, TypeScript, and React** featuring a **Google Meet / Zoom-like meeting interface**, real-time synchronization, queue management, advanced custom subtitles styling, temporary 1-day subtitle uploads, in-video floating chat comments, and server-side **FFmpeg video re-encoding** (FPS and resolution/size adjustment).

---

## 🌟 Key Features

1. **Simple Username Login**:
   - Family members join instantly by providing **only a username** (no passwords, registration, or friction).
   - Session is preserved via local storage.

2. **Admin Secret Key Elevation**:
   - Master key (default: `admin123`, customizable via `ADMIN_SECRET_KEY` in `.env`) unlocks full control: video links, queue management, re-encoding FPS/size, and room settings.
   - Regular members can elevate to Admin anytime from the top bar with the secret key.

3. **Complete Subtitle Control Engine**:
   - **Persian Font Family (فونت‌های فارسی و لاتین)**:
     - انتخاب زنده فونت‌های محبوب فارسی: **وزیرمتن (Vazirmatn)**، **یکان (Yekan)**، **شبنم (Shabnam)**، **ساحل (Sahel)** و سیستم / لاتین (Inter).
     - پشتیبانی کامل و خودکار از راست‌به‌چپ (RTL Auto-detection) برای نمایش بی‌نقص زیرنویس‌های فارسی و انگلیسی.
   - **Subtitle Delay / Sync Offset**:
     - تنظیم تاخیر یا پیش‌افتادگی زیرنویس از `-10.0` تا `+10.0` ثانیه با گام‌های سریع `0.2s` و `0.5s` و `1.0s` جهت همگام‌سازی کامل با دیالوگ‌ها.
   - **Text Color**: Palette presets (White, Yellow, Cyan, Green, Pink, Amber) + Hex color picker.
   - **Background Color & Transparency**:
     - Toggle background ON / OFF.
     - Transparency slider `0 - 255` (0 = fully transparent, 255 = fully opaque solid).
   - **Positioning (`0 - 100%`)**:
     - Toggle Custom Position ON / OFF.
     - Vertical position slider from `0%` (Top) to `100%` (Bottom).
   - **Prevent Covered by Controls**:
     - Automatically lifts subtitles above the timeline slider and controls bar whenever controls are visible!
   - **Font Size**:
     - Slider from `1px` to `70px` with instant live preview.
   - **Outline Font (Stroke & Shadow)**:
     - Toggle Outline ON / OFF.
     - Custom outline thickness (`1 - 8px`) and outline color picker.
   - **Temporary 1-Day Subtitle Upload**:
     - Upload custom `.srt` or `.vtt` subtitles directly in the player or Admin panel.
     - Automatically converted to WebVTT on the server.
     - Automatically deleted after 24 hours (1-day retention) by the server cleanup service.

4. **Real-time WebRTC Voice Chat (گفتگوی صوتی زنده با میکروفون)**:
   - گفتگوی صوتی همزمان (P2P Mesh) با نمایش انیمیشن و حجم صدای گوینده.
   - مدیریت هوشمند دسترسی میکروفون در مرورگر با راهنمای اختصاصی شبکه محلی (LAN).
   - **نکته دسترسی مرورگرها (Chrome / Edge):** برای استفاده از میکروفون روی سیستم سرور، از آدرس `http://localhost:5000` استفاده نمایید. برای اتصال دوستان از کامپیوترهای دیگر در شبکه محلی، طبق راهنمای دکمه میکروفون کافیست آدرس سرور را در `chrome://flags/#unsafely-treat-insecure-origin-as-secure` اضافه کنند.

5. **In-Video Floating Chat Comments (Danmaku / پیام‌های شناور روی ویدیو)**:
   - وقتی اعضا در چت پیام ارسال می‌کنند، متن پیام به همراه آواتار و نام کاربر به مدت ۴ ثانیه روی ویدیو به صورت متحرک و ملایم نمایش داده شده و سپس به طور خودکار محو می‌شود.
   - پشتیبانی کامل از متن و فونت‌های فارسی و تراز راست‌به‌چپ.

6. **YouTube-Style "Stats for Nerds" & Live Ping (دیباگر و اطلاعات آماری مثل یوتیوب)**:
   - پنل شیشه‌ای دیباگر یوتیوب با کلیک راست روی ویدیو، آیکون دیباگر در نوار ابزار یا کلید میانبر `Shift + D`.
   - نمایش سرعت اتصال زنده (`Connection Speed`) به همراه نمودار اسپارک‌لاین متحرک (`Kbps`).
   - نمایش سلامت و میزان بافر دانلود شده جلوتر (`Buffer Health`) به ثانیه به همراه نمودار رنگی.
   - نمایش پینگ و تاخیر رفت و برگشت لحظه‌ای به سرور بر حسب میلی‌ثانیه (`Ping / Latency`).
   - نمایش فریم‌های افتاده (`Dropped Frames`)، ابعاد تصویر و کدک‌های پخش.

7. **Smart Buffer Sync & Deep Pre-Buffering (دانلود چند دقیقه جلوتر و قفل هوشمند بافر)**:
   - سیستم پیش‌بارگذاری چند دقیقه جلوتر (Pre-buffering) از طریق درخواست‌های زنجیره‌ای Range Requests جهت دانلود بدون وقفه مانند یوتیوب.
   - لودینگ انیمیشنی پیش از شروع پخش برای دانلود حداقل ۵ دقیقه جلوتر از ویدیو.
   - توقف خودکار ویدیو برای همه افراد در صورتی که بافر کاربری به کمتر از ۱ دقیقه برسد، همراه با نمایش پیام هشدار روی صفحه با ذکر نام دقیق کاربر و نوار پیشرفت بافر تمام شرکت‌کنندگان.
   - ادامه پخش خودکار پس از رسیدن بافر همه کاربران به وضعیت امن.
   - قابلیت پخش فوری (Force Play) و تنظیمات پیشرفته در پنل ادمین.

8. **Videos of Any Duration & Range Seeking**:
   - Built-in **HTTP 206 Partial Content Range streaming proxy** (`/api/video/stream?url=...`).
   - Streams multi-gigabyte or hours-long videos smoothly with instant seeking and without CORS issues.

9. **FFmpeg Video Re-encoding (FPS & Size Adjustment)**:
   - Target FPS: 24 FPS, 30 FPS, 60 FPS.
   - Target Resolution: 1080p, 720p, 480p, 360p.
   - Live progress updates (percentage, speed, and FPS) broadcast over WebSocket.

---

## 🚀 Quick Start

### 1. Windows 1-Click Launch
Double click `start.bat`!

### 2. Manual Launch
```bash
npm install
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!
