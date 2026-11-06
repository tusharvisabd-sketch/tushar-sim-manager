# TUSHAR SIM Manager V7 — Functional UI Fix

## কী ঠিক করা হয়েছে
- Header-এ সবসময় দেখা Total/Tourist/Medical/Other/Given/Wanted/Incomplete কাউন্টার সরানো হয়েছে। Header-এর Eye আইকন চাপলে আলাদা Overview panel-এ কাউন্টারগুলো দেখা যাবে; সেখান থেকে কাউন্টারে চাপলে সংশ্লিষ্ট Category list খুলবে।
- Search-এর পাশের তিন-ডট মেনুতে All, Tourist, Medical, Other, Unknown, Given এবং Incomplete — প্রতিটির count ও category navigation আছে। একই মেনু থেকে Statistics, Wanted List ও Backup & Restore খোলা যায়।
- Search input-এ placeholder/helper text রাখা হয়নি। Search করার সময় লেখা আর placeholder-এর সঙ্গে overlap করবে না।
- নিচের Search/Wanted/List/Backup navigation static HTML এবং main app-এর সরাসরি event handler দিয়ে যুক্ত; চারটি বাটন নিজ নিজ panel খুলবে। মোবাইলে bar একেবারে viewport-এর নিচে safe-area padding-সহ থাকবে। Search tab শুধু icon হিসেবে দেখাবে।
- SIM List-এ মোবাইল row compact: Serial/Type ID, নম্বর, নাম, জেলা/নোট/ধরন এবং নিচে Given/Edit/Delete action।
- Header logo `object-fit: contain`; লোগো crop হবে না।
- Service Worker cache V7 করা হয়েছে যাতে নতুন UI পুরোনো cached version-এর সঙ্গে গুলিয়ে না যায়।

## কম্পিউটারে আপডেট
1. ZIP Extract করুন।
2. Extract করা ZIP-এর ভিতরের সব ফাইল ও folder কপি করুন।
3. এগুলো আপনার বর্তমান Repository-তে paste করুন: `Documents\GitHub\tushar-sim-manager`
4. Replace files নির্বাচন করুন। `.git` folder কখনো delete বা replace করবেন না।
5. GitHub Desktop খুলে Summary লিখুন: `Fix UI navigation and mobile layout V7`
6. Commit to main → Push origin করুন।
7. GitHub Pages deploy শেষ হলে মোবাইলে আপনার app URL খুলে Hard Refresh করুন। পুরোনো PWA cache থাকলে Browser-এর site storage/cache clear করে আবার খুলুন।

## ডেটা সুরক্ষা
- Firebase config, Firebase sync module, Authentication, Firestore paths ও SIM/Wanted record schema অপরিবর্তিত রাখা হয়েছে।
- আগের Cloud Data আবার Import/Restore করতে হবে না।
- এই ZIP-এ কোনো SIM backup/customer data নেই। Public GitHub Repository-তে কখনো private backup বা গ্রাহকের তথ্য যোগ করবেন না।
