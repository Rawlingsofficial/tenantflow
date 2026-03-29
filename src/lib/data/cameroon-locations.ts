// src/lib/data/cameroon-locations.ts

export type Region = keyof typeof CAMEROON_LOCATIONS;
export type Division<R extends Region> = keyof typeof CAMEROON_LOCATIONS[R]; // Renamed from Department

export const CAMEROON_LOCATIONS = {
  "Adamawa": {
    "Djérem": ["Ngaoundal", "Tibati"],
    "Faro-et-Déo": ["Galim-Tignère", "Kontcha", "Mayo-Baléo", "Tignère"],
    "Mayo-Banyo": ["Bankim", "Banyo", "Mayo-Darlé"],
    "Mbéré": ["Dir", "Djohong", "Meiganga", "Ngaoui"],
    "Vina": ["Belel", "Mbe", "Nganha", "Ngaoundéré I", "Ngaoundéré II", "Ngaoundéré III", "Nyambaka"]
  },
  "Centre": {
    "Haute-Sanaga": ["Bibey", "Lembe-Yezoum", "Mbandjock", "Minta", "Nanga-Eboko", "Nkoteng", "Nsem"],
    "Lekié": ["Batchenga", "Ebebda", "Elig-Mfomo", "Evodoula", "Monatélé", "Obala", "Okola", "Sa'a"],
    "Mbam-et-Inoubou": ["Bafia", "Bokito", "Deuk", "Kiiki", "Kon-Yambetta", "Makénéné", "Ndikiniméki", "Nitoukou", "Ombessa"],
    "Mbam-et-Kim": ["Mbangassina", "Ngambè-Tikar", "Ngoro", "Ntui", "Yoko"],
    "Méfou-et-Afamba": ["Akono", "Assok", "Awaé", "Awout", "Esse", "Mfou", "Nkolafamba", "Soa"],
    "Méfou-et-Akono": ["Akono", "Bikok", "Mbankomo", "Ngoumou"],
    "Mfoundi": ["Yaoundé I", "Yaoundé II", "Yaoundé III", "Yaoundé IV", "Yaoundé V", "Yaoundé VI", "Yaoundé VII"],
    "Nyong-et-Kéllé": ["Biyouha", "Bondjock", "Bot-Makak", "Dibang", "Éséka", "Makak", "Matomb", "Messondo", "Ngog-Mapubi"],
    "Nyong-et-Mfoumou": ["Akonolinga", "Ayos", "Endom", "Kobdombo", "Mengang"],
    "Nyong-et-So'o": ["Akoeman", "Dzeng", "Mbalmayo", "Mengueme", "Nkolmetet"]
  },
  "East (Est)": {
    "Boumba-et-Ngoko": ["Gari-Gombo", "Moloundou", "Salapoumbé", "Yokadouma"],
    "Haut-Nyong": ["Abong-Mbang", "Dimako", "Doumaintang", "Doumé", "Lomié", "Messamena", "Mindourou", "Ngoyla"],
    "Kadey": ["Batouri", "Kentzou", "Kette", "Mbang", "Ndelele"],
    "Lom-et-Djérem": ["Bélabo", "Bertoua I", "Bertoua II", "Diang", "Garoua-Boulaï", "Ngoura"]
  },
  "Far North (Extrême-Nord)": {
    "Diamaré": ["Bogo", "Dargala", "Gazawa", "Maroua I", "Maroua II", "Maroua III", "Meri", "Ndoukoula", "Petté"],
    "Logone-et-Chari": ["Blangoua", "Darak", "Fotokol", "Goulfey", "Hile-Alifa", "Kousseri", "Logone-Birni", "Makary", "Waza", "Zina"],
    "Mayo-Danay": ["Datcheka", "Gobo", "Guere", "Kai-Kai", "Kalfou", "Kar-Hay", "Maga", "Tchatibali", "Vele", "Wina", "Yagoua"],
    "Mayo-Kani": ["Dziguilao", "Guidiguis", "Kaélé", "Mindif", "Moulvoudaye", "Moutourwa", "Touloum"],
    "Mayo-Sava": ["Kolofata", "Mora", "Tokombéré"],
    "Mayo-Tsanaga": ["Bourrha", "Hina", "Koza", "Mogodé", "Mokolo", "Mozogo", "Soulédé-Roua"]
  },
  "Littoral": {
    "Moungo": ["Baré-Bakem", "Dibombari", "Ebone", "Loum", "Manjo", "Mbanga", "Melong", "Mombo", "Njombe-Penja", "Nkongsamba I", "Nkongsamba II", "Nkongsamba III"],
    "Nkam": ["Ndobian", "Nkondjock", "Yabassi", "Yingui"],
    "Sanaga-Maritime": ["Dibamba", "Dizangué", "Édéa I", "Édéa II", "Massock", "Mouanko", "Ndom", "Ngwei", "Pouma"],
    "Wouri": ["Douala I", "Douala II", "Douala III", "Douala IV", "Douala V", "Douala VI"]
  },
  "North (Nord)": {
    "Bénoué": ["Baschéo", "Bibemi", "Dembo", "Demsa", "Garoua I", "Garoua II", "Garoua III", "Lagdo", "Mayo-Hourna", "Pitoa", "Tcheboa", "Touroua"],
    "Faro": ["Beka", "Poli"],
    "Mayo-Louti": ["Figuil", "Guider", "Mayo-Oulo"],
    "Mayo-Rey": ["Madingring", "Rey-Bouba", "Tcholliré", "Touboro"]
  },
  "North-West (Nord-Ouest)": {
    "Boyo": ["Belo", "Bum", "Fundong", "Njinikom"],
    "Bui": ["Elak-Oku", "Jakiri", "Kumbo", "Mbven", "Nkum", "Noni"],
    "Donga-Mantung": ["Ako", "Misaje", "Ndu", "Nkambé", "Nwa"],
    "Menchum": ["Benakuma", "Furu-Awa", "Wum", "Zhoa"],
    "Mezam": ["Bafut", "Bali", "Bamenda I", "Bamenda II", "Bamenda III", "Santa", "Tubah"],
    "Momo": ["Andek", "Batibo", "Mbengwi", "Njikwa", "Widikum"],
    "Ngo-Ketunjia": ["Babessi", "Balikumbat", "Ndop"]
  },
  "South (Sud)": {
    "Dja-et-Lobo": ["Bengbis", "Djoum", "Meyomessala", "Meyomessi", "Mintom", "Oveng", "Sangmélima", "Zoétélé"],
    "Mvila": ["Biwong-Bane", "Biwong-Bulu", "Ebolowa I", "Ebolowa II", "Efoulan", "Mengong", "Mvangan", "Ngoulemakong"],
    "Océan": ["Akom II", "Bipindi", "Campo", "Kribi I", "Kribi II", "Lokoundjé", "Mvengue", "Niete"],
    "Vallée-du-Ntem": ["Ambam", "Kye-Ossi", "Ma'an", "Olamze"]
  },
  "South-West (Sud-Ouest)": {
    "Fako": ["Buea", "Limbe I", "Limbe II", "Limbe III", "Muyuka", "Tiko", "West Coast"],
    "Koupé-Manengouba": ["Bangem", "Nguti", "Tombel"],
    "Lebialem": ["Alou", "Menji", "Wabane"],
    "Manyu": ["Akwaya", "Eyumodjock", "Mamfe", "Upper Bayang"],
    "Meme": ["Konye", "Kumba I", "Kumba II", "Kumba III", "Mbonge"],
    "Ndian": ["Bamusso", "Dikome-Balue", "Ekondo-Titi", "Idabato", "Isanghele", "Kombo-Abedimo", "Kombo-Itindi", "Mundemba", "Toko"]
  },
  "West (Ouest)": {
    "Bamboutos": ["Babadjou", "Batcham", "Galim", "Mbouda"],
    "Haut-Nkam": ["Bafang", "Bakou", "Bana", "Bandja", "Banka", "Banwa", "Kékem"],
    "Hauts-Plateaux": ["Baham", "Bamendjou", "Bangou", "Batié"],
    "Koung-Khi": ["Bandjoun", "Bayangam", "Demding"],
    "Menoua": ["Dschang", "Fokoué", "Fongo-Tongo", "Nkong-Zem", "Penka-Michel", "Santchou"],
    "Mifi": ["Bafoussam I", "Bafoussam II", "Bafoussam III"],
    "Ndé": ["Bangangté", "Bassamba", "Bazou", "Tonga"],
    "Noun": ["Bangourain", "Foumban", "Foumbot", "Kouoptamo", "Koutaba", "Magba", "Malentouen", "Massangam", "Njimom"]
  }
} as const;

