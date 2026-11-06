# V5 মোবাইল UI আপডেট

- Bottom navigation এখন স্ক্রিনের নিচের দিকে নামানো হয়েছে; Netlify badge-এর জন্য রাখা অতিরিক্ত ফাঁকা জায়গা সরানো হয়েছে।
- Floating Add বোতাম Navigation-এর ঠিক ওপরে থাকবে।
- Search placeholder ছোট করা হয়েছে এবং input font/padding সামঞ্জস্য করা হয়েছে যাতে icon ও লেখা overlap না করে।
- Header logo-তে `object-fit: contain` ব্যবহার করা হয়েছে; লোগো আর crop হবে না।
- Backup tab থেকে Backup panel খোলা যাবে। Three-dot menu-তেও Backup & Restore shortcut যোগ করা হয়েছে।
- Backup panel-এ Download backup, Download CSV, Restore backup এবং Auto-backup বোতাম রয়েছে।
- Service Worker cache version বাড়ানো হয়েছে যাতে পুরোনো V4 UI cache থেকে না আসে।
- Firebase config, sync module, SIM data structure, ID counters এবং Firestore collection logic পরিবর্তন করা হয়নি।

## আপডেট করার নিয়ম
1. ZIP Extract করো।
2. ZIP-এর ভেতরের ফাইলগুলো তোমার `Documents/GitHub/tushar-sim-manager/` Repository Root-এ কপি করে পুরোনো V4 ফাইল Replace করো।
3. `.git` ফোল্ডার মুছবে না। `PRIVATE-DATA` বা SIM backup public GitHub repository-তে দেবে না।
4. GitHub Desktop → Changes → Commit → Push origin।
5. GitHub Pages deploy শেষ হলে `https://tusharvisabd-sketch.github.io/tushar-sim-manager/` খুলে Hard Refresh করো।

পুরোনো Firebase Database থেকে ডেটা আবার Import/Restore করার দরকার নেই।
