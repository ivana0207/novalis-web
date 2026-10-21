/*
 * Jedini izvor podataka za kartice, izbornik, kartu, popis lokacija, prilike i stranice poslovnica
 * (dizajn v4 · units-v3.json; tekstovi i fotografije poslovnica prema novalis.hr).
 * Radno vrijeme: indeks 0 = ponedjeljak … 6 = nedjelja; null = zatvoreno.
 * Radna vremena su PLACEHOLDER dok ih Novalis ne potvrdi (Pod Zvon je potvrđen na novalis.hr).
 * hoursConfirmed: true kad su potvrđena - samo potvrđena radna vremena idu tražilicama (schema.org).
 * (Loaded as a script, not fetched, so the site also works when opened straight from disk.)
 */
(function () {
  var wk = function (a, b) { return [a, b]; };
  var week = function (mf, sat, sun) { return [mf, mf, mf, mf, mf, sat, sun]; };
  var daily = function (h) { return week(h, h, h); };
  var allDay = daily(wk('00:00', '24:00'));
  var IMG = 'assets/img/poslovnice/';

  window.NOVALIS_DATA = {
    company: {
      name: 'Novalis d.o.o.',
      address: 'Josipa Kunkere 8, 53291 Novalja', town: 'Novalja', postalCode: '53291',
      phone: '+385 53 662 001',
      tel: '+38553662001',
      email: 'info@novalis.com.hr',
      founded: 1990
    },
    seasons: { summer: { start: '05-15', end: '09-30' } },
    // Croatian public holidays (national only, no local days), on which units with closedOnHolidays are closed all day:
    // fixed 'MM-DD' dates, and days counted from Easter Sunday (0 Uskrs, 1 Uskrsni ponedjeljak, 60 Tijelovo), which
    // js/site.js works out for each year.
    holidays: {
      fixed: ['01-01', '01-06', '05-01', '05-30', '06-22', '08-05', '08-15', '11-01', '11-18', '12-25', '12-26'],
      easter: [0, 1, 60]
    },
    // Order here is the order of filters, menu groups and unit numbering.
    // direct: the header shows the category as a plain link to its only unit's page instead of a menu.
    categories: [
      { id: 'trgovine', label: 'Trgovine', picto: 'cart' },
      { id: 'smjestaj', label: 'Smještaj', picto: 'suitcase' },
      { id: 'gastro', label: 'Gastro', picto: 'cloche' },
      { id: 'veleprodaja', label: 'Veleprodaja', picto: 'boxes', direct: true }
    ],
    /*
     * slug: the store page's folder (/hiper-bau/ → hiper-bau/index.html), same addresses as on novalis.hr.
     * url: only for units with their own website (no store page here).
     * schema: the unit's schema.org business type for search engines (merged into its JSON-LD).
     * geo: [lat, lng] for the maps and the Upute links, from OpenStreetMap (Market Novalis matches novalis.hr's map,
     *   Pod Zvon is its Google Maps listing). Veleprodaja is an estimate until Novalis confirms (no address yet, placed
     *   at Hiper Novalis). Units on the same spot sit side by side on the map.
     * gmaps: the share link of the unit's official Google Business listing (Google Maps > Podijeli). With it, the address,
     *   the store page's map pin and Upute open that listing (the pin still sits on geo); without it, Upute routes to geo.
     * hours: { summer, winter } weekly tables (see the top of this file), seasons from `seasons`. A day's hours come from
     *   the first of these that applies: exceptions > openPeriod > holidays (closedOnHolidays) > that season's weekly table.
     * closedOnHolidays: true = closed all day on the public holidays (`holidays`); without it the unit keeps its hours.
     * openPeriod: { start: 'MM-DD', end: 'MM-DD' } - open only from start to end (both days included), closed all day
     *   the rest of the year.
     * exceptions: { 'YYYY-MM-DD' or 'MM-DD' (every year), two digits each, e.g. '01-06': [open, close], or null = closed
     *   all day } - one day's own hours, e.g. { '12-24': ['07:00', '14:00'], '2026-12-31': null }; a full date wins over
     *   'MM-DD'. An entry written any other way is ignored (the browser console says so). None yet.
     * page: content of the store page (js/poslovnica.js). Every store page has the same sections;
     *   only the hero differs: theme (red · yellow · white · slate · violet · earth) and mark
     *   (logo file · lockup [light word, bold word] · word · image with a script greeting).
     *   Logo and image marks give their drawn size in px (w, h) so the page doesn't shift while they load.
     *   offer items are 'text' or ['text', 'where'] · gallery items are [photo, alt]; no photo = placeholder slot.
     *   layout: 'v2' opts the unit into the reworked store page (WEB-9; Market Novalis so far, the others opt in in their
     *   own tickets): hero, Radno vrijeme i lokacija, Ponuda, Galerija, Povezane poslovnice, no Ključne brojke (facts),
     *   the street address and icon-only call / e-mail buttons in the hero, nothing under the map. With it:
     *     label is the category only (the street shows under the status) · mark.badge ('red' | 'yellow', as in the
     *     header) puts the cart badge beside a stacked logo file · floors: [{ name, sign, tone (warm · slate), brand,
     *     note }], top floor first (brand: a store name, kept out of translation; note: a short line under the floor's
     *     name); when every offer item is ['text', floor name] Ponuda draws the floors with one legend each.
     */
    units: [
      {
        id: 'hiper-novalis', slug: 'hiper-novalis', category: 'trgovine', name: 'Hiper Novalis',
        desc: 'Veliki hipermarket s bogatim izborom proizvoda.',
        address: 'Čiponjac III/2, Novalja', phone: '053 663 300', tel: '+38553663300',
        promo: false, geo: [44.54728, 14.89527], gmaps: 'https://maps.app.goo.gl/kH4aykgjnz1Zgtrm6', schema: { '@type': 'Store' },
        closedOnHolidays: true,
        hours: {
          summer: daily(wk('07:00', '22:00')),
          winter: week(wk('07:00', '19:00'), wk('07:00', '19:00'), null)
        },
        photo: 'assets/img/hiper-novalis-storefront.jpg', photoHint: 'Foto: Hiper Novalis, ulaz i parking',
        page: {
          theme: 'red', pattern: 'mosaic',
          mark: { logo: 'assets/brand/hiper-novalis-stacked-yellow.svg', w: 224, h: 88 },
          label: 'Shopping centar · Čiponjac, Novalja',
          title: 'Dobio ime po svojoj veličini i ponudi.',
          lead: 'Na 14.000 m² nalaze se supermarket, veleprodaja pića i salon keramike. U zatvorenom prostoru od 7.000 m², na dvije etaže, uživajte u kupovini.',
          photo: IMG + 'hiper-novalis.jpg', photoAlt: 'Hiper Novalis: totem s piktogramima odjela i ulaz u centar', photoPos: '0% 50%',
          facts: [['14.000 m²', 'ukupna površina'], ['7.000 m²', 'zatvorenog prostora'], ['2', 'etaže za kupovinu'], ['2.000+ m²', 'namještaja i uređenja doma']],
          offerLead: 'Proizvodi koje rijetko gdje drugdje u Hrvatskoj možete pronaći, na jednom mjestu - od namirnica do nautike.',
          offer: [
            'Samoposlužni restoran i caffe bar', 'Prehrana i proizvodi za domaćinstvo', 'HoReCa program i veleprodaja pića',
            'Vrtni namještaj', 'Ljetni asortiman', 'Namještaj i izrada po mjeri', 'Tekstil, zavjese i karniše',
            'Rasvjeta i elektrooprema', 'Nautika, auto program, bicikli', 'Grijanje i hlađenje', 'Kupaonica i sanitarije',
            'Kućanski uređaji', 'Informatička oprema', 'Uredski materijal', 'Kampiranje i ribolov'
          ],
          gallery: [
            [IMG + 'hiper-novalis-pica.jpg', 'Odjel vina i pića'],
            [IMG + 'hiper-novalis-restoran.jpg', 'Terasa samoposlužnog restorana'],
            [IMG + 'hiper-novalis-peciva.jpg', 'Svježa peciva'],
            [null, 'Foto: unutrašnjost centra, dvije etaže']
          ],
          related: ['hiper-bau', 'veleprodaja', 'market-novalis']
        }
      },
      {
        id: 'market-novalis', slug: 'market-novalis', category: 'trgovine', name: 'Market Novalis',
        desc: 'Trgovina prehrambenih proizvoda i robe svakodnevne potrošnje.',
        address: 'Josipa Kunkere 8, Novalja', phone: '098 441 149', tel: '+38598441149', email: 'robnakucanovalis@gmail.com',
        promo: false, geo: [44.55675, 14.88293], gmaps: 'https://maps.app.goo.gl/PTz44JiJdKmXjiLt6', schema: { '@type': 'GroceryStore' },
        closedOnHolidays: true,
        hours: {
          summer: week(wk('06:30', '23:00'), wk('06:30', '23:00'), wk('07:00', '22:00')),
          winter: week(wk('07:00', '20:00'), wk('07:00', '20:00'), null)
        },
        photo: IMG + 'market-novalis-ulaz.jpg', photoHint: 'Foto: Market u centru, izlog i police',
        page: {
          theme: 'yellow', layout: 'v2',
          mark: { logo: 'assets/brand/market-novalis-stacked-red.svg', w: 203, h: 80, badge: 'red' },
          label: 'Trgovine',
          title: 'U samom centru Novalje.',
          lead: 'Trgovina prehrambenih proizvoda i robe svakodnevne potrošnje na 600 m², u zgradi robne kuće Novalis.',
          photo: IMG + 'market-novalis.jpg', photoAlt: 'Zgrada robne kuće Novalis s lučnim prozorima u centru Novalje', photoPos: '50% 35%',
          offerLead: 'Dvije razine: Market Novalis s namirnicama i proizvodima za domaćinstvo, a razinu niže drogerija za ljepotu, njegu i zdravlje.',
          floors: [
            { name: 'Market Novalis', sign: '0', tone: 'warm', brand: true },
            { name: 'Drogerija', sign: '-1', tone: 'slate', note: 'Poznata imena renomiranih proizvođača' }
          ],
          offer: [
            ['Prehrana', 'Market Novalis'], ['Proizvodi za domaćinstvo', 'Market Novalis'], ['Za kuhinju', 'Market Novalis'],
            ['Slatkiši i grickalice', 'Market Novalis'], ['Smrznuti proizvodi', 'Market Novalis'],
            ['Parfemi', 'Drogerija'], ['Kozmetika', 'Drogerija'], ['Proizvodi za osobnu higijenu', 'Drogerija'],
            ['Njega', 'Drogerija'], ['Zdravlje', 'Drogerija']
          ],
          gallery: [
            [IMG + 'market-novalis-ulaz.jpg', 'Ulaz u Market i Drogeriju Novalis'],
            [IMG + 'market-novalis-police.jpg', 'Prolaz između polica s grickalicama i slatkišima'],
            [IMG + 'market-novalis-sokovi.jpg', 'Police sa sokovima i napicima'],
            [IMG + 'market-novalis-zitarice.jpg', 'Police sa žitaricama i keksima za doručak'],
            [IMG + 'market-novalis-akcija.jpg', 'Akcijska ponuda na polici'],
            [IMG + 'market-novalis-smrznuto.jpg', 'Smrznuti proizvodi i sladoled u zamrzivaču'],
            [null, 'Foto: Market Novalis, pogled na cijelu razinu od ulaza'],
            [null, 'Foto: Drogerija, pogled na cijelu razinu'],
            [null, 'Foto: kozmetika, njega i zdravlje na policama u Drogeriji'],
            [null, 'Foto: osoblje Marketa na poslu uz police ili blagajnu']
          ],
          related: ['hotel-novalis', 'valis', 'hiper-novalis']
        }
      },
      {
        id: 'hiper-bau', slug: 'hiper-bau', category: 'trgovine', name: 'Hiper Bau',
        desc: 'Trgovina građevinskim materijalom i opremom za dom.',
        address: 'Čiponjac III/3, Novalja', phone: '099 5476 792', tel: '+385995476792',
        promo: false, geo: [44.54726, 14.89652], gmaps: 'https://maps.app.goo.gl/oXePTfeMhh4MnKbX8', schema: { '@type': 'HomeAndConstructionBusiness' },
        closedOnHolidays: true,
        hours: {
          summer: week(wk('07:00', '20:00'), wk('07:00', '14:00'), null),
          winter: week(wk('07:00', '17:00'), wk('07:00', '13:00'), null)
        },
        photo: IMG + 'hiper-bau.jpg', photoHint: 'Foto: skladište pločica i materijala',
        page: {
          theme: 'white', endorse: true,
          mark: { lockup: ['HIPER', 'BAU'] },
          label: 'Trgovine · Čiponjac III/3',
          title: 'Ime sigurno opravdava svojom veličinom.',
          lead: 'Novi objekt u gospodarskoj zoni na 15.000 m², s natkrivenim parkingom: građevinski materijal, krovni sustavi, suha gradnja, salon keramike i alati.',
          photo: IMG + 'hiper-bau.jpg', photoAlt: 'Kampanja Hiper Bau: obitelj boji zid', photoPos: '0% 50%',
          facts: [['15.000 m²', 'površina objekta'], ['8.000 m²', 'zatvorenog prostora'], ['Parking', 'natkriveni, za kupce'], ['Dostava', 'na području Paga']],
          offerLead: 'Sve za gradnju te uređenje doma i vrta, na jednom mjestu.',
          offer: [
            'Pločice, zidne obloge i pribor za postavljanje', 'Podne obloge: laminat, vinil, tapisoni', 'Boje i lakovi',
            'Građevinski materijal i željezarija', 'Krovni sustavi i suha gradnja', 'Alati i strojevi',
            'Stolarija i građevinska oprema', 'Vrtlarstvo i maslinarstvo', 'Roštilji i pribor za roštilj',
            'Ogrjev: drva i peleti', 'Oprema za bazene', 'Nautika'
          ],
          offerNote: 'Brendovi u ponudi: 3M, Atlas Concorde, Baumit, Bosch, Ceresit, Chromos, Geberit, Henkel, Jub, Kärcher, Knauf, Makita, Semmelrock, Weber, Ytong i drugi.',
          gallery: [
            [null, 'Foto: salon keramike'], [null, 'Foto: građevinski materijal'],
            [null, 'Foto: alati i strojevi'], [null, 'Foto: natkriveni parking']
          ],
          related: ['hiper-novalis', 'veleprodaja', 'market-novalis']
        }
      },
      {
        id: 'veleprodaja', slug: 'veleprodaja', category: 'veleprodaja', name: 'Veleprodaja',
        desc: 'Tvrtka Novalis nudi veleprodaju široke palete proizvoda uz uslugu dostave.',
        address: 'Novalja', phone: '053 663 300', tel: '+38553663300', email: 'veleprodaja@novalis.com.hr',
        promo: false, geo: [44.54728, 14.89527], gmaps: 'https://maps.app.goo.gl/kH4aykgjnz1Zgtrm6', schema: { '@type': 'WholesaleStore' },
        closedOnHolidays: true,
        hours: {
          summer: week(wk('06:00', '14:00'), wk('06:00', '12:00'), null),
          winter: week(wk('07:00', '15:00'), null, null)
        },
        photo: IMG + 'veleprodaja-pice.jpg', photoHint: 'Foto: kamion za dostavu, palete pića',
        page: {
          theme: 'slate',
          mark: { word: 'VELEPRODAJA' },
          label: 'Novalis d.o.o. · Novalja',
          title: 'Široka paleta proizvoda, uz besplatnu dostavu.',
          lead: 'Za ugostitelje i iznajmljivače: voće i povrće, namirnice za ugostiteljstvo, galanterija te velik izbor pića i kave.',
          photo: IMG + 'hiper-novalis-pica.jpg', photoAlt: 'Police s vinima i pićem',
          cta: { label: 'Zatražite ponudu', href: 'mailto:veleprodaja@novalis.com.hr', icon: 'mail' },
          facts: [['Besplatna', 'dostava za sve kupljene artikle'], ['Brza', 'isporuka'], ['Uvijek', 'dostupni, uz individualni pristup']],
          offerLead: 'Uz brzu, kvalitetnu, pouzdanu i besplatnu dostavu.',
          offer: [
            'Voće i povrće', 'Namirnice za ugostiteljstvo', 'Papirnata i plastična galanterija',
            'Oprema za ugostiteljstvo: čaše, stolnjaci, pribor za jelo, stolovi i stolice, hladnjaci, klima uređaji, suncobrani',
            'Alkoholna i bezalkoholna pića', 'Kava i drugi napici'
          ],
          gallery: [
            [IMG + 'veleprodaja-pice.jpg', 'Hladnjak s pivom'], [null, 'Foto: dostavno vozilo Novalis'],
            [null, 'Foto: voće i povrće'], [null, 'Foto: skladište veleprodaje']
          ],
          related: ['hiper-novalis', 'hiper-bau', 'market-novalis']
        }
      },
      {
        id: 'valis', slug: 'valis', category: 'gastro', name: 'Bistro i slastičarna Valis',
        desc: 'Usluge bistroa i slastičarne.',
        address: 'Trg Bazilike 3, Novalja', phone: '099 258 6317', tel: '+385992586317',
        promo: false, geo: [44.55643, 14.88334], gmaps: 'https://maps.app.goo.gl/7rZgAQVpfzeDLfWm8', schema: { '@type': ['Bakery', 'CafeOrCoffeeShop'] },
        hours: {
          summer: daily(wk('08:00', '24:00')),
          winter: [wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '22:00'), wk('08:00', '22:00'), wk('09:00', '21:00')]
        },
        photo: IMG + 'valis.jpg', photoHint: 'Foto: torte i kolači u vitrini',
        page: {
          theme: 'violet',
          mark: { image: 'assets/brand/valis-novalja-violet.png', w: 160, h: 120, script: 'Dobro došli' },
          label: 'Gastro · Trg Bazilike 3, Novalja',
          title: 'Bistro, slastičarna i kavana na Trgu Bazilike.',
          lead: 'Naš sladoled iz vlastite proizvodnje je nadaleko poznat. Uz to: caffe s velikom terasom, kavana na prvom katu i beauty centar na drugom.',
          photo: IMG + 'valis.jpg', photoAlt: 'Interijer bistroa Valis sa stolicama boje lavande',
          facts: [['2011.', 'otvoren u centru Novalje'], ['3', 'kata na jednoj adresi'], ['Sladoled', 'iz vlastite proizvodnje'], ['Terasa', 'velika, u prizemlju']],
          offerLead: 'Tri kata, tri priče - od sladoleda na terasi do kave i vina na prvom katu.',
          offer: [
            ['Bistro', 'Prizemlje'], ['Slastičarna i sladoled iz vlastite proizvodnje', 'Prizemlje'], 'Proizvodnja i prodaja kolača',
            ['Caffe s velikom terasom', 'Prizemlje'], ['Kavana: vrhunska kava i vina', '1. kat'], ['Beauty centar', '2. kat']
          ],
          gallery: [
            [IMG + 'valis-voce.jpg', 'Šumsko voće za slastice'], [IMG + 'valis-tijesto.jpg', 'Tijesto iz vlastite proizvodnje'],
            [IMG + 'valis-caffe.jpg', 'Bistro i caffe u prizemlju'], [IMG + 'valis-kavana.jpg', 'Detalj interijera kavane']
          ],
          related: ['pod-zvon', 'market-novalis', 'hotel-novalis']
        }
      },
      {
        id: 'pod-zvon', slug: 'pod-zvon', category: 'gastro', name: 'Bistro Pod Zvon',
        desc: 'Nalazi se tik pod zvonom župne crkve, u centru grada.',
        address: 'Ulica kralja Zvonimira 1a, Novalja', phone: '053 679 555', tel: '+38553679555', email: 'zvon@novalis.com.hr',
        promo: false, geo: [44.55646, 14.88455], gmaps: 'https://maps.app.goo.gl/2HvTUTQV7ncNfJYK8', schema: { '@type': 'Restaurant', servesCuisine: ['Mediterranean', 'Pizza'] },
        hoursConfirmed: true,
        hours: {
          summer: daily(wk('16:00', '24:00')),
          winter: daily(wk('16:00', '24:00'))
        },
        photo: IMG + 'pod-zvon-interijer.jpg', photoHint: 'Foto: terasa bistroa uz zvonik',
        page: {
          theme: 'earth',
          mark: { lockup: ['BISTRO', 'POD ZVON'] },
          label: 'Gastro · Ulica kralja Zvonimira 1a, Novalja',
          title: 'Tik pod zvonom župne crkve.',
          lead: 'Novouređeni objekt za najizbirljivije, na četiri razine, u centru grada.',
          photo: IMG + 'pod-zvon.jpg', photoAlt: 'Kameni reljef zvona s natpisom Pod Zvon',
          facts: [['4', 'razine u jednom objektu'], ['2019.', 'otvoren u centru grada'], ['od 16 h', 'otvoreno svaki dan'], ['Krušna peć', 'i kaminsko ložište']],
          offerLead: 'Konoba, vinski podrum, pizzerija i mirni kat - na četiri razine u centru Novalje.',
          offer: [
            'Konoba: jela s kaminskog ložišta, pripremljena na tradicionalan dalmatinski način', 'Vinski podrum i degustacije vina',
            'Pizzerija s krušnom peći', ['Mirni prostor za poslovne sastanke i rad na odmoru', 'Kat']
          ],
          gallery: [
            [IMG + 'pod-zvon-interijer.jpg', 'Interijer: drvene grede, terakota i bijele stolice'],
            [IMG + 'pod-zvon-blagovaonica.jpg', 'Blagovaonica s drvenim stropom'],
            [IMG + 'pod-zvon-stolovi.jpg', 'Stolovi postavljeni za večeru'],
            [IMG + 'pod-zvon-blagajna.jpg', 'Stara blagajna kao detalj interijera']
          ],
          related: ['valis', 'market-novalis', 'hotel-novalis']
        }
      },
      {
        id: 'hotel-novalis', category: 'smjestaj', name: 'B&B Novalis',
        desc: 'Smještaj s doručkom u centru Novalje - sobe za obitelj, prijatelje i poslovne goste.',
        address: 'Josipa Kunkere 8, Novalja', phone: '053 662 222', tel: '+38553662222',
        promo: false, url: 'https://hotelnovalis.hr', external: true, geo: [44.55675, 14.88293], gmaps: 'https://maps.app.goo.gl/Xn3Hd2v3PpPCoA7d6', schema: { '@type': 'BedAndBreakfast' },
        hours: { summer: allDay, winter: allDay }, openPeriod: { start: '04-01', end: '11-01' },
        photo: IMG + 'bb-novalis.jpg', photoHint: 'Foto: soba s pogledom, B&B Novalis'
      }
    ],
    // "Novalis za svaku priliku" (landing and O nama pages, #prilike): one card per need, with the units that cover it in order.
    // id is the card's anchor (/#gradnja) · icon: an outline icon in js/occasions.js · photo: the card's picture (null = a
    // placeholder showing photoHint until the real photo exists) · a step names a unit by id and links to its store page
    // (or website); label shortens the unit name where the copy does.
    occasions: [
      {
        id: 'gradnja', icon: 'gradnja', title: 'Gradnja i uređenje',
        photo: null, photoHint: 'Foto: uređenje doma - pločice, alati, svjetlo kroz prozor',
        desc: 'Od građevinskog materijala do namještaja po mjeri - cijeli projekt u Novalji, bez odlaska na kopno.',
        steps: [
          { unit: 'hiper-bau', text: 'Građevinski materijal, suha gradnja, podne obloge, boje, stolarija i alati' },
          { unit: 'hiper-novalis', text: 'Keramika, uvoz iz Italije prema narudžbi' },
          { unit: 'hiper-novalis', text: 'Namještaj po mjeri s montažom' },
          { unit: 'hiper-novalis', text: 'Sanitarije i bijela tehnika' },
          { unit: 'hiper-novalis', text: 'Tekstil i opremanje' }
        ]
      },
      {
        id: 'proslave', icon: 'proslave', title: 'Proslave i događanja',
        photo: null, photoHint: 'Foto: obiteljsko slavlje, stol s tortom u Pod Zvonu',
        desc: 'Pričesti, krizme, krštenja i obiteljska slavlja u Novalji - prostor za proslave, torta, smještaj za goste i nabava na jednom mjestu.',
        steps: [
          { unit: 'pod-zvon', label: 'Pod Zvon', text: 'Prostor za privatna događanja i proslave uz župnu crkvu, mediteranska i dalmatinska kuhinja' },
          { unit: 'valis', label: 'Valis', text: 'Torte po narudžbi i kolači iz vlastite proizvodnje' },
          { unit: 'hotel-novalis', text: 'Smještaj za goste u samom centru Novalje' },
          { unit: 'hiper-novalis', text: 'Supermarket s namirnicama i pićem za proslavu kod kuće, uz veliko parkiralište' },
          { unit: 'market-novalis', text: 'Sve što zatreba u zadnji čas, u centru grada' }
        ]
      },
      {
        id: 'boravak', icon: 'boravak', title: 'Boravak u Novalji',
        photo: null, photoHint: 'Foto: jutarnja kava na terasi, pogled na Novalju',
        desc: 'Smještaj, nabava, kava i večera - sve što vam treba za opušten boravak, na dohvat ruke.',
        steps: [
          { unit: 'hotel-novalis', text: 'Sobe u centru Novalje s hidromasažnim kadama na terasama' },
          { unit: 'hiper-novalis', text: 'Velika nabava uz veliko parkiralište, izvan gužve u centru' },
          { unit: 'market-novalis', text: 'Namirnice i drogerija u centru' },
          { unit: 'valis', label: 'Valis', text: 'Kava, domaći sladoled, bistro i kavana s izborom vina' },
          { unit: 'pod-zvon', label: 'Pod Zvon', text: 'Napolitanska pizza i mediteranska kuhinja uz crkvu' }
        ]
      }
    ]
  };
})();
