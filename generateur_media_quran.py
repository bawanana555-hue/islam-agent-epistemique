import os
import urllib.request
import json
import time

# Dossier de destination pour votre gestionnaire de fichiers
OUTPUT_DIR = "Coran_Media_Agent"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=== Démarrage de la préparation des médias pour le Gestionnaire de Fichiers ===")

# 1. Récupération de la liste des 114 sourates
surah_list_url = "https://api.alquran.cloud/v1/surah"
req = urllib.request.Request(surah_list_url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())['data']
except Exception as e:
    print(f"Erreur de connexion à l'API : {e}")
    exit()

# Boucle sur les 114 sourates
for surah in data:
    number = str(surah['number']).zfill(3) # Ex: 001, 002, ..., 114
    english_name = surah['englishName'].replace("'", "").replace(" ", "_")
    
    base_filename = f"{number}_{english_name}"
    mp3_path = os.path.join(OUTPUT_DIR, f"{base_filename}.mp3")
    json_path = os.path.join(OUTPUT_DIR, f"{base_filename}_data.json")
    srt_fr_path = os.path.join(OUTPUT_DIR, f"{base_filename}_AR_FR.srt")
    srt_en_path = os.path.join(OUTPUT_DIR, f"{base_filename}_AR_EN.srt")

    print(f"\n[Sourate {number}/114] Traitement de : {surah['englishName']} ({surah['name']})")

    # A. Téléchargement du fichier Audio MP3 (Récitation Mishary Rashid Alafasy)
    mp3_url = f"https://download.quranicaudio.com/quran/mishaari_raashid_al_3afasee/{number}.mp3"
    if not os.path.exists(mp3_path):
        print(f"  -> Téléchargement Audio MP3...")
        try:
            urllib.request.urlretrieve(mp3_url, mp3_path)
        except Exception as e:
            print(f"     Erreur MP3 : {e}")
    else:
        print("  -> MP3 déjà présent.")

    # B. Récupération des textes (Arabe, Français, Anglais)
    text_url = f"https://api.alquran.cloud/v1/surah/{surah['number']}/editions/quran-uthmani,fr.hamidullah,en.sahih"
    req_text = urllib.request.Request(text_url, headers={'User-Agent': 'Mozilla/5.0'})
    
    try:
        with urllib.request.urlopen(req_text) as res:
            surah_data = json.loads(res.read().decode())['data']
            
            ar_ayahs = surah_data[0]['ayahs'] # Texte Arabe
            fr_ayahs = surah_data[1]['ayahs'] # Traduction Française
            en_ayahs = surah_data[2]['ayahs'] # Traduction Anglaise

            # Sauvagarde au format JSON pour votre Gestionnaire de fichiers
            with open(json_path, 'w', encoding='utf-8') as f_json:
                json.dump({
                    "surah_number": surah['number'],
                    "name_arabic": surah['name'],
                    "name_english": surah['englishName'],
                    "ayahs_count": len(ar_ayahs),
                    "ayahs": [
                        {
                            "numberInSurah": ar_ayahs[i]['numberInSurah'],
                            "arabic": ar_ayahs[i]['text'],
                            "french": fr_ayahs[i]['text'],
                            "english": en_ayahs[i]['text']
                        } for i in range(len(ar_ayahs))
                    ]
                }, f_json, ensure_ascii=False, indent=2)

            # Génération des fichiers de sous-titres SRT (Arabe-Français)
            with open(srt_fr_path, 'w', encoding='utf-8') as f_srt_fr, \
                 open(srt_en_path, 'w', encoding='utf-8') as f_srt_en:
                
                for i in range(len(ar_ayahs)):
                    idx = i + 1
                    ar_txt = ar_ayahs[i]['text']
                    fr_txt = fr_ayahs[i]['text']
                    en_txt = en_ayahs[i]['text']
                    
                    # SRT Français
                    f_srt_fr.write(f"{idx}\n00:00:00,000 --> 00:00:10,000\n{ar_txt}\n{fr_txt}\n\n")
                    # SRT Anglais
                    f_srt_en.write(f"{idx}\n00:00:00,000 --> 00:00:10,000\n{ar_txt}\n{en_txt}\n\n")

            print("  -> Fichiers SRT et JSON générés avec succès.")
            
    except Exception as e:
        print(f"     Erreur récupération texte : {e}")

    time.sleep(0.2) # Petite pause pour respecter les serveurs API

print("\n=== Téléchargement et structuration terminés ! ===")
print(f"Tous vos fichiers se trouvent dans le dossier : {os.path.abspath(OUTPUT_DIR)}")
