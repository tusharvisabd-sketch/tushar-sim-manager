# TUSHAR SIM Manager V10 — Professional Loading Experience

- রিলোড/ওপেন করলে সাথে সাথে ব্র্যান্ডেড স্প্ল্যাশ স্ক্রিন: ঘুরন্ত লোগো রিং, প্রোগ্রেস বার ও ধাপে ধাপে বার্তা ("Checking your session…" → "Syncing your SIMs…" → "All set")। আগের মতো লগইন ফর্ম এক ঝলক দেখা যায় না।
- Sign in করার পর স্প্ল্যাশ থেকে স্মুথ ফেড হয়ে হেডার, কার্ড ও নিচের মেনু ধাপে ধাপে ভেসে ওঠে।
- Sign out করলে "Signing out…" ট্রানজিশন, তারপর লগইন কার্ড অ্যানিমেশনসহ আসে।
- Sign in বাটনে লোডিং স্পিনার; ভুল পাসওয়ার্ডে কার্ড হালকা কেঁপে ওঠে।
- ইন্টারনেট ধীর হলে "একটু বেশি সময় লাগছে…" বার্তা; আটকে গেলে ১৮ সেকেন্ড পর লোডার সরে যায়।
- দ্রুত লোডের জন্য Firebase ফাইলের preconnect/preload যোগ হয়েছে।
- বাংলা/ইংরেজি দুই ভাষায় কাজ করে; "reduce motion" সেটিং মানে।
- Firebase, ডেটা, firebase-sync.js ও কোনো logic অপরিবর্তিত। Service Worker cache v10।

আপডেট: ZIP-এর সব ফাইল GitHub ফোল্ডারে replace (.git ছুঁবেন না) → Commit → Push → ফোনে hard refresh।
