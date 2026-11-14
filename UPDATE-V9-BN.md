# TUSHAR SIM Manager V9 — Phone Keyboard Fix

সমস্যা: ফোনের ব্রাউজারে কিপ্যাড (keyboard) খুললে Add/Save বাটন এবং সেভ-পরবর্তী "I have noted this ID / Noted" বাটন কিপ্যাডের নিচে চলে যেত।

যা ঠিক করা হয়েছে:
- Add SIM ফর্ম ও Edit ফর্ম এখন কিপ্যাডের ঠিক উপরে বসে; Add/Save বাটন সবসময় নিচে স্টিকি থাকে — স্ক্রল ছাড়াই ক্লিক করা যায়।
- সেভ করার পর "SIM saved" পপ-আপ আসলে কিপ্যাড নিজে থেকে বন্ধ হয়; "Noted" বাটন সবসময় দেখা যায় ও ক্লিক করা যায়।
- পপ-আপ/শিটগুলো নিচের dock ও + বাটনের উপরে দেখায়; টাইপ করার সময় dock ও + বাটন সরে থাকে।
- Edit খুললে ফোনে আর নিজে থেকে কিপ্যাড খোলে না।
- Login পেজ ছোট স্ক্রিনে স্ক্রল করা যায়।
- ফোনে ভারী blur effect বন্ধ (স্মুথ পারফরম্যান্স)।
- Firebase, ডেটা, ID/serial logic, firebase-sync.js — কিছুই পরিবর্তন হয়নি। Service Worker cache v9।

আপডেট: ZIP-এর সব ফাইল আপনার GitHub repository ফোল্ডারে replace করুন (.git ছুঁবেন না) → GitHub Desktop-এ Commit → Push। তারপর ফোনে পেজ hard refresh / browser cache clear করুন।

সতর্কতা: repository public — কাস্টমারের ডেটা, backup, password কখনো এতে রাখবেন না।
