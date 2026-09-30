/*
 * Jedini izvor podataka za kartice, izbornik, kartu, popis lokacija i priče (dizajn v4 · units-v3.json, copy prema novalis.hr).
 * Radno vrijeme: indeks 0 = ponedjeljak … 6 = nedjelja; null = zatvoreno.
 * Radna vremena su PLACEHOLDER dok ih Novalis ne potvrdi.
 * (Loaded as a script, not fetched, so the site also works when opened straight from disk.)
 */
(function () {
  var wk = function (a, b) { return [a, b]; };
  var week = function (mf, sat, sun) { return [mf, mf, mf, mf, mf, sat, sun]; };
  var daily = function (h) { return week(h, h, h); };
  var allDay = daily(wk('00:00', '24:00'));

  window.NOVALIS_DATA = {
    company: {
      name: 'Novalis d.o.o.',
      address: 'Josipa Kunkere 8, 53291 Novalja',
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
    // url: only for units with their own website; others link to their card (#id) until unit pages exist.
    units: [
      {
        id: 'hiper-novalis', category: 'trgovine', name: 'Hiper Novalis',
        desc: 'Veliki hipermarket s bogatim izborom proizvoda.',
        address: 'Čiponjac III/2, Novalja', phone: '053 663 300', tel: '+38553663300',
        promo: false, pin: { x: 62, y: 30 },
        hours: {
          summer: daily(wk('07:00', '22:00')),
          winter: week(wk('07:00', '19:00'), wk('07:00', '19:00'), wk('07:00', '12:30'))
        },
        photo: 'assets/img/hiper-novalis-storefront.jpg', photoHint: 'Foto: Hiper Novalis, ulaz i parking'
      },
      {
        id: 'market-novalis', category: 'trgovine', name: 'Market Novalis',
        desc: 'Trgovina prehrambenih proizvoda i robe svakodnevne potrošnje.',
        address: 'Josipa Kunkere 8, Novalja', phone: '098 441 149', tel: '+38598441149',
        promo: false, pin: { x: 44, y: 56 },
        hours: {
          summer: week(wk('06:30', '23:00'), wk('06:30', '23:00'), wk('07:00', '22:00')),
          winter: week(wk('07:00', '20:00'), wk('07:00', '20:00'), wk('07:00', '13:00'))
        },
        photo: null, photoHint: 'Foto: Market u centru, izlog i police'
      },
      {
        id: 'hiper-bau', category: 'trgovine', name: 'Hiper Bau',
        desc: 'Trgovina građevinskim materijalom i opremom za dom.',
        address: 'Čiponjac III/3, Novalja', phone: '099 5476 792', tel: '+385995476792',
        promo: false, pin: { x: 72, y: 20 },
        hours: {
          summer: week(wk('07:00', '20:00'), wk('07:00', '14:00'), null),
          winter: week(wk('07:00', '17:00'), wk('07:00', '13:00'), null)
        },
        photo: null, photoHint: 'Foto: skladište pločica i materijala'
      },
      {
        id: 'veleprodaja', category: 'veleprodaja', name: 'Veleprodaja',
        desc: 'Tvrtka Novalis nudi veleprodaju široke palete proizvoda uz uslugu dostave.',
        address: 'Novalja', phone: null, tel: null,
        promo: false, pin: { x: 80, y: 38 },
        hours: {
          summer: week(wk('06:00', '14:00'), wk('06:00', '12:00'), null),
          winter: week(wk('07:00', '15:00'), null, null)
        },
        photo: null, photoHint: 'Foto: kamion za dostavu, palete pića'
      },
      {
        id: 'valis', category: 'gastro', name: 'Bistro i slastičarna Valis',
        desc: 'Usluge bistroa i slastičarnice.',
        address: 'Trg Bazilike 3, Novalja', phone: '099 258 6317', tel: '+385992586317',
        promo: false, pin: { x: 38, y: 62 },
        hours: {
          summer: daily(wk('08:00', '24:00')),
          winter: [wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '22:00'), wk('08:00', '22:00'), wk('09:00', '21:00')]
        },
        photo: null, photoHint: 'Foto: torte i kolači u vitrini'
      },
      {
        id: 'pod-zvon', category: 'gastro', name: 'Bistro Pod Zvon',
        desc: 'Nalazi se tik pod zvon župne crkve u centru grada.',
        address: 'Ulica kralja Zvonimira 1a, Novalja', phone: '053 679 555', tel: '+38553679555',
        promo: false, pin: { x: 33, y: 52 },
        hours: {
          summer: daily(wk('16:00', '24:00')),
          winter: daily(wk('16:00', '24:00'))
        },
        photo: null, photoHint: 'Foto: terasa bistroa uz zvonik'
      },
      {
        id: 'hotel-novalis', category: 'smjestaj', name: 'B&B Novalis',
        desc: 'Smještaj s doručkom u centru Novalje - sobe za obitelj, prijatelje i poslovne goste.',
        address: 'Josipa Kunkere 8, Novalja', phone: '053 662 222', tel: '+38553662222',
        promo: false, url: 'https://hotelnovalis.hr', external: true, pin: { x: 52, y: 72 },
        hours: { summer: allDay, winter: allDay },
        photo: null, photoHint: 'Foto: soba s pogledom, B&B Novalis'
      }
    ],
    // "Novalis u stvarnom životu" (o-nama.html). A step links to its unit's card, or to `href` on the landing page.
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
