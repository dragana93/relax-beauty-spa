# Postavljanje: GitHub, Supabase, Brevo, Google i Cloudflare

Uputstvo za prvo postavljanje. Svi servisi su besplatni u obimu studija. Redoslijed je bitan:
svaki korak daje vrijednost koja treba u sljedećem.

| Servis | Za šta | Besplatno |
| --- | --- | --- |
| GitHub | kod i automatske provjere (CI) | da |
| Supabase | baza rezervacija (Postgres, EU) | 2 projekta, 500 MB |
| Brevo | potvrde i dnevni spisak na mejl | 300 mejlova dnevno, bez kartice |
| Google Cloud | pristup kalendaru i tabeli | da |
| Cloudflare | sajt, API, automatski deploy | 3.000 build minuta mjesečno |

Tajne vrijednosti (lozinke, ključevi) nikad ne idu u git. Lokalno su u `.dev.vars`, a na
produkciji u Cloudflare postavkama.

---

## 1. GitHub

Repo već postoji, a produkcijska grana je **`main`**. Sve što se pushuje na `main` Cloudflare
automatski objavljuje.

1. Provjeri da je repo **privatni** (Settings → General → Danger Zone → Change visibility).
2. Poslije prvog pusha s fajlom `.github/workflows/ci.yml`: repo → **Actions** pokazuje provjeru
   **CI**, koja mora biti zelena.
3. Preporuka: Settings → Branches → Add rule za `main` → uključi "Require status checks to
   pass" i odaberi **CI / check**. Tada izmjene idu preko pull requesta i u `main` ulazi samo
   kod koji je prošao testove. Ako radiš sama i pushuješ direktno na `main`, ovaj korak možeš
   preskočiti: Cloudflare ionako pokreće testove prije deploya i ne objavljuje ako padnu.

## 2. Supabase (baza)

Treba **jedan** projekt: produkcija. Za rad na računaru `npm start` ima svoju lokalnu bazu.

1. Na supabase.com napravi projekt. Regija treba biti u EU, najbolje **Central EU
   (Frankfurt)**. Regija se ne može promijeniti kasnije; provjera: Project Settings → General.
2. **Connect** (zeleno dugme gore) → kopiraj dva connection stringa i u njih upiši lozinku baze:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL` (za Cloudflare, korak 6)
   - **Session pooler** (port **5432**) → `SUPABASE_DB_URL` (za migracije)
3. Napravi tabele. U terminalu, u folderu projekta:
   ```
   npm run db:push
   ```
   Komanda traži connection string: zalijepi **Session pooler** string (s upisanom lozinkom) i
   pritisni Enter. Ono što zalijepiš se ne prikazuje i nigdje se ne sprema. Na pitanje o
   migraciji odgovori `Y`.
   Produkcijske stringove **ne upisuj u `.dev.vars`**: tada bi probne rezervacije s tvog
   računara išle u pravu bazu. Kasnije migracije radi Cloudflare sam pri svakom deployu.
4. Provjera: Supabase → Table Editor prikazuje `bookings`, `occupied_slots`, `blocks` i
   `daily_digests`.

Ako ti zatreba proba sa pravim Supabaseom, napravi drugi besplatan projekt (staging) i njegov
`DATABASE_URL` upiši u `.dev.vars`.

**Otkazivanje termina:** Table Editor → `bookings` → u redu rezervacije postavi `status` na
`cancelled`. Termin se odmah oslobađa na sajtu, a u roku od 15 minuta nestaje iz kalendara i u
tabeli dobija status "otkazano".

**Napomena:** besplatan projekt se pauzira poslije 7 dana bez aktivnosti. Sajt svakih 15 minuta
čita bazu, pa se to ne bi trebalo desiti dok je sajt objavljen. Besplatni plan nema sigurnosnih
kopija; dnevni spisak na mejl (CSV) i Google tabela čuvaju kopiju svih termina.

## 3. Brevo (mejlovi)

Besplatno 300 mejlova dnevno, bez kreditne kartice. Brevo je francuska firma, podaci su u EU.

1. Na brevo.com napravi besplatan nalog. Na pitanje o websiteu odaberi da ga nemaš; adresa
   sajta se može dodati kasnije.
2. **API ključ:** gore desno meni naloga → **SMTP & API** → **API Keys** → **Generate a new API
   key** → kopiraj ga odmah (prikazuje se samo jednom) → `BREVO_API_KEY`.
3. **Pošiljalac:** meni naloga → **Senders, domains & dedicated IPs** → **Senders** → **Add a
   sender**. Upiši ime ("Relax, Beauty and Spa Studio") i adresu, pa je potvrdi linkom koji
   stigne na tu adresu → `MAIL_FROM="Relax, Beauty and Spa Studio <ta-adresa>"`.
   - Za probu je dovoljna tvoja adresa.
   - Za prave klijente: kad kupiš domenu, u **Domains** dodaj i potvrdi domenu (DNS zapisi koje
     Brevo pokaže) i pošiljaoca na njoj, npr. `rezervacije@tvojadomena.hr`. Bez toga mejlovi s
     Gmail/Hotmail adrese često završe u spamu.
4. U `.dev.vars`: `BREVO_API_KEY`, `MAIL_FROM` i `OWNER_EMAIL` (gdje stiže obavijest o svakoj
   rezervaciji i dnevni spisak). Restartuj `npm start`.
5. Provjera: rezerviši termin na http://localhost:4200 sa svojom adresom. Poslani mejlovi se vide
   u Brevu pod **Transactional → Logs**.

## 4. Google kalendar i Google tabela

### 4.1 Service account (jednom)

1. console.cloud.google.com → napravi projekt, na primjer `relax-spa`.
2. APIs & Services → Library → uključi **Google Calendar API** i **Google Sheets API**.
3. IAM & Admin → Service Accounts → **Create service account** (ime npr. `rezervacije`). Uloge ne
   trebaju.
4. Otvori service account → Keys → Add key → **JSON**. Preuzeti fajl je tajna: ne šalji ga mejlom i
   ne stavljaj ga u git.
5. Zapamti adresu service accounta, na primjer
   `rezervacije@relax-spa.iam.gserviceaccount.com`.

### 4.2 Kalendar (sestra)

1. U Google kalendaru (na računaru): pored svog kalendara → ⋮ → **Settings and sharing**.
2. **Share with specific people** → dodaj adresu service accounta s pravom
   **"Make changes to events"**.
3. Ispod, u "Integrate calendar", kopiraj **Calendar ID** (za glavni kalendar to je njena Gmail
   adresa) → `GOOGLE_CALENDAR_ID`.

Kako radi:
- Svaka rezervacija sa sajta pojavljuje se kao događaj s imenom, telefonom i brojem rezervacije.
- Sve što ona upiše kao **zauzeto** (termin dogovoren telefonom, pauza, odmor) sajt više ne nudi.
- **Pažnja:** događaji "cijeli dan" su u Google kalendaru po defaultu **slobodni**. Za godišnji
  odmor ili slobodan dan u događaju postavi **"Zauzet/Busy"**, inače sajt i dalje nudi termine.
- Brisanje događaja koji je napravio sajt **ne otkazuje** rezervaciju. Otkazuje se u Supabaseu
  (vidi korak 2).

Za probu na računaru koristi poseban, probni kalendar (Create new calendar), a ne pravi.

### 4.3 Tabela (evidencija i promet)

1. Napravi novu Google tabelu, na primjer "Relax Spa – rezervacije".
2. **Share** → dodaj adresu service accounta kao **Editor**.
3. Iz adrese tabele `docs.google.com/spreadsheets/d/`**`ID`**`/edit` kopiraj ID → `GOOGLE_SHEET_ID`.
4. U `.dev.vars` upiši i `GOOGLE_SERVICE_ACCOUNT_KEY` (cijeli JSON u jednom redu, u jednostrukim
   navodnicima) pa pokreni jednom:
   ```
   npm run google:setup
   ```
   Skripta napravi listove **Rezervacije** (zaglavlja, formati, padajući meniji) i **Promet**
   (formule po mjesecu i po tretmanu). Može se pokrenuti ponovo bez gubitka podataka.

List **Rezervacije**:
- Kolone **A–K** popunjava sajt: broj, datum, vrijeme, tretman, klijent, telefon, mejl, cijena,
  status, vrijeme rezervacije.
- Kolone **L–N** popunjava sestra: **Došla** (Da/Ne), **Naplaćeno (€)**, **Način plaćanja**. Sajt
  ih nikad ne mijenja.

List **Promet**: za godinu u ćeliji **I1** (može se promijeniti) prikazuje po mjesecu broj
potvrđenih i otkazanih termina, zakazani promet, stvarno naplaćeno i broj klijenata koji su došli,
te iste brojeve po tretmanu.

## 5. Probni rad na računaru

```
npm start
```

Bez ijednog naloga `npm start` pokreće i **lokalnu bazu**: podaci su u `.wrangler/local-db`, a
`npm run db:reset` je prazni (prvo zaustavi `npm start`). Sajt i rezervacije tada rade odmah.
Mejlovi, kalendar i tabela rade tek kad upišeš njihove postavke u `.dev.vars`. Kad u `.dev.vars`
upišeš `DATABASE_URL`, koristi se staging Supabase umjesto lokalne baze.

S postavljenim nalozima otvori http://localhost:4200, rezerviši termin i provjeri:
- stiže potvrda na mejl (adresa mora biti "authorized recipient" u sandboxu)
- događaj je u probnom kalendaru, a red u tabeli
- događaj koji ručno dodaš u kalendar sakrije te termine na sajtu
- `status = cancelled` u Supabaseu oslobodi termin, a za najviše 15 minuta (cron radi samo kad je
  sajt objavljen; lokalno: `npx wrangler dev --test-scheduled`, pa otvori
  http://localhost:8787/__scheduled) događaj nestane i red dobije "otkazano"

`npm run db:bookings` ispisuje zadnjih 50 rezervacija iz staging baze.

## 6. Cloudflare (sajt i automatski deploy)

1. Na dash.cloudflare.com: **Workers & Pages** → Create → **Import a repository** → poveži GitHub i
   odaberi repo.
2. Postavke builda:
   - Production branch: `main`
   - Build command: `npm ci && npm run ci`
   - Deploy command: `npm run deploy:ci`
   - Builds for non-production branches: **isključeno** (koristile bi produkcijsku bazu)
   - Build variables and secrets: `SUPABASE_DB_URL` = Session pooler string **prod** projekta
     (kao Secret)
3. Worker → Settings → **Variables and Secrets** (runtime):
   - Secrets: `DATABASE_URL` (Transaction pooler, **prod**), `BREVO_API_KEY`,
     `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Variables: `MAIL_FROM`, `OWNER_EMAIL`,
     `GOOGLE_CALENDAR_ID` (pravi kalendar), `GOOGLE_SHEET_ID` (prava tabela)
   - **Nikad** ne postavljaj `EMAIL_PREVIEW` na produkciji.
4. Push na `main` (ili merge pull requesta) → Cloudflare pokrene testove, build, migracije baze i
   deploy. Provjera: `https://<adresa>/api/health` vraća `{"ok":true}`.
5. Kasnije: Worker → Settings → Domains & Routes → dodaj svoju domenu.

## Kako teče izmjena (CI/CD)

```
commit → push na main
   ├─ GitHub Actions: typecheck, testovi, build          (provjera, vidi se u Actions)
   └─ Cloudflare Workers Builds: testovi → build → migracije (Supabase prod) → deploy
                                 (ako testovi padnu, ništa se ne objavljuje)
```

Sigurniji način za veće izmjene: nova grana → push → pull request (GitHub Actions provjeri) →
merge u `main` → Cloudflare objavi.

Nova promjena baze je novi fajl u `supabase/migrations/` (ime počinje datumom i vremenom, npr.
`20261201090000_opis.sql`). Postojeće migracije se nikad ne mijenjaju.
