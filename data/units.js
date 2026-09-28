/*
 * Jedini izvor podataka za kartice, listu lokacija i kartu.
 * Radno vrijeme: indeks 0 = ponedjeljak … 6 = nedjelja; null = zatvoreno.
 * Sva radna vremena i [adrese] su PLACEHOLDER dok ih Novalis ne potvrdi.
 * (Loaded as a script, not fetched, so the site also works when opened straight from disk.)
 */
(function () {
  var wk = function (a, b) { return [a, b]; };
  var week = function (mf, sat, sun) { return [mf, mf, mf, mf, mf, sat, sun]; };
  var allDay = week(wk('00:00', '24:00'), wk('00:00', '24:00'), wk('00:00', '24:00'));

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
    categories: [
      { id: 'trgovina', label: 'Trgovina' },
      { id: 'dom', label: 'Dom i gradnja' },
      { id: 'veleprodaja', label: 'Veleprodaja' },
      { id: 'hrana', label: 'Hrana i piće' },
      { id: 'smjestaj', label: 'Smještaj' }
    ],
    units: [
      {
        id: 'hiper-novalis', category: 'trgovina', name: 'Hiper Novalis',
        desc: 'Shopping centar: supermarket, bijela tehnika, namještaj, sanitarije, pića.',
        address: 'Špital bb, Novalja', phone: '053 663 300', tel: '+38553663300',
        brand: { logo: 'hiper-horizontal', topBg: '#D61920', topFg: '#FFCB04', btnBg: '#D61920', btnFg: '#FFFFFF', link: '#B3141A', pin: '#D61920', pinFg: '#FFFFFF' },
        promo: true, url: '#hiper-novalis', pin: { x: 62, y: 30 },
        hours: {
          summer: week(wk('07:00', '22:00'), wk('07:00', '22:00'), wk('07:00', '21:00')),
          winter: week(wk('07:00', '20:00'), wk('07:00', '20:00'), wk('08:00', '13:00'))
        },
        photo: 'assets/img/hiper-novalis-storefront.jpg', photoHint: 'Foto: Hiper Novalis, ulaz i parking'
      },
      {
        id: 'market-novalis', category: 'trgovina', name: 'Market i drogerija Novalis',
        desc: 'Namirnice i drogerija u samom centru Novalje.',
        address: 'Centar Novalje [adresa]', phone: '098 441 149', tel: '+38598441149',
        brand: { logo: 'market-horizontal', topBg: '#FFCB04', topFg: '#D61920', btnBg: '#FFCB04', btnFg: '#B3141A', link: '#B3141A', pin: '#FFCB04', pinFg: '#B3141A' },
        promo: false, url: '#market-novalis', pin: { x: 44, y: 56 },
        hours: {
          summer: week(wk('06:30', '23:00'), wk('06:30', '23:00'), wk('07:00', '22:00')),
          winter: week(wk('07:00', '20:00'), wk('07:00', '20:00'), wk('07:00', '13:00'))
        },
        photo: null, photoHint: 'Foto: Market u centru, izlog i police'
      },
      {
        id: 'hiper-bau', category: 'dom', name: 'Hiper bau',
        desc: 'Građevinski materijal, pločice i alati za svaki projekt.',
        address: '[adresa], Novalja', phone: null, tel: null,
        brand: { wordmark: 'HIPER BAU', topBg: '#3D4A54', topFg: '#FFFFFF', topBar: '#D61920', btnBg: '#3D4A54', btnFg: '#FFFFFF', link: '#3D4A54', pin: '#3D4A54', pinFg: '#FFFFFF' },
        promo: true, url: '#hiper-bau', pin: { x: 72, y: 20 },
        hours: {
          summer: week(wk('07:00', '20:00'), wk('07:00', '14:00'), null),
          winter: week(wk('07:00', '17:00'), wk('07:00', '13:00'), null)
        },
        photo: null, photoHint: 'Foto: skladište pločica i materijala'
      },
      {
        id: 'veleprodaja', category: 'veleprodaja', name: 'Veleprodaja',
        desc: 'Pića i roba za ugostitelje, dostava po cijelom Pagu.',
        address: '[adresa], Novalja', phone: null, tel: null,
        brand: { wordmark: 'VELEPRODAJA', topBg: '#6A503C', topFg: '#CCB08F', btnBg: '#6A503C', btnFg: '#FFFFFF', link: '#6A503C', pin: '#6A503C', pinFg: '#FFFFFF' },
        promo: false, url: '#veleprodaja', pin: { x: 80, y: 38 },
        hours: {
          summer: week(wk('06:00', '14:00'), wk('06:00', '12:00'), null),
          winter: week(wk('07:00', '15:00'), null, null)
        },
        photo: null, photoHint: 'Foto: kamion za dostavu, palete pića'
      },
      {
        id: 'valis', category: 'hrana', name: 'Slastičarna Valis',
        desc: 'Torte, kolači i sladoled na Trgu Bazilike.',
        address: 'Trg Bazilike 3, Novalja', phone: '099 258 6317', tel: '+385992586317',
        brand: { wordmark: 'VALIS', topBg: '#F4F0FF', topFg: '#6E38FF', btnBg: '#6E38FF', btnFg: '#FFFFFF', link: '#5A2BD9', pin: '#6E38FF', pinFg: '#FFFFFF' },
        promo: false, url: '#valis', pin: { x: 38, y: 62 },
        hours: {
          summer: week(wk('08:00', '24:00'), wk('08:00', '24:00'), wk('08:00', '24:00')),
          winter: [wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '21:00'), wk('08:00', '22:00'), wk('08:00', '22:00'), wk('09:00', '21:00')]
        },
        photo: null, photoHint: 'Foto: torte i kolači u vitrini'
      },
      {
        id: 'pod-zvon', category: 'hrana', name: 'Bistro Pod Zvon',
        desc: 'Domaća kuhinja i dnevni meni uz zvonik.',
        address: 'Ulica kralja Zvonimira 1a, Novalja', phone: '053 679 555', tel: '+38553679555',
        brand: { wordmark: 'Pod Zvon', topBg: '#2E2C2B', topFg: '#F1E6D6', btnBg: '#2E2C2B', btnFg: '#FFFFFF', link: '#2E2C2B', pin: '#2E2C2B', pinFg: '#FFFFFF' },
        promo: false, url: '#pod-zvon', pin: { x: 33, y: 52 },
        hours: {
          summer: week(wk('09:00', '24:00'), wk('09:00', '24:00'), wk('09:00', '24:00')),
          winter: [null, wk('12:00', '22:00'), wk('12:00', '22:00'), wk('12:00', '22:00'), wk('12:00', '23:00'), wk('12:00', '23:00'), wk('12:00', '21:00')]
        },
        photo: null, photoHint: 'Foto: terasa bistroa uz zvonik'
      },
      {
        id: 'hotel-novalis', category: 'smjestaj', name: 'Hotel Novalis',
        desc: 'B&B u Novalji - sobe za obitelj, prijatelje i poslovne goste.',
        address: '[adresa], Novalja', phone: '053 662 222', tel: '+38553662222',
        brand: { wordmark: 'HOTEL NOVALIS', sub: 'B&B', topBg: '#9E0B0F', topFg: '#FFFFFF', btnBg: '#9E0B0F', btnFg: '#FFFFFF', link: '#9E0B0F', pin: '#9E0B0F', pinFg: '#FFFFFF' },
        promo: false, url: 'https://hotelnovalis.hr', external: true, pin: { x: 52, y: 72 },
        hours: { summer: allDay, winter: allDay },
        photo: null, photoHint: 'Foto: soba s pogledom, Hotel Novalis'
      }
    ],
    stories: [
      {
        id: 'gradnja', tab: 'Gradite ili uređujete dom?', title: 'Gradite ili uređujete dom?',
        desc: 'Od građevinskog materijala i keramike do sanitarija, namještaja i kućanskih uređaja - sve potrebno za gradnju i uređenje možete riješiti kroz Novalis, uz dostavu na području Paga.',
        photo: 'Foto: obitelj u kući koja se uređuje - keramika, alati, svjetlo kroz prozor',
        steps: [
          { text: 'Građevinski materijal i keramika', unit: 'hiper-bau', label: 'Hiper Bau' },
          { text: 'Sanitarije i oprema za dom', unit: 'hiper-novalis' },
          { text: 'Namještaj i kućanski uređaji', unit: 'hiper-novalis' },
          { text: 'Dostava na adresu', unit: null, label: 'Novalis dostava', href: '#kontakt' }
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
          { text: 'Dostava do objekta', unit: null, label: 'Novalis dostava', href: '#kontakt' }
        ]
      },
      {
        id: 'slavlje', tab: 'Organizirate slavlje?', title: 'Organizirate slavlje?',
        desc: 'Od torte i večere do pića i smještaja za goste - više potreba za jedno slavlje možete riješiti unutar Novalisa.',
        photo: 'Foto: obiteljsko slavlje na terasi u večernjem svjetlu',
        steps: [
          { text: 'Torta i slastice', unit: 'valis' },
          { text: 'Večera', unit: 'pod-zvon' },
          { text: 'Piće za veće društvo', unit: 'veleprodaja' },
          { text: 'Smještaj za goste', unit: 'hotel-novalis' }
        ]
      }
    ]
  };
})();
