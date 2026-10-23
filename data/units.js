/*
 * Jedini izvor podataka za kartice, izbornik, kartu, popis lokacija, prilike i stranice poslovnica
 * (dizajn v4 · units-v3.json; tekstovi i fotografije poslovnica prema novalis.hr).
 * Radno vrijeme: indeks 0 = ponedjeljak … 6 = nedjelja; null = zatvoreno.
 * Radna vremena su PLACEHOLDER dok ih Novalis ne potvrdi (Pod Zvon je potvrđen na novalis.hr).
 * hoursConfirmed: true kad su potvrđena - samo potvrđena radna vremena idu tražilicama (schema.org).
 * English (WEB-21, /en/): an item's en: { field: 'English text' } beside its Croatian fields is what an English page
 * shows instead (NV.tx in js/site.js); a field it leaves out shows as in Croatian (names, addresses). Texts the code
 * matches rather than shows (an offer line's floor) keep pointing at the Croatian field. Draft, from the WEB-21 copy deck;
 * the store pages' English (page.en, the floors' en, 2026-10-23) translates their Croatian copy, the B&B's reuses
 * hotelnovalis.hr/en/ where it has the same text. A unit's en.slug is its English page's folder (en/<slug>/) when it
 * differs from slug.
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
      { id: 'trgovine', label: 'Trgovine', picto: 'cart', en: { label: 'Shops' } },
      { id: 'smjestaj', label: 'Smještaj', picto: 'suitcase', en: { label: 'Accommodation' } },
      { id: 'gastro', label: 'Gastro', picto: 'cloche', en: { label: 'Food & drink' } },
      { id: 'veleprodaja', label: 'Veleprodaja', picto: 'boxes', direct: true, en: { label: 'Wholesale' } }
    ],
    /*
     * slug: the store page's folder (/hiper-bau/ → hiper-bau/index.html), same addresses as on novalis.hr.
     * url: only for a unit with its own website and no store page here (none at the moment; links then open it in a
     *   new tab with external: true).
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
     *   only the hero differs: theme (red · yellow · white · slate · violet · earth · ink) and mark
     *   (logo file · lockup [light word, bold word] · word · image, optionally with a script greeting).
     *   Logo and image marks give their drawn size in px (w, h) so the page doesn't shift while they load.
     *   offer items are 'text' or ['text', 'where'] · gallery items are [photo, alt]; no photo = placeholder slot.
     *   layout: 'v2' opts the unit into the reworked store page (WEB-9; Market Novalis, Hiper Novalis (WEB-8), Hiper Bau
     *   (WEB-11), Valis (WEB-12), Pod Zvon (WEB-10) and Veleprodaja (WEB-13)): hero, Radno vrijeme i lokacija, Ponuda,
     *   Galerija, Povezane poslovnice, no Ključne brojke (facts), the street address and icon-only call / e-mail buttons
     *   in the hero, nothing under the map. With it:
     *     label is the category only (the street shows under the status) · mark.badge ('red' | 'yellow', as in the
     *     header) puts the cart badge beside a stacked logo file · floors: [{ name, sign, tone (warm · slate · violet for Valis · earth for Pod Zvon), brand,
     *     note }], top floor first (brand: a store name, kept out of translation; note: a short line under the floor's
     *     name); when every offer item is ['text', floor name] Ponuda draws the floors with one legend each. An item
     *     ['text', floor name, 'details'] is a department that opens (+) to show what it sells (Hiper Novalis, WEB-8).
     *     A single floor (Hiper Bau, Veleprodaja) draws one plate with its legend beside it · brands: [[name, logo, site or null]]
     *     adds Brendovi after Ponuda, with brandsLead under its heading (Hiper Bau, WEB-11).
     *     B&B Novalis (2026-10-21): pattern 'lace' lays its lace rosette into the hero · stay: [[label, value]] adds Boravak beside the hours ·
     *     rooms: [[name, size, guests, photo, page]] adds Sobe after Ponuda (roomsLead under its heading, roomsAll: a
     *     last tile to the full list); the pages are on the unit's website, so each tile opens there in a new tab.
     */
    units: [
      {
        id: 'hiper-novalis', slug: 'hiper-novalis', category: 'trgovine', name: 'Hiper Novalis',
        desc: 'Veliki hipermarket s bogatim izborom proizvoda.',
        address: 'Čiponjac III/2, Novalja', phone: '053 663 300', tel: '+38553663300', email: 'hiper.novalis@novalis.com.hr',
        promo: false, geo: [44.54728, 14.89527], gmaps: 'https://maps.app.goo.gl/kH4aykgjnz1Zgtrm6', schema: { '@type': 'Store' },
        closedOnHolidays: true,
        hours: {
          summer: daily(wk('07:00', '22:00')),
          winter: week(wk('07:00', '19:00'), wk('07:00', '19:00'), null)
        },
        photo: 'assets/img/hiper-novalis-storefront.jpg', photoHint: 'Foto: Hiper Novalis, ulaz i parking',
        en: { photoHint: 'Photo: Hiper Novalis, entrance and car park' },
        page: {
          theme: 'red', layout: 'v2',
          mark: { logo: 'assets/brand/hiper-novalis-stacked-yellow.svg', w: 224, h: 88, badge: 'yellow' },
          label: 'Trgovine',
          title: 'Od namirnica do nautike.',
          lead: 'Na 14.000 m² nalaze se supermarket, veleprodaja pića, salon namještaja, odjel tehnike i još mnogo toga. Kupujte u 7.000 m² zatvorenog prostora na dvije etaže, uz veliko natkriveno parkiralište.',
          photo: IMG + 'hiper-novalis.jpg', photoAlt: 'Hiper Novalis: totem s piktogramima odjela i ulaz u centar', photoPos: '0% 50%',
          // WEB-8 (design approved 2026-10-21): departments from novalis.hr (Hiper Novalis, Kontakt), floors from Novalis.
          // Drafts for Novalis to confirm: the Delikatese line, the 1. kat examples, the "svježe" claim (the import
          // sentence in offerLead is novalis.hr's own).
          offerLead: 'Dvije etaže i deset odjela: u prizemlju namirnice, delikatese, restoran, pića i sve za plažu i vrt, a na katu namještaj, tehnika, informatika, školski pribor i sve ostalo za dom. Dio artikala u našoj ponudi je jedinstven u Hrvatskoj, jer mi sami vršimo nabavu i uvoz svih onih artikala koji se pokažu traženima, a nije ih moguće nabaviti na ovim prostorima.',
          floors: [
            { name: '1. kat', sign: '1', tone: 'slate', en: { name: 'First floor' } },
            { name: 'Prizemlje', sign: '0', tone: 'warm', en: { name: 'Ground floor' } }
          ],
          offer: [
            ['Namještaj i dom', '1. kat', 'Više od 2.000 m² namještaja i svega za uređenje doma, od dnevnog boravka i spavaće sobe do kuhinje i blagovaonice. Namještaj po mjeri dizajniramo, izrađujemo i sklapamo. Kućni tekstil i posteljina, zavjese i karniše, kupaonski namještaj i sanitarije.'],
            ['Tehnika', '1. kat', 'Bijela tehnika: hladnjaci, zamrzivači, perilice rublja i posuđa, štednjaci. Mali kućanski aparati, televizori i audio oprema. Klima uređaji, ventilatori, peći i grijalice. Unutarnja i vanjska rasvjeta i elektrooprema.'],
            ['Informatika i školski pribor', '1. kat', 'Računala, laptopi, monitori i printeri. Mobilni i fiksni telefoni te oprema za mobitele: maske, punjači i slušalice. Uredski i školski pribor: bilježnice, pisaći pribor i školske torbe.'],
            ['Nautika i vozila', '1. kat', 'Nautička oprema za brod i more. Auto program: oprema i sredstva za njegu automobila. Bicikli, električni bicikli i druga električna vozila.'],
            ['Odjeća, alati i igračke', '1. kat', 'Odjeća, ručni i električni alati, igračke i suveniri. Za svakoga po nešto.'],
            ['Supermarket', 'Prizemlje', 'Prehrana i proizvodi za domaćinstvo, domaćih i stranih proizvođača.'],
            ['Delikatese', 'Prizemlje', 'Suhomesnati proizvodi, sirevi i druge delikatese za vaš stol.'],
            ['Restoran i caffe bar', 'Prizemlje', 'Samoposlužni restoran s uvijek svježe pripremljenim jelima i caffe bar.'],
            ['Veleprodaja pića', 'Prizemlje', 'HoReCa program za ugostitelje: konkurentne cijene, brza dostava i stručno osoblje.'],
            ['Sve za plažu, vrt i kuću', 'Prizemlje', 'Ljetni asortiman za plažu i plivanje na 100 m². Vrtni namještaj: garniture, stolovi, stolice, ležaljke, ljuljačke, klupe, suncobrani i tende. Kampiranje i ribolov.']
          ],
          gallery: [
            [IMG + 'hiper-novalis-pica.jpg', 'Odjel vina i pića'],
            [IMG + 'hiper-novalis-restoran.jpg', 'Terasa samoposlužnog restorana'],
            [IMG + 'hiper-novalis-peciva.jpg', 'Svježa peciva'],
            [null, 'Foto: ulaz i natkriveno parkiralište'],
            [null, 'Foto: supermarket u prizemlju, pogled na cijelu razinu'],
            [null, 'Foto: salon namještaja na katu'],
            [null, 'Foto: bijela tehnika i kućanski aparati'],
            [null, 'Foto: informatika i uredski pribor'],
            [null, 'Foto: ljetni asortiman za plažu i vrt'],
            [null, 'Foto: caffe bar']
          ],
          related: ['hiper-bau', 'veleprodaja', 'market-novalis'],
          // English page (en/hiper-novalis/): offer lines keep their Croatian floor (matched with floors), captions follow
          // the gallery's order
          en: {
            label: 'Shops',
            title: 'From groceries to boating gear.',
            lead: 'Across 14,000 m² you will find a supermarket, drinks wholesale, a furniture showroom, an appliances department and much more. Shop in 7,000 m² of indoor space on two floors, with a large covered car park.',
            photoAlt: 'Hiper Novalis: a sign with department pictograms and the entrance to the centre',
            offerLead: 'Two floors and ten departments: groceries, delicatessen, a restaurant, drinks and everything for the beach and garden on the ground floor, and furniture, appliances, computers, school supplies and everything else for the home upstairs. Some of the products we offer are unique in Croatia, because we source and import ourselves everything that is in demand but cannot be found in this region.',
            offer: [
              ['Furniture and home', '1. kat', 'More than 2,000 m² of furniture and everything for furnishing your home, from the living room and bedroom to the kitchen and dining room. We design, make and assemble made-to-measure furniture. Home textiles and bedding, curtains and curtain rails, bathroom furniture and sanitaryware.'],
              ['Appliances', '1. kat', 'White goods: fridges, freezers, washing machines, dishwashers and cookers. Small household appliances, televisions and audio equipment. Air conditioners, fans, stoves and heaters. Indoor and outdoor lighting and electrical equipment.'],
              ['Computers and school supplies', '1. kat', 'Computers, laptops, monitors and printers. Mobile and landline phones and phone accessories: cases, chargers and headphones. Office and school supplies: notebooks, pens and pencils, and school bags.'],
              ['Boating and vehicles', '1. kat', 'Marine equipment for the boat and the sea. Car range: car accessories and car care products. Bicycles, e-bikes and other electric vehicles.'],
              ['Clothing, tools and toys', '1. kat', 'Clothing, hand and power tools, toys and souvenirs. Something for everyone.'],
              ['Supermarket', 'Prizemlje', 'Food and household products from Croatian and foreign producers.'],
              ['Delicatessen', 'Prizemlje', 'Cured meats, cheeses and other delicacies for your table.'],
              ['Restaurant and café bar', 'Prizemlje', 'A self-service restaurant with dishes that are always freshly prepared, and a café bar.'],
              ['Drinks wholesale', 'Prizemlje', 'HoReCa range for the hospitality trade: competitive prices, fast delivery and expert staff.'],
              ['Everything for the beach, garden and home', 'Prizemlje', 'A 100 m² summer range for the beach and swimming. Garden furniture: sets, tables, chairs, sun loungers, swings, benches, parasols and awnings. Camping and fishing.']
            ],
            captions: [
              'Wine and drinks department', 'The self-service restaurant terrace', 'Fresh bread rolls',
              'Photo: entrance and covered car park', 'Photo: the ground-floor supermarket, a view of the whole floor',
              'Photo: the furniture showroom upstairs', 'Photo: white goods and household appliances',
              'Photo: computers and office supplies', 'Photo: the summer range for the beach and garden', 'Photo: the café bar'
            ]
          }
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
        en: { photoHint: 'Photo: the Market in the town centre, shop window and shelves' },
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
            { name: 'Drogerija', sign: '-1', tone: 'slate', note: 'Poznata imena renomiranih proizvođača',
              en: { name: 'Drugstore', note: 'Well-known names from renowned manufacturers' } }
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
          related: ['hotel-novalis', 'valis', 'hiper-novalis'],
          en: {
            label: 'Shops',
            title: 'In the very centre of Novalja.',
            lead: 'A 600 m² shop for food and everyday goods, in the Novalis department store building.',
            photoAlt: 'The Novalis department store building with arched windows in the centre of Novalja',
            offerLead: 'Two levels: Market Novalis with groceries and household products, and one level down a drugstore for beauty, personal care and health.',
            offer: [
              ['Food', 'Market Novalis'], ['Household products', 'Market Novalis'], ['For the kitchen', 'Market Novalis'],
              ['Sweets and snacks', 'Market Novalis'], ['Frozen food', 'Market Novalis'],
              ['Perfumes', 'Drogerija'], ['Cosmetics', 'Drogerija'], ['Personal hygiene', 'Drogerija'],
              ['Personal care', 'Drogerija'], ['Health', 'Drogerija']
            ],
            captions: [
              'Entrance to Market Novalis and the drugstore', 'An aisle between shelves of snacks and sweets',
              'Shelves of juices and soft drinks', 'Shelves of breakfast cereals and biscuits', 'A special offer on the shelf',
              'Frozen food and ice cream in the freezer', 'Photo: Market Novalis, a view of the whole floor from the entrance',
              'Photo: the drugstore, a view of the whole floor', 'Photo: cosmetics, personal care and health products on the drugstore shelves',
              'Photo: Market staff at work by the shelves or the till'
            ]
          }
        }
      },
      {
        id: 'hiper-bau', slug: 'hiper-bau', category: 'trgovine', name: 'Hiper Bau',
        desc: 'Trgovina građevinskim materijalom i opremom za dom.',
        address: 'Čiponjac III/3, Novalja', phone: '099 5476 792', tel: '+385995476792', email: 'hiperbau@novalis.hr',
        promo: false, geo: [44.54726, 14.89652], gmaps: 'https://maps.app.goo.gl/oXePTfeMhh4MnKbX8', schema: { '@type': 'HomeAndConstructionBusiness' },
        closedOnHolidays: true,
        hours: {
          summer: week(wk('07:00', '20:00'), wk('07:00', '14:00'), null),
          winter: week(wk('07:00', '17:00'), wk('07:00', '13:00'), null)
        },
        photo: IMG + 'hiper-bau.jpg', photoHint: 'Foto: skladište pločica i materijala',
        en: { photoHint: 'Photo: tile and materials warehouse' },
        page: {
          theme: 'slate', layout: 'v2', // slate hero: user's choice for WEB-11 (2026-10-21), was white
          mark: { lockup: ['HIPER', 'BAU'] },
          label: 'Trgovine',
          title: 'Od temelja do krova.',
          // novalis.hr Hiper Bau + O nama ("2019. godine otvaramo Hiper Bau na prostoru 15.000 m2, te 8.000 m2 zatvorenog prostora")
          lead: 'Otvoren 2019. u gospodarskoj zoni: 15.000 m², s 8.000 m² zatvorenog prostora i natkrivenim parkingom. Građevinski materijal, krovni sustavi, suha gradnja, salon keramike, alati i nautika.',
          photo: IMG + 'hiper-bau.jpg', photoAlt: 'Kampanja Hiper Bau: obitelj boji zid', photoPos: '0% 50%',
          // WEB-11: one floor (user's choice, 2026-10-21); the six departments hold every line of novalis.hr's Hiper Bau
          // Asortiman. Drafts for Novalis to confirm: the grouping, "izolacija" (Plastform, Draco), the paints' "zidove i
          // fasade, drvo i metal" and the tools' "ručni i električni" (from the brands in stock).
          offerLead: 'Sve za gradnju te uređenje doma i vrta, na jednom mjestu: od salona keramike i građevinskog materijala do alata, roštilja i opreme za bazene.',
          floors: [
            { name: 'Hiper Bau', sign: '0', tone: 'warm', brand: true }
          ],
          offer: [
            ['Keramika i podne obloge', 'Hiper Bau', 'Salon keramike: pločice i zidne obloge, uz alat i materijal za postavljanje pločica. Podne obloge: laminat, vinil, tapisoni i otirači, uz pribor za oblaganje.'],
            ['Građevinski materijal', 'Hiper Bau', 'Materijal za gradnju i izolaciju, krovni sustavi i suha gradnja. Stolarija i građevinska oprema.'],
            ['Boje i lakovi', 'Hiper Bau', 'Boje i lakovi za zidove i fasade, drvo i metal.'],
            ['Alati i željezarija', 'Hiper Bau', 'Ručni i električni alati i strojevi. Željezarija.'],
            ['Vrt i roštilj', 'Hiper Bau', 'Vrtlarstvo i maslinarstvo. Sve vrste roštilja i pribor za roštilj.'],
            ['Bazeni, ogrjev i nautika', 'Hiper Bau', 'Oprema za bazene. Ogrjev: drva i peleti. Nautička oprema.']
          ],
          // Brendovi (WEB-11): the 35 brands on novalis.hr's Hiper Bau page, alphabetical. [name, logo file in
          // assets/img/brendovi/ (.webp), official site]: the brand's site for Croatia, else its European or international one
          // (checked 2026-10-21). null = no confirmed site yet (Draco: no website found; Mariner: logo doesn't match
          // mariner.it), shown without a link until Novalis confirms.
          brandsLead: 'U ponudi su proizvodi više od 30 proizvođača, od građevinskog materijala i keramike do alata i vrtnog programa.',
          brands: [
            ['3M', '3m', 'https://www.3m.com.hr/3M/hr_HR/company-hr/'],
            ['Atlas Concorde', 'atlas-concorde', 'https://www.atlasconcorde.com/en'],
            ['Baumit', 'baumit', 'https://baumit.hr/'],
            ['Bekament', 'bekament', 'https://bekament.hr/'],
            ['Belinka', 'belinka', 'https://www.belinka.com/hr/'],
            ['Bison', 'bison', 'https://www.bison.net/hr-hr'],
            ['Bosch', 'bosch', 'https://www.bosch.hr/'],
            ['Cemix', 'cemix', 'https://www.cemix.hr/hr'],
            ['Ceresit', 'ceresit', 'https://www.ceresit.hr/'],
            ['Chromos', 'chromos', 'https://chromos.hr/'],
            ['Claber', 'claber', 'https://www.claber.com/hr/'],
            ['Del Conca', 'del-conca', 'https://www.delconca.com/en/'],
            ['Draco', 'draco', null],
            ['Ecoceramic', 'ecoceramic', 'https://www.ecoceramic.es/en/'],
            ['Einhell', 'einhell', 'https://www.einhell.hr/'],
            ['Felco', 'felco', 'https://www.felco.com/'],
            ['Fischer', 'fischer', 'https://www.fischer.hr/hr-hr'],
            ['Geberit', 'geberit', 'https://www.geberit.hr/naslovnica/'],
            ['Gimi', 'gimi', 'https://www.gimi.eu/'],
            ['Henkel', 'henkel', 'https://www.henkel.hr/'],
            ['JUB', 'jub', 'https://www.jub.hr/'],
            ['Kärcher', 'karcher', 'https://www.karcher.com/hr/'],
            ['Knauf', 'knauf', 'https://knauf.com/hr-HR/knauf-hrvatska'],
            ['Makita', 'makita', 'https://www.makita.hr/'],
            ['Mariner', 'mariner', null],
            ['Maurer', 'maurer', 'https://www.maurer.ferritalia.it/'],
            ['Onduline', 'onduline', 'https://www.onduline.hr/'],
            ['Papillon', 'papillon', 'https://www.papillon.ferritalia.it/'],
            ['Plantella', 'plantella', 'https://plantella.hr/'],
            ['Plastform', 'plast-form', 'https://www.plastform.hr/'],
            ['Semmelrock', 'semmelrock', 'https://www.wienerberger.hr/semmelrock.html'],
            ['TKK', 'tkk', 'https://tkk-group.com/hr'],
            ['Vargon', 'vargon', 'https://www.wienerberger.hr/proizvodi/vargon.html'],
            ['Weber', 'weber', 'https://www.saint-gobain.hr/weber'],
            ['Ytong', 'ytong', 'https://www.xella.hr/hr_HR/']
          ],
          gallery: [
            [null, 'Foto: ulaz u Hiper Bau i natkriveni parking'],
            [null, 'Foto: salon keramike, pločice na izložbenim panelima'],
            [null, 'Foto: podne obloge, laminat i vinil'],
            [null, 'Foto: građevinski materijal na paletama'],
            [null, 'Foto: boje i lakovi na policama'],
            [null, 'Foto: alati i strojevi'],
            [null, 'Foto: vrtni program i oprema za maslinarstvo'],
            [null, 'Foto: roštilji i pribor za roštilj'],
            [null, 'Foto: oprema za bazene'],
            [null, 'Foto: osoblje Hiper Baua s kupcem']
          ],
          related: ['hiper-novalis', 'veleprodaja', 'market-novalis'],
          en: {
            label: 'Shops',
            title: 'From the foundations to the roof.',
            lead: 'Opened in 2019 in the business zone: 15,000 m², with 8,000 m² of indoor space and a covered car park. Building materials, roofing systems, drywall, a ceramics showroom, tools and boating gear.',
            photoAlt: 'Hiper Bau campaign: a family painting a wall',
            offerLead: 'Everything for building and for doing up your home and garden, in one place: from the ceramics showroom and building materials to tools, barbecues and pool equipment.',
            offer: [
              ['Ceramics and floor coverings', 'Hiper Bau', 'Ceramics showroom: tiles and wall coverings, with tools and materials for laying tiles. Floor coverings: laminate, vinyl, carpets and doormats, with fitting accessories.'],
              ['Building materials', 'Hiper Bau', 'Materials for building and insulation, roofing systems and drywall. Joinery and building equipment.'],
              ['Paints and varnishes', 'Hiper Bau', 'Paints and varnishes for walls and facades, wood and metal.'],
              ['Tools and hardware', 'Hiper Bau', 'Hand and power tools and machines. Hardware.'],
              ['Garden and barbecue', 'Hiper Bau', 'Gardening and olive growing. Barbecues of every kind and barbecue accessories.'],
              ['Pools, firewood and boating', 'Hiper Bau', 'Pool equipment. Firewood: logs and pellets. Marine equipment.']
            ],
            brandsLead: 'We stock products from more than 30 manufacturers, from building materials and ceramics to tools and garden products.',
            captions: [
              'Photo: Hiper Bau entrance and covered car park', 'Photo: ceramics showroom, tiles on display panels',
              'Photo: floor coverings, laminate and vinyl', 'Photo: building materials on pallets', 'Photo: paints and varnishes on the shelves',
              'Photo: tools and machines', 'Photo: garden range and olive-growing equipment', 'Photo: barbecues and barbecue accessories',
              'Photo: pool equipment', 'Photo: Hiper Bau staff with a customer'
            ]
          }
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
        en: { name: 'Wholesale', slug: 'wholesale', photoHint: 'Photo: delivery lorry, pallets of drinks' },
        page: {
          theme: 'white', layout: 'v2', // white hero, as Hiper Bau's was (user, 2026-10-21)
          mark: { word: 'VELEPRODAJA' },
          // the company, not the category: the mark already says Veleprodaja; the town shows under the status
          label: 'Novalis d.o.o.',
          title: 'Široka paleta proizvoda, uz besplatnu dostavu.',
          // novalis.hr Veleprodaja ("Na jednom mjestu možete nabaviti sve što Vam je potrebno za poslovanje: od voća i povrća ...")
          lead: 'Na jednom mjestu nabavite sve što vam je potrebno za poslovanje, od voća, povrća i namirnica za ugostiteljstvo do opreme, pića i kave.',
          photo: IMG + 'hiper-novalis-pica.jpg', photoAlt: 'Police s vinima i pićem',
          cta: { label: 'Zatražite ponudu', href: 'mailto:veleprodaja@novalis.com.hr', icon: 'mail' },
          // WEB-13: one floor like Hiper Bau (user's choice, 2026-10-21); its zones are abstract (novalis.hr names no
          // premises, the address is still open). The lines are novalis.hr's; the equipment list opens from its line, the
          // drinks line from novalis.hr's Veleprodaja ("Bavimo se i distribucijom i prodajom ...") and Hiper Novalis pages
          // ("HoReCa program i veleprodaja pića"; "Konkurentne cijene, brzina dostave i stručnost osoblja").
          // The former facts (besplatna dostava, brza isporuka, uvijek dostupni, individualni pristup) are in Ponuda's lead,
          // in novalis.hr's words, with the home page's "Veleprodaja: dodatne pogodnosti za partnere".
          offerLead: 'Za sve kupljene artikle dostupna vam je brza, kvalitetna, pouzdana i besplatna dostava. Uvijek smo dostupni, uz individualni pristup i dodatne pogodnosti za partnere.',
          floors: [
            { name: 'Veleprodaja', sign: '0', tone: 'warm', brand: true, en: { name: 'Wholesale' } }
          ],
          offer: [
            ['Voće i povrće', 'Veleprodaja'], ['Namirnice za ugostiteljstvo', 'Veleprodaja'],
            ['Papirnata i plastična galanterija', 'Veleprodaja'],
            ['Oprema za ugostiteljstvo', 'Veleprodaja', 'Čaše, stolnjaci, pribor za jelo, stolovi i stolice, hladnjaci, klima uređaji i suncobrani.'],
            ['Alkoholna i bezalkoholna pića', 'Veleprodaja', 'Distribucija i prodaja velikog izbora alkoholnih i bezalkoholnih pića. HoReCa program za ugostitelje, uz konkurentne cijene, brzu dostavu i stručno osoblje.'],
            ['Kava i drugi napici', 'Veleprodaja']
          ],
          gallery: [
            [IMG + 'veleprodaja-pice.jpg', 'Hladnjak s pivom'],
            [null, 'Foto: dostavno vozilo Novalis'],
            [null, 'Foto: skladište veleprodaje'],
            [null, 'Foto: voće i povrće'],
            [null, 'Foto: namirnice za ugostiteljstvo'],
            [null, 'Foto: papirnata i plastična galanterija'],
            [null, 'Foto: čaše, stolnjaci i pribor za jelo'],
            [null, 'Foto: stolovi, stolice i suncobrani za terase'],
            [null, 'Foto: kava i drugi napici'],
            [null, 'Foto: osoblje veleprodaje pri utovaru robe']
          ],
          related: ['hiper-novalis', 'hiper-bau', 'market-novalis'],
          // English page (en/wholesale/): the word mark in English too (WEB-21 Q-6: Veleprodaja = Wholesale everywhere)
          en: {
            mark: { word: 'WHOLESALE' },
            title: 'A wide range of products, with free delivery.',
            lead: 'Get everything your business needs in one place, from fruit, vegetables and food for the hospitality trade to equipment, drinks and coffee.',
            photoAlt: 'Shelves of wine and drinks',
            cta: { label: 'Request a quote', href: 'mailto:veleprodaja@novalis.com.hr', icon: 'mail' },
            offerLead: 'Fast, reliable, high-quality and free delivery is available for everything you buy. We are always available, with a personal approach and extra benefits for partners.',
            offer: [
              ['Fruit and vegetables', 'Veleprodaja'], ['Food for the hospitality trade', 'Veleprodaja'],
              ['Paper and plastic disposables', 'Veleprodaja'],
              ['Hospitality equipment', 'Veleprodaja', 'Glasses, tablecloths, cutlery, tables and chairs, fridges, air conditioners and parasols.'],
              ['Alcoholic and soft drinks', 'Veleprodaja', 'Distribution and sale of a wide choice of alcoholic and soft drinks. HoReCa range for the hospitality trade, with competitive prices, fast delivery and expert staff.'],
              ['Coffee and other beverages', 'Veleprodaja']
            ],
            captions: [
              'A fridge of beer', 'Photo: Novalis delivery vehicle', 'Photo: the wholesale warehouse', 'Photo: fruit and vegetables',
              'Photo: food for the hospitality trade', 'Photo: paper and plastic disposables', 'Photo: glasses, tablecloths and cutlery',
              'Photo: tables, chairs and parasols for terraces', 'Photo: coffee and other beverages', 'Photo: wholesale staff loading goods'
            ]
          }
        }
      },
      {
        id: 'valis', slug: 'valis', category: 'gastro', name: 'Bistro i slastičarna Valis',
        desc: 'Usluge bistroa i slastičarne.',
        // phone and e-mail from novalis.hr Kontakt ("Tel. Bistro / proizvodnja kolača"); the 099 258 6317 from the design
        // appears nowhere on novalis.hr
        address: 'Trg Bazilike 3, Novalja', phone: '053 663 546', tel: '+38553663546', email: 'valis@novalis.hr',
        promo: false, geo: [44.55643, 14.88334], gmaps: 'https://maps.app.goo.gl/7rZgAQVpfzeDLfWm8', schema: { '@type': ['Bakery', 'CafeOrCoffeeShop'] },
        hours: {
          summer: daily(wk('08:00', '24:00')),
          winter: [wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '22:00'), wk('08:00', '22:00'), wk('09:00', '21:00')]
        },
        photo: IMG + 'valis.jpg', photoHint: 'Foto: torte i kolači u vitrini',
        en: { name: 'Valis Bistro & Pastry Shop', photoHint: 'Photo: cakes and pastries in the display case' },
        page: {
          theme: 'violet', layout: 'v2',
          mark: { image: 'assets/brand/valis-novalja-violet.png', w: 160, h: 120 }, // no "Dobro došli" script (user, 2026-10-21)
          label: 'Gastro',
          title: 'Bistro, slastičarna i kavana na Trgu Bazilike.',
          lead: 'Naš sladoled iz vlastite proizvodnje nadaleko je poznat. Uživajte u njemu na velikoj terasi caffea, a za vrhunsku kavu i vino svratite u kavanu na prvom katu.',
          photo: IMG + 'valis.jpg', photoAlt: 'Interijer bistroa Valis sa stolicama boje lavande',
          // WEB-12: the floors as novalis.hr lists them (prizemlje bistro, slastičarna and caffe; 1. kat kavana); the
          // 2. kat beauty centar is left out of Ponuda (user, 2026-10-21). The 1. kat note is novalis.hr's words.
          // "Proizvodnja i prodaja kolača" joined the slastičarna line (novalis.hr doesn't say where the cakes are made;
          // Kontakt: "Bistro / proizvodnja kolača"). The year and "kutak" in offerLead: novalis.hr O nama ("2011. godine, u
          // samome centru Novalje otvoren je Valis ... tako da i najzahtjevniji gost nađe neki kutak za sebe"); the kavana's
          // delicije: its Valis page ("uživajte u najboljim delicijama iz naše ponude").
          offerLead: 'Otvoren 2011. u samom centru Novalje, s kutkom za svakog gosta, od sladoleda na terasi do kave i vina na prvom katu.',
          floors: [
            { name: '1. kat', sign: '1', tone: 'slate', note: 'Idilično uređen interijer', en: { name: 'First floor', note: 'An idyllic interior' } },
            { name: 'Prizemlje', sign: '0', tone: 'violet', en: { name: 'Ground floor' } } // Valis's violet, not the Novalis red and yellow (user, 2026-10-21)
          ],
          offer: [
            ['Kavana: vrhunska kava, vina i delicije', '1. kat'],
            ['Bistro', 'Prizemlje'], ['Slastičarna: kolači i sladoled iz vlastite proizvodnje', 'Prizemlje'], ['Caffe s velikom terasom', 'Prizemlje']
          ],
          gallery: [
            [IMG + 'valis-voce.jpg', 'Šumsko voće za slastice'], [IMG + 'valis-tijesto.jpg', 'Tijesto iz vlastite proizvodnje'],
            [IMG + 'valis-caffe.jpg', 'Bistro i caffe u prizemlju'], [IMG + 'valis-kavana.jpg', 'Detalj interijera kavane'],
            [null, 'Foto: terasa caffea na Trgu Bazilike'],
            [null, 'Foto: vitrina sa sladoledom iz vlastite proizvodnje'],
            [null, 'Foto: torte i kolači u vitrini slastičarne'],
            [null, 'Foto: kavana na prvom katu, pogled na cijeli prostor'],
            [null, 'Foto: kava i kolač na stolu u kavani'],
            [null, 'Foto: osoblje slastičarne za šankom ili uz vitrinu']
          ],
          related: ['pod-zvon', 'market-novalis', 'hotel-novalis'],
          // English: caffe = café (ground floor, terrace), kavana = coffee house (first floor)
          en: {
            label: 'Food & drink',
            title: 'Bistro, pastry shop and coffee house on Trg Bazilike.',
            lead: 'Our home-made ice cream is known far and wide. Enjoy it on the café\'s large terrace, and for excellent coffee and wine, drop in to the coffee house on the first floor.',
            photoAlt: 'The Valis bistro interior with lavender chairs',
            offerLead: 'Opened in 2011 in the very centre of Novalja, with a corner for every guest, from ice cream on the terrace to coffee and wine on the first floor.',
            offer: [
              ['Coffee house: excellent coffee, wines and delicacies', '1. kat'],
              ['Bistro', 'Prizemlje'], ['Pastry shop: home-made cakes and ice cream', 'Prizemlje'], ['Café with a large terrace', 'Prizemlje']
            ],
            captions: [
              'Forest fruits for desserts', 'Home-made pastry dough', 'The ground-floor bistro and café', 'A detail of the coffee house interior',
              'Photo: the café terrace on Trg Bazilike', 'Photo: the display case with home-made ice cream',
              'Photo: cakes and pastries in the pastry shop display case', 'Photo: the first-floor coffee house, a view of the whole room',
              'Photo: coffee and cake on a table in the coffee house', 'Photo: pastry shop staff at the counter or by the display case'
            ]
          }
        }
      },
      {
        id: 'pod-zvon', slug: 'pod-zvon', category: 'gastro', name: 'Bistro Pod Zvon',
        desc: 'Nalazi se tik pod zvonikom župne crkve, u centru grada.',
        address: 'Ulica kralja Zvonimira 1a, Novalja', phone: '053 679 555', tel: '+38553679555', email: 'zvon@novalis.com.hr',
        promo: false, geo: [44.55646, 14.88455], gmaps: 'https://maps.app.goo.gl/2HvTUTQV7ncNfJYK8', schema: { '@type': 'Restaurant', servesCuisine: ['Mediterranean', 'Pizza'] },
        hoursConfirmed: true,
        hours: {
          summer: daily(wk('16:00', '24:00')),
          winter: daily(wk('16:00', '24:00'))
        },
        photo: IMG + 'pod-zvon-interijer.jpg', photoHint: 'Foto: terasa bistroa uz zvonik',
        en: { photoHint: 'Photo: bistro terrace by the bell tower' },
        page: {
          theme: 'earth', layout: 'v2',
          mark: { lockup: ['BISTRO', 'POD ZVON'] },
          label: 'Gastro',
          title: 'Tik pod zvonikom župne crkve.',
          // novalis.hr's konoba, krušna peć and "za najizbirljivije"; no levels (novalis.hr says 4, Ponuda draws 3; user,
          // 2026-10-21) and no "novouređeni" (open since 2019)
          lead: 'Konoba i pizzerija u samom centru Novalje, za najizbirljivije goste. Svratite na dalmatinska jela s kaminskog ložišta, pizzu iz krušne peći ili čašu vina.',
          photo: IMG + 'pod-zvon.jpg', photoAlt: 'Kameni reljef zvona s natpisom Pod Zvon',
          // WEB-10: three floors as the user placed them (2026-10-21): konoba and the quiet space upstairs, the pizzerija
          // on the ground floor, the wine cellar below. Lines in novalis.hr's words; the konoba's "pripremljena na
          // tradicionalan dalmatinski način" moved to the lead so its legend line stays short.
          offerLead: 'Od degustacije vina u podrumu do jela s kaminskog ložišta, pripremljenih na tradicionalan dalmatinski način.',
          floors: [
            { name: '1. kat', sign: '1', tone: 'slate', en: { name: 'First floor' } },
            { name: 'Prizemlje', sign: '0', tone: 'earth', en: { name: 'Ground floor' } }, // Pod Zvon's own sand and brown, as Valis has its violet
            { name: 'Podrum', sign: '-1', tone: 'slate', en: { name: 'Basement' } }
          ],
          offer: [
            ['Konoba s kaminskim ložištem', '1. kat'], ['Mirni prostor za poslovne sastanke i rad na odmoru', '1. kat'],
            ['Pizzerija s krušnom peći', 'Prizemlje'],
            ['Vinski podrum i degustacije vina', 'Podrum']
          ],
          gallery: [
            [IMG + 'pod-zvon-interijer.jpg', 'Interijer: drvene grede, terakota i bijele stolice'],
            [IMG + 'pod-zvon-blagovaonica.jpg', 'Blagovaonica s drvenim stropom'],
            [IMG + 'pod-zvon-stolovi.jpg', 'Stolovi postavljeni za večeru'],
            [IMG + 'pod-zvon-blagajna.jpg', 'Stara blagajna kao detalj interijera'],
            [null, 'Foto: ulaz u Bistro Pod Zvon ispod zvonika župne crkve'],
            [null, 'Foto: kaminsko ložište u konobi'],
            [null, 'Foto: vinski podrum'],
            [null, 'Foto: pizzerija s krušnom peći'],
            [null, 'Foto: mirni prostor na katu'],
            [null, 'Foto: osoblje bistroa uz stol s gostima']
          ],
          related: ['valis', 'market-novalis', 'hotel-novalis'],
          // English: konoba stays (the Dalmatian tavern), kaminsko ložište = open hearth, krušna peć = bread oven
          en: {
            label: 'Food & drink',
            title: 'Right below the parish church bell tower.',
            lead: 'A konoba and pizzeria in the very centre of Novalja, for the most discerning guests. Drop in for Dalmatian dishes from the open hearth, pizza from the bread oven or a glass of wine.',
            photoAlt: 'A stone relief of a bell with the name Pod Zvon',
            offerLead: 'From wine tasting in the cellar to dishes from the open hearth, prepared the traditional Dalmatian way.',
            offer: [
              ['Konoba with an open hearth', '1. kat'], ['A quiet space for business meetings and working on holiday', '1. kat'],
              ['Pizzeria with a bread oven', 'Prizemlje'],
              ['Wine cellar and wine tastings', 'Podrum']
            ],
            captions: [
              'Interior: wooden beams, terracotta and white chairs', 'The dining room with its wooden ceiling', 'Tables set for dinner',
              'An old cash register as an interior detail', 'Photo: the entrance to Bistro Pod Zvon below the parish church bell tower',
              'Photo: the open hearth in the konoba', 'Photo: the wine cellar', 'Photo: the pizzeria with its bread oven',
              'Photo: the quiet space upstairs', 'Photo: bistro staff at a table with guests'
            ]
          }
        }
      },
      {
        id: 'hotel-novalis', slug: 'hotel-novalis', category: 'smjestaj', name: 'B&B Novalis',
        desc: 'Smještaj s doručkom u centru Novalje - sobe za obitelj, prijatelje i poslovne goste.',
        address: 'Josipa Kunkere 8, Novalja', phone: '053 662 222', tel: '+38553662222', email: 'hotel@novalis.hr',
        promo: false, geo: [44.55675, 14.88293], gmaps: 'https://maps.app.goo.gl/Xn3Hd2v3PpPCoA7d6',
        // its own website for search engines (sameAs); arrival, departure and the 23 units as hotelnovalis.hr gives them
        schema: { '@type': 'BedAndBreakfast', sameAs: 'https://hotelnovalis.hr/', checkinTime: '15:00', checkoutTime: '12:00', numberOfRooms: 23 },
        hours: { summer: allDay, winter: allDay }, openPeriod: { start: '04-01', end: '11-01' },
        photo: IMG + 'bb-novalis.jpg', photoHint: 'Foto: soba s pogledom, B&B Novalis',
        en: { photoHint: 'Photo: room with a view, B&B Novalis' },
        page: {
          // The hotel's own look on the v2 store page (user, 2026-10-21): its logo and lace rosette (assets/brand/bb-novalis-*,
          // from hotelnovalis.hr), dark ground with sand like its site, its website (hotelnovalis.hr) as the primary button (user, 2026-10-21). Copy, rooms and photos from hotelnovalis.hr (Novalis's own site) and novalis.hr.
          theme: 'ink', layout: 'v2', pattern: 'lace',
          mark: { logo: 'assets/brand/bb-novalis-white.svg', w: 300, h: 60 },
          label: 'Smještaj',
          title: 'Vaša oaza u centru grada.',
          lead: 'Uređen pomno i s ljubavlju, u samom centru Novalje. Odmorite se u udobnim sobama s king size krevetima ili u hidromasažnoj kadi na krovnoj terasi, uz pogled na more ili novaljske krovove i zvonike.',
          photo: IMG + 'hotel-novalis.jpg', photoAlt: 'Krovna terasa s hidromasažnom kadom i pogledom na more u sumrak', photoPos: '25% 50%',
          cta: { label: 'Rezervirajte', href: 'https://hotelnovalis.hr/' },
          // Boravak, beside the reception hours (hotelnovalis.hr, "dodatne informacije")
          stay: [['Dolazak', 'nakon 15:00'], ['Odlazak', 'do 12:00']],
          // Ponuda as the building (user, 2026-10-21): two levels named by what is on them, no floor numbers (the hotel's
          // floors aren't known; a floor without a sign shows none). Every line from hotelnovalis.hr (Rooftop, the rooms'
          // equipment; breakfast is on the first terrace).
          offerLead: 'Na krovu su dvije terase s hidromasažnim kadama, buffet doručkom i barom, a ispod njih sobe za odmor u samom centru grada. Gostima nudimo i besplatni parking te preporuke za izlete po otoku, do mjesta dobro znanih i još neotkrivenih.',
          floors: [
            { name: 'Krovne terase', tone: 'earth', note: 'Isključivo za goste', en: { name: 'Roof terraces', note: 'For guests only' } },
            { name: 'Sobe', tone: 'slate', note: 'Udobne, svijetle i prostrane', en: { name: 'Rooms', note: 'Comfortable, bright and spacious' } }
          ],
          offer: [
            ['Terasa s pogledom na more', 'Krovne terase'], ['Terasa s pogledom na Velebit', 'Krovne terase'],
            ['Hidromasažne kade i sunčališta', 'Krovne terase'], ['Buffet doručak', 'Krovne terase'], ['Bar s bogatim izborom pića', 'Krovne terase'],
            ['Klima i brzi Wi-Fi', 'Sobe'], ['LCD TV, mini bar i sef', 'Sobe'], ['Kupaonica s walk-in tušem', 'Sobe'],
            ['Mini kuhinja u dijelu soba', 'Sobe'], ['Pogled na more ili Velebit', 'Sobe']
          ],
          // Sobe (page.rooms): one row, three of the 11 rooms on hotelnovalis.hr (user, 2026-10-21: the most beautiful),
          // [name, size, guests, photo, its page there]; Studio Deluxe stands for both studios. The fourth tile opens the
          // full list there.
          roomsLead: 'Nudimo 23 smještajne jedinice, od toga 11 suite soba, s pogledom na more ili na Velebit i gradske krovove.',
          rooms: [
            ['Suite Deluxe s pogledom na more', '25 m²', '2 osobe', IMG + 'hotel-novalis-suite-deluxe.jpg', 'https://hotelnovalis.hr/sobe/suite-deluxe-s-pogledom-na-more/'],
            ['Studio Deluxe', '30 - 36 m²', '2 - 3 osobe', IMG + 'hotel-novalis-studio-deluxe.jpg', 'https://hotelnovalis.hr/sobe/studio-deluxe/'],
            ['Standardni suite', '22 m²', '2 osobe', IMG + 'hotel-novalis-suite.jpg', 'https://hotelnovalis.hr/sobe/standardni-suite/']
          ],
          roomsAll: 'https://hotelnovalis.hr/novalis-sobe/',
          gallery: [
            [IMG + 'hotel-novalis-zgrada.jpg', 'Zgrada s krovnom terasom iznad krovova Novalje'],
            [IMG + 'hotel-novalis-terasa-vecer.jpg', 'Krovna terasa u sumrak, s pogledom na luku'],
            [IMG + 'hotel-novalis-jacuzzi.jpg', 'Hidromasažna kada na krovnoj terasi'],
            [IMG + 'hotel-novalis-zalazak.jpg', 'Zalazak sunca s krovne terase'],
            [IMG + 'hotel-novalis-koktel.jpg', 'Koktel uz pogled na more'],
            [IMG + 'hotel-novalis-recepcija.jpg', 'Recepcija'],
            [IMG + 'hotel-novalis-predvorje.jpg', 'Predvorje s motivom čipke na zidu'],
            [IMG + 'hotel-novalis-cipka.jpg', 'Zlatni motiv čipke u hodniku'],
            [IMG + 'hotel-novalis-rucnici.jpg', 'Ručnici s logom Novalis na krevetu'],
            [IMG + 'hotel-novalis-luka.jpg', 'Novalja i luka u sumrak, iz zraka']
          ],
          related: ['valis', 'pod-zvon', 'market-novalis'],
          // English page: the title, "Book now" and the room names as on hotelnovalis.hr/en/ (title in British spelling);
          // the buttons and room tiles open the English pages there
          en: {
            label: 'Accommodation',
            title: 'Your oasis in the city centre.',
            lead: 'Decorated with care and love, in the very centre of Novalja. Relax in comfortable rooms with king-size beds or in a hydromassage tub on the roof terrace, with a view of the sea or of Novalja\'s rooftops and bell towers.',
            photoAlt: 'A roof terrace with a hydromassage tub and a sea view at dusk',
            cta: { label: 'Book now', href: 'https://hotelnovalis.hr/en/' },
            stay: [['Check-in', 'after 15:00'], ['Check-out', 'by 12:00']],
            offerLead: 'On the roof there are two terraces with hydromassage tubs, a buffet breakfast and a bar, and below them rooms to relax in, in the very centre of town. We also offer our guests free parking and tips for trips around the island, to places both well known and still undiscovered.',
            offer: [
              ['Terrace with a sea view', 'Krovne terase'], ['Terrace with a view of Velebit', 'Krovne terase'],
              ['Hydromassage tubs and sunbeds', 'Krovne terase'], ['Buffet breakfast', 'Krovne terase'], ['Bar with a wide choice of drinks', 'Krovne terase'],
              ['Air conditioning and fast Wi-Fi', 'Sobe'], ['LCD TV, minibar and safe', 'Sobe'], ['Bathroom with a walk-in shower', 'Sobe'],
              ['Kitchenette in some rooms', 'Sobe'], ['Sea or Velebit view', 'Sobe']
            ],
            roomsLead: 'We offer 23 units, 11 of them suites, with a view of the sea or of Velebit and the town rooftops.',
            rooms: [
              ['Suite Deluxe with sea view', '25 m²', '2 guests', IMG + 'hotel-novalis-suite-deluxe.jpg', 'https://hotelnovalis.hr/en/sobe/suite-deluxe-with-sea-view/'],
              ['Studio Deluxe', '30 - 36 m²', '2 - 3 guests', IMG + 'hotel-novalis-studio-deluxe.jpg', 'https://hotelnovalis.hr/en/sobe/studio-deluxe/'],
              ['Standard suite', '22 m²', '2 guests', IMG + 'hotel-novalis-suite.jpg', 'https://hotelnovalis.hr/en/sobe/standardni-suite/']
            ],
            roomsAll: 'https://hotelnovalis.hr/en/novalis-sobe/',
            captions: [
              'The building with its roof terrace above the rooftops of Novalja', 'The roof terrace at dusk, with a view of the harbour',
              'A hydromassage tub on the roof terrace', 'Sunset from the roof terrace', 'A cocktail with a sea view', 'Reception',
              'The lobby with a lace motif on the wall', 'A gold lace motif in the corridor', 'Towels with the Novalis logo on a bed',
              'Novalja and the harbour at dusk, from the air'
            ]
          }
        }
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
        en: {
          title: 'Building and home improvement',
          photoHint: 'Photo: home improvement - tiles, tools, light through a window',
          desc: 'From building materials to made-to-measure furniture - your whole project in Novalja, with no trip to the mainland.'
        },
        steps: [
          { unit: 'hiper-bau', text: 'Građevinski materijal, suha gradnja, podne obloge, boje, stolarija i alati', en: { text: 'Building materials, drywall, floor coverings, paints, joinery and tools' } },
          { unit: 'hiper-novalis', text: 'Keramika, uvoz iz Italije prema narudžbi', en: { text: 'Ceramics, imported from Italy to order' } },
          { unit: 'hiper-novalis', text: 'Namještaj po mjeri s montažom', en: { text: 'Made-to-measure furniture with installation' } },
          { unit: 'hiper-novalis', text: 'Sanitarije i bijela tehnika', en: { text: 'Sanitaryware and white goods' } },
          { unit: 'hiper-novalis', text: 'Tekstil i opremanje', en: { text: 'Textiles and furnishings' } }
        ]
      },
      {
        id: 'proslave', icon: 'proslave', title: 'Proslave i događanja',
        photo: null, photoHint: 'Foto: obiteljsko slavlje, stol s tortom u Pod Zvonu',
        desc: 'Pričesti, krizme, krštenja i obiteljska slavlja u Novalji - prostor za proslave, torta, smještaj za goste i nabava na jednom mjestu.',
        en: {
          title: 'Celebrations and events',
          photoHint: 'Photo: family celebration, a table with a cake at Pod Zvon',
          desc: 'First communions, confirmations, christenings and family celebrations in Novalja - a venue, a cake, rooms for your guests and shopping, all in one place.'
        },
        steps: [
          { unit: 'pod-zvon', label: 'Pod Zvon', text: 'Prostor za privatna događanja i proslave uz župnu crkvu, mediteranska i dalmatinska kuhinja', en: { text: 'A space for private events and celebrations beside the parish church, with Mediterranean and Dalmatian cuisine' } },
          { unit: 'valis', label: 'Valis', text: 'Torte po narudžbi i kolači iz vlastite proizvodnje', en: { text: 'Cakes to order and pastries made in our own kitchen' } },
          { unit: 'hotel-novalis', text: 'Smještaj za goste u samom centru Novalje', en: { text: 'Accommodation for guests in the very centre of Novalja' } },
          { unit: 'hiper-novalis', text: 'Supermarket s namirnicama i pićem za proslavu kod kuće, uz veliko parkiralište', en: { text: 'A supermarket with food and drink for a celebration at home, and a large car park' } },
          { unit: 'market-novalis', text: 'Sve što zatreba u zadnji čas, u centru grada', en: { text: 'Everything you need at the last minute, in the town centre' } }
        ]
      },
      {
        id: 'boravak', icon: 'boravak', title: 'Boravak u Novalji',
        photo: null, photoHint: 'Foto: jutarnja kava na terasi, pogled na Novalju',
        desc: 'Smještaj, nabava, kava i večera - sve što vam treba za opušten boravak, na dohvat ruke.',
        en: {
          title: 'Staying in Novalja',
          photoHint: 'Photo: morning coffee on a terrace, view of Novalja',
          desc: 'Accommodation, shopping, coffee and dinner - everything you need for a relaxed stay, close at hand.'
        },
        steps: [
          { unit: 'hotel-novalis', text: 'Sobe u centru Novalje s hidromasažnim kadama na terasama', en: { text: 'Rooms in the centre of Novalja with hydromassage tubs on the terraces' } },
          { unit: 'hiper-novalis', text: 'Velika nabava uz veliko parkiralište, izvan gužve u centru', en: { text: 'A big shop with a large car park, away from the crowds in the centre' } },
          { unit: 'market-novalis', text: 'Namirnice i drogerija u centru', en: { text: 'Groceries and a drugstore in the town centre' } },
          { unit: 'valis', label: 'Valis', text: 'Kava, domaći sladoled, bistro i kavana s izborom vina', en: { text: 'Coffee, home-made ice cream, a bistro and a café with a choice of wines' } },
          { unit: 'pod-zvon', label: 'Pod Zvon', text: 'Napolitanska pizza i mediteranska kuhinja uz crkvu', en: { text: 'Neapolitan pizza and Mediterranean cuisine beside the church' } }
        ]
      }
    ]
  };
})();
