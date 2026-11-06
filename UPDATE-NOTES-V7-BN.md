# TUSHAR SIM Manager V7 — Update Notes

## কী পরিবর্তন হয়েছে
- Header থেকে সবসময় দেখা SIM counters সরানো হয়েছে; Eye/Statistics বাটনে আলাদা Overview panel থেকে দেখা যাবে।
- Three-dot menu-তে All, Tourist, Medical, Other, Unknown, Given, Incomplete category count ও navigation আছে।
- Search placeholder/helper text সরানো হয়েছে; সার্চ বক্সে শুধু ব্যবহারকারীর টাইপ করা অক্ষর থাকবে।
- Bottom navigation static HTML এবং মূল application scope-এ wired; Search/Wanted/List/Backup সরাসরি panel খুলবে।
- মোবাইল dock একেবারে viewport-এর নিচে safe-area padding-সহ রাখা হয়েছে।
- SIM row mobile layout compact: Serial/Type ID, নম্বর, নাম, জেলা/টাইপ/নোট, তারপর action icons।
- লোগো object-fit: contain করে রাখা হয়েছে, Crop হবে না।
- Service Worker cache version V7 করা হয়েছে যাতে পুরোনো cached UI কমে।

## GitHub Desktop দিয়ে আপডেট
1. ZIP Extract করুন।
2. ZIP-এর ভেতরের সব file/folder `Documents\GitHub\tushar-sim-manager`-এ copy করে Replace করুন।
3. `.git` folder কখনো replace/delete করবেন না।
4. GitHub Desktop → Changes → Commit: `Fix mobile navigation, category menu and compact layout V7`
5. Push origin করুন।
6. মোবাইলে site খুলে Hard Refresh করুন। প্রয়োজনে Browser Site Settings থেকে Cache clear করে আবার খুলুন।

## ডেটা নিরাপত্তা
- Firebase config/sync module এবং Firestore record schema অপরিবর্তিত।
- নতুন করে Restore/Import লাগবে না।
- কোনো backup বা customer data public GitHub repository-তে যোগ করবেন না।
