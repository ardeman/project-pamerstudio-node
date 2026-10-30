# Coba Lagi: launch posts

Drafted 2026-10-30, for 2.9.0. The user posts each one by hand, over one week. Each post uses its own campaign link (Results in `marketing-plan.md`). Claims come from the app repo's store listing and README.

**Before posting:**

- Google Play: 2.9.0 went live in production on 2026-10-30 (Play Console), so the Play links work.
- Copy each link from Results in `marketing-plan.md`: they carry the `pt` token now.
- Read each community's rules first. Many subreddits allow self-promotion only in a weekly thread, or ask you to message the mods first. If a rule says no, skip it and note that under Done.
- Post as yourself, the developer, and stay around for the first few hours to answer questions. Bring new comments here for reply drafts.
- Not one post a day in many places: about one channel a day spreads the replies out.

## English

### 1. Show HN (Hacker News)

HN wants something people can try, and the maker posting it. Post on a weekday morning, US time. The title is at most 80 characters.

- **Title:** Show HN: Coba Lagi – open-source coding game for kids aged 6–8 (Flutter, Flame)
- **URL:** https://github.com/ardeman/project_cobalagi_flutter
- **First comment** (post it right after):

> Hi HN, I made Coba Lagi ("try again" in Indonesian), a coding game for children who mostly can't read yet. Kids put picture blocks in order to guide a robot across nine planets, one idea per planet: directions, sequencing, loops, their own block (functions), looking ahead (conditions), a step box (variables), debugging, repeat-until and if/otherwise. Every instruction is spoken, in Bahasa Indonesia and English. Readers can switch to a Code tab and type the same program as text.
>
> A few things that might interest people here:
>
> - It's GPL-3.0. No ads, no tracking, no accounts, no network connection needed.
> - After every puzzle it picks what comes next: the next planet, a generated practice puzzle (checked to be solvable before it's shown) or a review of an earlier skill. A short voice-led warm-up finds each child's starting point.
> - One Flutter codebase with Flame for the game, on iPhone, iPad, Mac, Android, Windows and Linux. The Linux AppImage runs on the Steam Deck, and game controllers work everywhere without touching the screen.
>
> It's free for one player; a one-time tip unlocks extras like up to six players on one device. It's on Google Play (<Play link, utm_source=hn>) and the App Store (<App Store link, ct=hn>), and builds for every platform are on GitHub Releases. I'd love feedback, especially from parents and teachers of young kids.

### 2. r/homeschool

Check the sidebar for its self-promotion rule before posting. Write it as a parent sharing a resource, and ask a real question.

- **Title:** I made a free coding game for 6–8 year olds that doesn't need reading. Would love homeschool parents' feedback
- **Text:**

> Hi all. I'm the developer of Coba Lagi, a coding game for young kids. They put picture blocks in order to guide a little robot to a flag, and every instruction is spoken, so kids who can't read yet can play on their own. It goes through directions, putting steps in order, loops, building their own block, conditions, debugging and more, one idea per "planet", with a short demo at the start of each.
>
> After each puzzle it picks the next step for the child: move on, practise with a new puzzle, or review an earlier skill. Mistakes get encouragement, never "wrong", and the block that caused a bump is marked.
>
> For parents: no ads, no accounts, no tracking, works offline, and the parent area is behind a grown-up question. You can set a break reminder (15, 30 or 45 minutes). It's free for one child; a one-time tip unlocks up to six players and a progress report per child.
>
> It's in English and Bahasa Indonesia. iPhone/iPad/Mac: <App Store link, ct=r-homeschool>. Android: <Play link, utm_source=r-homeschool>. Also Windows and Linux: https://cobalagi.ardeman.com
>
> If you try it with your kids, I'd really like to hear what worked and what didn't.

### 3. r/SteamDeck

Lead with the Deck, not the learning. Check the rules: some weeks allow only certain kinds of posts.

- **Title:** Made a kids' coding game that's fully playable with the Deck's controls (free, open source, AppImage)
- **Text:**

> I made Coba Lagi, a coding puzzle game for kids aged 6–8: picture blocks guide a little robot to a flag, and every instruction is spoken, so pre-readers can play.
>
> On the Deck:
>
> - Linux AppImage, add it to Steam as a non-Steam game and play it in Game Mode
> - Every screen works with the controls, no touchscreen needed (touch works too). Keep the controller layout on "Gamepad"
> - Opens at 1280 × 800, the Deck's screen
> - Text fields open Steam's on-screen keyboard
> - Works offline, no ads, no accounts, GPL-3.0
>
> Download: https://github.com/ardeman/project_cobalagi_flutter/releases
>
> Built with Flutter and Flame. Happy to hear about anything that doesn't feel right on the Deck.

### 4. r/FlutterDev and Flame

r/FlutterDev: check the rules for "show your app" posts (some subs keep them to a weekly thread). Flame: share it in the `#showcase` channel of Flame's Discord, or open a pull request adding it to the Flame community's awesome-flame list on GitHub; look at how they list games first.

- **Title:** Coba Lagi: an open-source (GPL) kids' coding game in Flutter + Flame, on six platforms
- **Text:**

> I've released Coba Lagi, a coding game for kids aged 6–8, and the source is on GitHub under the GPL: https://github.com/ardeman/project_cobalagi_flutter
>
> Some parts that might be useful to other Flutter/Flame devs:
>
> - Flutter for the UI (block editor, parent area, map), Flame for the robot and the board
> - One codebase on iOS, iPadOS, macOS, Android, Windows and Linux (an AppImage that also runs on the Steam Deck)
> - Game controller support on every platform, so every screen works without touch
> - The learning rules (skill graph, mastery, what to play next, the warm-up placement) are pure Dart, separate from the UI
> - Practice puzzles are generated and checked to be solvable before they're shown
> - Fully offline, no analytics
>
> Questions about any of it are welcome.

### 5. Product Hunt

Schedule the launch for 12:01 a.m. Pacific time on a weekday (a Tuesday to Thursday has the most traffic and competition; a weekend is quieter). Tagline at most 60 characters, description at most 260.

- **Name:** Coba Lagi
- **Tagline:** A coding game for kids aged 6–8, no reading needed
- **Description:** Kids put picture blocks in order to guide Koba the robot across nine planets: loops, conditions, debugging and more. Every instruction is spoken, in Bahasa Indonesia and English. No ads, no tracking, works offline. Free for one player, open source.
- **Links:** website, App Store (`ct=producthunt`), Google Play (`utm_source=producthunt`)
- **Topics:** Education, Kids, Games, Open Source
- **Media:** the promo video and the store screenshots (gameplay only)
- **Maker comment:** the first two paragraphs of the Show HN comment, without the Flutter bullet.

## Bahasa Indonesia

Koding dan AI adalah mapel pilihan mulai kelas 5 SD, hanya di sekolah yang siap; jadwal mulainya beda-beda di berita. Coba Lagi untuk 6–8 tahun, jadi tulis "dasar sebelum kelas 5", tanpa menyebut tahun.

### 6. Grup Facebook parenting dan homeschooling

Baca aturan grupnya dulu: banyak grup melarang promosi, atau hanya di hari tertentu. Kalau ragu, minta izin admin.

> Halo Ayah Bunda 👋 Saya pembuat Coba Lagi, game belajar koding untuk anak 6–8 tahun.
>
> Anak menyusun blok bergambar supaya robot kecil, Koba, sampai ke bendera. Semua petunjuknya diucapkan, jadi anak yang belum lancar membaca bisa main sendiri. Ada 9 planet: arah, langkah berurutan, pengulangan, blok buatan sendiri, cek jalan dulu, mencari blok yang salah, dan lainnya. Setiap planet diawali contoh singkat.
>
> Kalau salah, nggak ada kata "salah", cuma ajakan coba lagi, dan blok yang bikin Koba nabrak ditandai.
>
> Buat orang tua: tanpa iklan, tanpa akun, bisa offline, area orang tua dikunci pertanyaan untuk orang dewasa, dan ada pengingat istirahat (15, 30 atau 45 menit). Gratis untuk satu anak; tip sekali bayar membuka sampai enam pemain dan laporan perkembangan tiap anak.
>
> Bahasanya Indonesia dan Inggris. Android: <link Play, utm_source=facebook>. iPhone/iPad/Mac: <link App Store, ct=facebook>.
>
> Kalau sudah dicoba bareng anak, saya senang sekali dengar masukannya 🙏

### 7. Komunitas guru dan WhatsApp

Untuk guru TK/SD dan grup WhatsApp guru. Lebih pendek, dan fokus ke kelas.

> Bapak/Ibu guru, saya mau berbagi Coba Lagi, game belajar koding gratis untuk anak 6–8 tahun. Anak menyusun blok bergambar untuk menggerakkan robot; semua petunjuk diucapkan, jadi siswa yang belum lancar membaca tetap bisa ikut. Materinya urutan langkah, pengulangan, kondisi dan mencari kesalahan, dasar sebelum mapel pilihan Koding dan AI di kelas 5.
>
> Tanpa iklan, tanpa akun, dan bisa jalan tanpa internet, jadi aman dipakai di kelas. Ada di Android, iPhone/iPad, Mac, Windows dan Linux.
>
> Android: <link Play, utm_source=whatsapp>
> iPhone/iPad: <link App Store, ct=whatsapp>
> Semua versi: https://cobalagi.ardeman.com

## Done

| Where | Posted | Notes (rules, replies, installs) |
|---|---|---|
| Show HN | | |
| r/homeschool | | |
| r/SteamDeck | | |
| r/FlutterDev | | |
| Flame showcase | | |
| Product Hunt | | |
| Facebook groups | | |
| Teacher communities, WhatsApp | | |
