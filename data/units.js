/*
 * Jedini izvor podataka za kartice, izbornik, kartu, popis lokacija, priče i stranice poslovnica
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
    // Order here is the order of filters, menu groups and unit numbering.
    categories: [
      { id: 'trgovine', label: 'Trgovine', picto: 'cart' },
      { id: 'smjestaj', label: 'Smještaj', picto: 'suitcase' },
      { id: 'gastro', label: 'Gastro', picto: 'cloche' },
      { id: 'veleprodaja', label: 'Veleprodaja', picto: 'boxes' }
    ],
    /*
     * slug: the store page's folder (/hiper-bau/ → hiper-bau/index.html), same addresses as on novalis.hr.
     * url: only for units with their own website (no store page here).
     * schema: the unit's schema.org business type for search engines (merged into its JSON-LD).
     * page: content of the store page (js/poslovnica.js). Every store page has the same sections;
     *   only the hero differs: theme (red · yellow · white · slate · violet · earth) and mark
     *   (logo file · lockup [light word, bold word] · word · image with a script greeting).
     *   Logo and image marks give their drawn size in px (w, h) so the page doesn't shift while they load.
     *   offer items are 'text' or ['text', 'where'] · gallery items are [photo, alt]; no photo = placeholder slot.
     */
    units: [
      {
        id: 'hiper-novalis', slug: 'hiper-novalis', category: 'trgovine', name: 'Hiper Novalis',
        desc: 'Veliki hipermarket s bogatim izborom proizvoda.',
        address: 'Čiponjac III/2, Novalja', phone: '053 663 300', tel: '+38553663300',
        promo: false, pin: { x: 62, y: 30 }, schema: { '@type': 'ShoppingCenter' },
        hours: {
          summer: daily(wk('07:00', '22:00')),
          winter: week(wk('07:00', '19:00'), wk('07:00', '19:00'), wk('07:00', '12:30'))
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
        promo: false, pin: { x: 44, y: 56 }, schema: { '@type': 'GroceryStore' },
        hours: {
          summer: week(wk('06:30', '23:00'), wk('06:30', '23:00'), wk('07:00', '22:00')),
          winter: week(wk('07:00', '20:00'), wk('07:00', '20:00'), wk('07:00', '13:00'))
        },
        photo: IMG + 'market-novalis-ulaz.jpg', photoHint: 'Foto: Market u centru, izlog i police',
        page: {
          theme: 'yellow',
          mark: { logo: 'assets/brand/market-novalis-stacked-red.svg', w: 203, h: 80 },
          label: 'Trgovine · Josipa Kunkere 8, Novalja',
          title: 'U strogom centru Novalje.',
          lead: 'Trgovina prehrambenih proizvoda i robe svakodnevne potrošnje na 600 m², u zgradi robne kuće Novalis.',
          photo: IMG + 'market-novalis.jpg', photoAlt: 'Zgrada robne kuće Novalis s lučnim prozorima u centru Novalje', photoPos: '50% 35%',
          facts: [['600 m²', 'prodajnog prostora'], ['2', 'razine: prizemlje i suteren'], ['Kunkere 8', 'adresa u centru grada']],
          offerLead: 'Namirnice i proizvodi za domaćinstvo u prizemlju, drogerija u suterenu.',
          offer: [
            ['Prehrana', 'Prizemlje'], ['Proizvodi za domaćinstvo', 'Prizemlje'], ['Kozmetika', 'Suteren · drogerija'],
            ['Parfemi', 'Suteren · drogerija'], ['Proizvodi za osobnu higijenu', 'Suteren · drogerija']
          ],
          gallery: [
            [IMG + 'market-novalis-ulaz.jpg', 'Ulaz u Market i Drogeriju Novalis'],
            [IMG + 'market-novalis-police.jpg', 'Police s namirnicama u prizemlju'],
            [IMG + 'market-novalis-akcija.jpg', 'Akcijska ponuda na polici'],
            [IMG + 'market-novalis-sladoled.jpg', 'Sladoled u zamrzivaču']
          ],
          related: ['hotel-novalis', 'valis', 'hiper-novalis']
        }
      },
      {
        id: 'hiper-bau', slug: 'hiper-bau', category: 'trgovine', name: 'Hiper Bau',
        desc: 'Trgovina građevinskim materijalom i opremom za dom.',
        address: 'Čiponjac III/3, Novalja', phone: '099 5476 792', tel: '+385995476792',
        promo: false, pin: { x: 72, y: 20 }, schema: { '@type': 'HardwareStore' },
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
        promo: false, pin: { x: 80, y: 38 }, schema: { '@type': 'WholesaleStore' },
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
        promo: false, pin: { x: 38, y: 62 }, schema: { '@type': ['CafeOrCoffeeShop', 'IceCreamShop'] },
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
        promo: false, pin: { x: 33, y: 52 }, schema: { '@type': 'Restaurant', servesCuisine: ['Pizza', 'Dalmatinska kuhinja'] },
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
        promo: false, url: 'https://hotelnovalis.hr', external: true, pin: { x: 52, y: 72 }, schema: { '@type': 'BedAndBreakfast' },
        hours: { summer: allDay, winter: allDay },
        photo: IMG + 'bb-novalis.jpg', photoHint: 'Foto: soba s pogledom, B&B Novalis'
      }
    ],
    // "Novalis u stvarnom životu" (o-nama/). A step links to its unit's store page, or to `href` on the landing page.
    stories: [
      {
        id: 'gradnja', tab: 'Gradite ili uređujete dom?', title: 'Gradite ili uređujete dom?',
        desc: 'Od građevinskog materijala i keramike do sanitarija, namještaja i kućanskih uređaja - sve potrebno za gradnju i uređenje možete riješiti kroz Novalis, uz dostavu na području Paga.',
        photo: 'Foto: obitelj u kući koja se uređuje - keramika, alati, svjetlo kroz prozor',
        steps: [
          { text: 'Građevinski materijal i keramika', unit: 'hiper-bau' },
          { text: 'Sanitarije i oprema za dom', unit: 'hiper-novalis' },
          { text: 'Namještaj i kućanski uređaji', unit: 'hiper-novalis' },
          { text: 'Dostava na adresu', unit: null, label: 'Novalis dostava', href: '#upit' }
        ]
      },
      {
        id: 'apartman', tab: 'Pripremate apartman za sezonu?', title: 'Pripremate apartman za sezonu?',
        desc: 'Opremite apartman, nabavite uređaje i tekstil, pripremite osnovne potrepštine za goste i riješite veću opskrbu - bez potrebe za odlaskom s otoka.',
        photo: 'Foto: domaćin priprema apartman - namješta posteljinu, sunce kroz prozor',
        steps: [
          { text: 'Namještaj, posteljina i uređaji', unit: 'hiper-novalis' },
          { text: 'Potrepštine za goste', unit: 'market-novalis' },
          { text: 'Piće i veće količine', unit: 'veleprodaja' },
          { text: 'Dostava do objekta', unit: null, label: 'Novalis dostava', href: '#upit' }
        ]
      },
      {
        id: 'slavlje', tab: 'Organizirate slavlje?', title: 'Organizirate slavlje?',
        desc: 'Od torte i večere do pića i smještaja za goste - više potreba za jedno slavlje možete riješiti unutar Novalisa.',
        photo: 'Foto: obiteljsko slavlje na terasi u večernjem svjetlu',
        steps: [
          { text: 'Torta i slastice', unit: 'valis', label: 'Slastičarna Valis' },
          { text: 'Večera', unit: 'pod-zvon' },
          { text: 'Piće za veće društvo', unit: 'veleprodaja' },
          { text: 'Smještaj za goste', unit: 'hotel-novalis' }
        ]
      }
    ]
  };
})();
