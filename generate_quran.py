# ============================================================
# generate_quran.py
# Télécharge les 114 sourates depuis l'API Quran.com
# et génère un fichier quran_data.json
# ============================================================

import json
import requests
import time

# --- Liste complète des noms de sourates (français et arabe) ---
SURAH_NAMES = {
    1: {"fr": "Al-Fatiha", "ar": "الفاتحة"},
    2: {"fr": "Al-Baqarah", "ar": "البقرة"},
    3: {"fr": "Al-Imran", "ar": "آل عمران"},
    4: {"fr": "An-Nisa", "ar": "النساء"},
    5: {"fr": "Al-Ma'idah", "ar": "المائدة"},
    6: {"fr": "Al-An'am", "ar": "الأنعام"},
    7: {"fr": "Al-A'raf", "ar": "الأعراف"},
    8: {"fr": "Al-Anfal", "ar": "الأنفال"},
    9: {"fr": "At-Tawbah", "ar": "التوبة"},
    10: {"fr": "Yunus", "ar": "يونس"},
    11: {"fr": "Hud", "ar": "هود"},
    12: {"fr": "Yusuf", "ar": "يوسف"},
    13: {"fr": "Ar-Ra'd", "ar": "الرعد"},
    14: {"fr": "Ibrahim", "ar": "ابراهيم"},
    15: {"fr": "Al-Hijr", "ar": "الحجر"},
    16: {"fr": "An-Nahl", "ar": "النحل"},
    17: {"fr": "Al-Isra", "ar": "الإسراء"},
    18: {"fr": "Al-Kahf", "ar": "الكهف"},
    19: {"fr": "Maryam", "ar": "مريم"},
    20: {"fr": "Taha", "ar": "طه"},
    21: {"fr": "Al-Anbiya", "ar": "الأنبياء"},
    22: {"fr": "Al-Hajj", "ar": "الحج"},
    23: {"fr": "Al-Mu'minun", "ar": "المؤمنون"},
    24: {"fr": "An-Nur", "ar": "النور"},
    25: {"fr": "Al-Furqan", "ar": "الفرقان"},
    26: {"fr": "Ash-Shu'ara", "ar": "الشعراء"},
    27: {"fr": "An-Naml", "ar": "النمل"},
    28: {"fr": "Al-Qasas", "ar": "القصص"},
    29: {"fr": "Al-Ankabut", "ar": "العنكبوت"},
    30: {"fr": "Ar-Rum", "ar": "الروم"},
    31: {"fr": "Luqman", "ar": "لقمان"},
    32: {"fr": "As-Sajdah", "ar": "السجدة"},
    33: {"fr": "Al-Ahzab", "ar": "الأحزاب"},
    34: {"fr": "Saba", "ar": "سبأ"},
    35: {"fr": "Fatir", "ar": "فاطر"},
    36: {"fr": "Ya-Sin", "ar": "يس"},
    37: {"fr": "As-Saffat", "ar": "الصافات"},
    38: {"fr": "Sad", "ar": "ص"},
    39: {"fr": "Az-Zumar", "ar": "الزمر"},
    40: {"fr": "Ghafir", "ar": "غافر"},
    41: {"fr": "Fussilat", "ar": "فصلت"},
    42: {"fr": "Ash-Shura", "ar": "الشورى"},
    43: {"fr": "Az-Zukhruf", "ar": "الزخرف"},
    44: {"fr": "Ad-Dukhan", "ar": "الدخان"},
    45: {"fr": "Al-Jathiyah", "ar": "الجاثية"},
    46: {"fr": "Al-Ahqaf", "ar": "الأحقاف"},
    47: {"fr": "Muhammad", "ar": "محمد"},
    48: {"fr": "Al-Fath", "ar": "الفتح"},
    49: {"fr": "Al-Hujurat", "ar": "الحجرات"},
    50: {"fr": "Qaf", "ar": "ق"},
    51: {"fr": "Adh-Dhariyat", "ar": "الذاريات"},
    52: {"fr": "At-Tur", "ar": "الطور"},
    53: {"fr": "An-Najm", "ar": "النجم"},
    54: {"fr": "Al-Qamar", "ar": "القمر"},
    55: {"fr": "Ar-Rahman", "ar": "الرحمن"},
    56: {"fr": "Al-Waqi'ah", "ar": "الواقعة"},
    57: {"fr": "Al-Hadid", "ar": "الحديد"},
    58: {"fr": "Al-Mujadilah", "ar": "المجادلة"},
    59: {"fr": "Al-Hashr", "ar": "الحشر"},
    60: {"fr": "Al-Mumtahanah", "ar": "الممتحنة"},
    61: {"fr": "As-Saff", "ar": "الصف"},
    62: {"fr": "Al-Jumu'ah", "ar": "الجمعة"},
    63: {"fr": "Al-Munafiqun", "ar": "المنافقون"},
    64: {"fr": "At-Taghabun", "ar": "التغابن"},
    65: {"fr": "At-Talaq", "ar": "الطلاق"},
    66: {"fr": "At-Tahrim", "ar": "التحريم"},
    67: {"fr": "Al-Mulk", "ar": "الملك"},
    68: {"fr": "Al-Qalam", "ar": "القلم"},
    69: {"fr": "Al-Haqqah", "ar": "الحاقة"},
    70: {"fr": "Al-Ma'arij", "ar": "المعارج"},
    71: {"fr": "Nuh", "ar": "نوح"},
    72: {"fr": "Al-Jinn", "ar": "الجن"},
    73: {"fr": "Al-Muzzammil", "ar": "المزمل"},
    74: {"fr": "Al-Muddaththir", "ar": "المدثر"},
    75: {"fr": "Al-Qiyamah", "ar": "القيامة"},
    76: {"fr": "Al-Insan", "ar": "الإنسان"},
    77: {"fr": "Al-Mursalat", "ar": "المرسلات"},
    78: {"fr": "An-Naba", "ar": "النبأ"},
    79: {"fr": "An-Nazi'at", "ar": "النازعات"},
    80: {"fr": "Abasa", "ar": "عبس"},
    81: {"fr": "At-Takwir", "ar": "التكوير"},
    82: {"fr": "Al-Infitar", "ar": "الإنفطار"},
    83: {"fr": "Al-Mutaffifin", "ar": "المطففين"},
    84: {"fr": "Al-Inshiqaq", "ar": "الإنشقاق"},
    85: {"fr": "Al-Buruj", "ar": "البروج"},
    86: {"fr": "At-Tariq", "ar": "الطارق"},
    87: {"fr": "Al-A'la", "ar": "الأعلى"},
    88: {"fr": "Al-Ghashiyah", "ar": "الغاشية"},
    89: {"fr": "Al-Fajr", "ar": "الفجر"},
    90: {"fr": "Al-Balad", "ar": "البلد"},
    91: {"fr": "Ash-Shams", "ar": "الشمس"},
    92: {"fr": "Al-Layl", "ar": "الليل"},
    93: {"fr": "Ad-Duha", "ar": "الضحى"},
    94: {"fr": "Ash-Sharh", "ar": "الشرح"},
    95: {"fr": "At-Tin", "ar": "التين"},
    96: {"fr": "Al-Alaq", "ar": "العلق"},
    97: {"fr": "Al-Qadr", "ar": "القدر"},
    98: {"fr": "Al-Bayyinah", "ar": "البينة"},
    99: {"fr": "Az-Zalzalah", "ar": "الزلزلة"},
    100: {"fr": "Al-Adiyat", "ar": "العاديات"},
    101: {"fr": "Al-Qari'ah", "ar": "القارعة"},
    102: {"fr": "At-Takathur", "ar": "التكاثر"},
    103: {"fr": "Al-Asr", "ar": "العصر"},
    104: {"fr": "Al-Humazah", "ar": "الهمزة"},
    105: {"fr": "Al-Fil", "ar": "الفيل"},
    106: {"fr": "Quraysh", "ar": "قريش"},
    107: {"fr": "Al-Ma'un", "ar": "الماعون"},
    108: {"fr": "Al-Kawthar", "ar": "الكوثر"},
    109: {"fr": "Al-Kafirun", "ar": "الكافرون"},
    110: {"fr": "An-Nasr", "ar": "النصر"},
    111: {"fr": "Al-Masad", "ar": "المسد"},
    112: {"fr": "Al-Ikhlas", "ar": "الإخلاص"},
    113: {"fr": "Al-Falaq", "ar": "الفلق"},
    114: {"fr": "An-Nas", "ar": "الناس"}
}


def fetch_surah(surah_id):
    """
    Télécharge une sourate depuis l'API Quran.com
    Retourne la liste des versets avec texte arabe, traduction française et anglaise
    """
    url = f"https://api.quran.com/api/v4/verses/by_chapter/{surah_id}?words=true&word_fields=text_uthmani&translations=131,132"
    
    try:
        response = requests.get(url, timeout=15)
        data = response.json()
        verses = []
        
        for v in data.get('verses', []):
            # Récupérer le texte arabe (concaténation des mots)
            arabic = ' '.join([w.get('text_uthmani', '') for w in v.get('words', [])])
            
            # Récupérer les traductions (français et anglais)
            fr = ''
            en = ''
            for t in v.get('translations', []):
                if t.get('resource_id') == 131:  # Français
                    fr = t.get('text', '')
                elif t.get('resource_id') == 132:  # Anglais
                    en = t.get('text', '')
            
            verses.append({
                "id": v['verse_number'],
                "arabic": arabic,
                "fr": fr,
                "en": en
            })
        
        return verses
    
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement de la sourate {surah_id}: {e}")
        return []


def generate_quran_json():
    """
    Génère le fichier quran_data.json avec toutes les sourates
    """
    print("=" * 60)
    print("🕌 GÉNÉRATION DU FICHIER QURAN_DATA.JSON")
    print("=" * 60)
    print("📥 Téléchargement des 114 sourates depuis l'API Quran.com...")
    print("⏳ Cette opération peut prendre 2-3 minutes.\n")
    
    all_sourates = []
    total = 114
    
    for i in range(1, total + 1):
        print(f"📖 Téléchargement sourate {i}/{total}...", end=" ")
        verses = fetch_surah(i)
        name = SURAH_NAMES.get(i, {"fr": f"Sourate {i}", "ar": f"سورة {i}"})
        
        all_sourates.append({
            "id": i,
            "name_fr": name.get("fr", f"Sourate {i}"),
            "name_ar": name.get("ar", f"سورة {i}"),
            "verses": verses
        })
        
        print(f"✅ {len(verses)} versets")
        time.sleep(0.3)  # Pause pour respecter les limites de l'API
    
    # Sauvegarde du fichier JSON
    output = {"sourates": all_sourates}
    
    with open("quran_data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    # Statistiques
    total_verses = sum(len(s['verses']) for s in all_sourates)
    
    print("\n" + "=" * 60)
    print("✅ Fichier quran_data.json généré avec succès !")
    print("=" * 60)
    print(f"📊 {total} sourates")
    print(f"📖 {total_verses} versets")
    print(f"💾 Taille du fichier : ~{round(sum(len(str(s)) for s in all_sourates) / 1024 / 1024, 2)} Mo")
    print("=" * 60)
    print("\n📁 Le fichier se trouve dans le dossier courant : quran_data.json")
    print("➡️ Copiez-le à côté de votre index.html")


if __name__ == "__main__":
    generate_quran_json()
