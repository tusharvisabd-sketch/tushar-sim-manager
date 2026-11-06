# TUSHAR SIM MANAGER — V6 Navigation & Category Fix

এই সংস্করণে মূলত V5-এর navigation ও category-view সমস্যা ঠিক করা হয়েছে। Firebase configuration, Firebase sync module, Firestore collection structure এবং SIM ID/data schema পরিবর্তন করা হয়নি।

## কী ঠিক হয়েছে

1. Header-এর Total SIMs, Tourist, Medical, Other, Given ও Incomplete counter এখন clickable shortcut। চাপলে SIM List খুলে সংশ্লিষ্ট রেকর্ড দেখায়।
2. Three-dot menu-তে All SIMs, Tourist, Medical, Other, Unknown, Given এবং Incomplete ক্যাটাগরি count-সহ দেখায়। যেকোনো category চাপলে সেই category-র রেকর্ড SIM List-এ দেখা যায়।
3. Bottom navigation-এর Search, Wanted, List ও Backup বাটনগুলো এখন shared navigation API ব্যবহার করে। আগের সংস্করণে mobile navigation আলাদা JavaScript scope থেকে private function ডাকছিল, তাই Wanted/List/Backup বাটন সঠিকভাবে কাজ করছিল না।
4. Wanted / Backup / List panel একসঙ্গে অযথা খোলা থাকবে না; নির্বাচিত panel-ই সামনে আসবে।
5. Service Worker cache version বাড়ানো হয়েছে, যাতে পুরোনো navigation script cache থেকে না আসে।

## GitHub Desktop-এ আপডেট

1. ZIP Extract করো।
2. ZIP-এর ভেতরের সব Website File ও Folder `Documents/GitHub/tushar-sim-manager/`-এর Root-এ কপি করো।
3. Replace files নির্বাচন করো। `.git` ফোল্ডার স্পর্শ বা মুছবে না।
4. GitHub Desktop → Changes দেখো।
5. Summary: `Fix SIM categories and mobile navigation V6`
6. Commit to main → Push origin।
7. GitHub Pages URL খুলে Hard Refresh করো।

## নিরাপত্তা

- Public GitHub Repository-তে SIM backup, গ্রাহকের ফোন নম্বরের JSON/CSV, private export বা password রাখবে না।
- `firebase-config.js` browser app-এর public Firebase web config। Firestore Security Rules ও Firebase Authentication-ই ডেটা সুরক্ষিত রাখে।
- Firebase Console বা Firestore Data মুছবে না, নতুন করে Restore/Import করবে না।
