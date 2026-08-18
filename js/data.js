/* =========================================================================
   DIAMANTE — Simulador de carrera de béisbol
   data.js · Ligas, franquicias, países, nombres y catálogos
   ========================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------
     LIGAS
     q   = calidad relativa (1.00 = Grandes Ligas)
     pay = multiplicador salarial
     --------------------------------------------------------------------- */
  const LEAGUES = {
    MLB:  { id:'MLB',  name:'Grandes Ligas',        short:'MLB',  q:1.00, pay:1.00, games:162, tier:1, country:'US' },
    AAA:  { id:'AAA',  name:'Triple A',             short:'AAA',  q:0.80, pay:0.06, games:150, tier:2, country:'US' },
    AA:   { id:'AA',   name:'Doble A',              short:'AA',   q:0.70, pay:0.03, games:138, tier:3, country:'US' },
    A:    { id:'A',    name:'Clase A',              short:'A',    q:0.56, pay:0.02, games:132, tier:4, country:'US' },
    ROK:  { id:'ROK',  name:'Liga de Novatos',      short:'RK',   q:0.44, pay:0.01, games:60,  tier:5, country:'US' },
    DSL:  { id:'DSL',  name:'Academia (DSL)',       short:'DSL',  q:0.40, pay:0.01, games:56,  tier:5, country:'DO' },
    NPB:  { id:'NPB',  name:'Liga Japonesa',        short:'NPB',  q:0.90, pay:0.45, games:143, tier:1, country:'JP' },
    KBO:  { id:'KBO',  name:'Liga Coreana',         short:'KBO',  q:0.82, pay:0.22, games:144, tier:1, country:'KR' },
    CPBL: { id:'CPBL', name:'Liga Taiwanesa',       short:'CPBL', q:0.72, pay:0.10, games:120, tier:2, country:'TW' },
    LMB:  { id:'LMB',  name:'Liga Mexicana',        short:'LMB',  q:0.75, pay:0.08, games:90,  tier:2, country:'MX' },
    CUB:  { id:'CUB',  name:'Serie Nacional',       short:'SN',   q:0.72, pay:0.01, games:75,  tier:2, country:'CU' },
    ABL:  { id:'ABL',  name:'Liga Australiana',     short:'ABL',  q:0.60, pay:0.03, games:40,  tier:3, country:'AU' },
    HON:  { id:'HON',  name:'Hoofdklasse',          short:'HK',   q:0.55, pay:0.02, games:42,  tier:3, country:'NL' },
    ITA:  { id:'ITA',  name:'Serie A Italiana',     short:'IBL',  q:0.52, pay:0.02, games:42,  tier:3, country:'IT' },
    IND:  { id:'IND',  name:'Liga Independiente',   short:'IND',  q:0.58, pay:0.02, games:96,  tier:4, country:'US' }
  };

  /* Ligas invernales: se juegan además de la temporada regular */
  const WINTER = {
    LIDOM: { id:'LIDOM', name:'LIDOM (Dominicana)',  clubs:['Tigres del Licey','Águilas Cibaeñas','Leones del Escogido','Estrellas Orientales','Toros del Este','Gigantes del Cibao'] },
    LVBP:  { id:'LVBP',  name:'LVBP (Venezuela)',    clubs:['Leones del Caracas','Navegantes del Magallanes','Cardenales de Lara','Tiburones de La Guaira','Águilas del Zulia','Caribes de Anzoátegui','Bravos de Margarita','Tigres de Aragua'] },
    LMP:   { id:'LMP',   name:'LMP (México)',        clubs:['Naranjeros de Hermosillo','Tomateros de Culiacán','Venados de Mazatlán','Yaquis de Obregón','Charros de Jalisco','Águilas de Mexicali'] },
    LBPRC: { id:'LBPRC', name:'LBPRC (Puerto Rico)', clubs:['Cangrejeros de Santurce','Criollos de Caguas','Indios de Mayagüez','Gigantes de Carolina','Leones de Ponce'] }
  };

  /* ---------------------------------------------------------------------
     FRANQUICIAS
     str = fuerza deportiva base (1-10) · mkt = tamaño de mercado (1-10)
     --------------------------------------------------------------------- */
  const T = (id, name, abbr, lg, div, str, mkt, c1, c2) =>
    ({ id, name, abbr, lg, div, str, mkt, c1, c2 });

  const CLUBS = [
    /* ---- Grandes Ligas · Americana ---- */
    T('nyy','Yankees de Nueva York','NYY','MLB','AL Este',9,10,'#132448','#C4CED3'),
    T('bos','Medias Rojas de Boston','BOS','MLB','AL Este',8,9,'#BD3039','#0C2340'),
    T('tor','Azulejos de Toronto','TOR','MLB','AL Este',7,8,'#134A8E','#1D2D5C'),
    T('tb','Rays de Tampa Bay','TB','MLB','AL Este',7,4,'#092C5C','#8FBCE6'),
    T('bal','Orioles de Baltimore','BAL','MLB','AL Este',7,5,'#DF4601','#000000'),
    T('cle','Guardianes de Cleveland','CLE','MLB','AL Central',7,5,'#E31937','#0C2340'),
    T('min','Mellizos de Minnesota','MIN','MLB','AL Central',6,5,'#002B5C','#D31145'),
    T('det','Tigres de Detroit','DET','MLB','AL Central',6,6,'#0C2340','#FA4616'),
    T('kc','Reales de Kansas City','KC','MLB','AL Central',5,4,'#004687','#BD9B60'),
    T('cws','Medias Blancas de Chicago','CWS','MLB','AL Central',5,8,'#27251F','#C4CED4'),
    T('hou','Astros de Houston','HOU','MLB','AL Oeste',8,8,'#002D62','#EB6E1F'),
    T('sea','Marineros de Seattle','SEA','MLB','AL Oeste',7,7,'#0C2C56','#005C5C'),
    T('tex','Rangers de Texas','TEX','MLB','AL Oeste',7,8,'#003278','#C0111F'),
    T('laa','Angelinos de Los Ángeles','LAA','MLB','AL Oeste',5,9,'#BA0021','#003263'),
    T('ath','Atléticos','ATH','MLB','AL Oeste',4,3,'#003831','#EFB21E'),
    /* ---- Grandes Ligas · Nacional ---- */
    T('atl','Bravos de Atlanta','ATL','MLB','NL Este',9,7,'#CE1141','#13274F'),
    T('phi','Filis de Filadelfia','PHI','MLB','NL Este',8,8,'#E81828','#002D72'),
    T('nym','Mets de Nueva York','NYM','MLB','NL Este',7,10,'#002D72','#FF5910'),
    T('mia','Marlins de Miami','MIA','MLB','NL Este',4,6,'#00A3E0','#EF3340'),
    T('was','Nacionales de Washington','WAS','MLB','NL Este',5,7,'#AB0003','#14225A'),
    T('chc','Cachorros de Chicago','CHC','MLB','NL Central',7,9,'#0E3386','#CC3433'),
    T('mil','Cerveceros de Milwaukee','MIL','MLB','NL Central',7,4,'#12284B','#FFC52F'),
    T('stl','Cardenales de San Luis','STL','MLB','NL Central',7,6,'#C41E3A','#0C2340'),
    T('cin','Rojos de Cincinnati','CIN','MLB','NL Central',5,4,'#C6011F','#000000'),
    T('pit','Piratas de Pittsburgh','PIT','MLB','NL Central',4,4,'#FDB827','#27251F'),
    T('lad','Dodgers de Los Ángeles','LAD','MLB','NL Oeste',10,10,'#005A9C','#EF3E42'),
    T('sd','Padres de San Diego','SD','MLB','NL Oeste',7,6,'#2F241D','#FFC425'),
    T('sf','Gigantes de San Francisco','SF','MLB','NL Oeste',6,8,'#FD5A1E','#27251F'),
    T('ari','Diamondbacks de Arizona','ARI','MLB','NL Oeste',6,5,'#A71930','#E3D4AD'),
    T('col','Rockies de Colorado','COL','MLB','NL Oeste',4,5,'#33006F','#C4CED4'),

    /* ---- Japón ---- */
    T('yg','Yomiuri Giants','YOM','NPB','Central',9,10,'#F97709','#000000'),
    T('ht','Hanshin Tigers','HAN','NPB','Central',8,9,'#FFE201','#000000'),
    T('cd','Chunichi Dragons','CHU','NPB','Central',6,7,'#003595','#FFFFFF'),
    T('db','Yokohama DeNA BayStars','DEN','NPB','Central',7,7,'#0873B0','#FFFFFF'),
    T('ys','Tokyo Yakult Swallows','YAK','NPB','Central',6,7,'#98C1E9','#BB0000'),
    T('hc','Hiroshima Toyo Carp','HIR','NPB','Central',7,6,'#E60027','#FFFFFF'),
    T('sh','Fukuoka SoftBank Hawks','SOF','NPB','Pacífico',9,8,'#F5C300','#000000'),
    T('lm','Chiba Lotte Marines','LOT','NPB','Pacífico',6,6,'#231F20','#C0C0C0'),
    T('re','Tohoku Rakuten Eagles','RAK','NPB','Pacífico',6,6,'#870010','#B8985A'),
    T('sl','Saitama Seibu Lions','SEI','NPB','Pacífico',7,7,'#102961','#0071BC'),
    T('ob','Orix Buffaloes','ORI','NPB','Pacífico',7,6,'#000019','#B49B57'),
    T('nf','Hokkaido Nippon-Ham Fighters','NIP','NPB','Pacífico',7,6,'#02579B','#B7B7B7'),

    /* ---- Corea ---- */
    T('sam','Samsung Lions','SAM','KBO','KBO',8,8,'#074CA1','#FFFFFF'),
    T('doo','Doosan Bears','DOO','KBO','KBO',8,9,'#131230','#C7002B'),
    T('lgt','LG Twins','LGT','KBO','KBO',8,9,'#C30452','#000000'),
    T('kia','KIA Tigers','KIA','KBO','KBO',7,7,'#EA0029','#06141F'),
    T('lot','Lotte Giants','LOG','KBO','KBO',6,8,'#041E42','#D00F31'),
    T('ssg','SSG Landers','SSG','KBO','KBO',7,7,'#CE0E2D','#FFB81C'),
    T('han','Hanwha Eagles','HWE','KBO','KBO',5,6,'#FF6600','#000000'),
    T('nc','NC Dinos','NCD','KBO','KBO',7,5,'#315288','#AF917B'),
    T('kt','KT Wiz','KTW','KBO','KBO',6,6,'#000000','#EC1C24'),
    T('kiw','Kiwoom Heroes','KIW','KBO','KBO',6,6,'#570514','#B07F4A'),

    /* ---- Taiwán ---- */
    T('ups','Uni-President Lions','UNI','CPBL','CPBL',7,7,'#F26522','#000000'),
    T('ctb','CTBC Brothers','CTB','CPBL','CPBL',7,8,'#FFD700','#000000'),
    T('rkm','Rakuten Monkeys','RKM','CPBL','CPBL',6,6,'#8C0000','#D4AF37'),
    T('fbg','Fubon Guardians','FUB','CPBL','CPBL',6,6,'#0B2E5C','#00A0E9'),
    T('wcd','Wei Chuan Dragons','WEI','CPBL','CPBL',5,5,'#D22630','#FFFFFF'),
    T('tsg','TSG Hawks','TSG','CPBL','CPBL',5,5,'#005BAC','#F5A800'),

    /* ---- México ---- */
    T('dia','Diablos Rojos del México','MEX','LMB','LMB',8,9,'#D2232A','#FFFFFF'),
    T('sul','Sultanes de Monterrey','MTY','LMB','LMB',7,8,'#003DA5','#FFFFFF'),
    T('yuc','Leones de Yucatán','YUC','LMB','LMB',7,6,'#005DAA','#F5A800'),
    T('pue','Pericos de Puebla','PUE','LMB','LMB',6,6,'#00843D','#FFFFFF'),
    T('qro','Tigres de Quintana Roo','QR','LMB','LMB',6,5,'#F58220','#000000'),
    T('oax','Guerreros de Oaxaca','OAX','LMB','LMB',5,5,'#00A19A','#FFFFFF'),
    T('mva','Acereros de Monclova','MVA','LMB','LMB',6,4,'#EE3124','#000000'),
    T('tij','Toros de Tijuana','TIJ','LMB','LMB',7,6,'#111111','#DA291C'),
    T('agu','Rieleros de Aguascalientes','AGS','LMB','LMB',5,4,'#0033A0','#FFFFFF'),
    T('leo','Bravos de León','LEO','LMB','LMB',5,5,'#046A38','#FFFFFF'),

    /* ---- Cuba ---- */
    T('ind','Industriales','IND','CUB','SN',8,9,'#0033A0','#FFFFFF'),
    T('scu','Santiago de Cuba','SCU','CUB','SN',7,7,'#D2232A','#FFFFFF'),
    T('pri','Pinar del Río','PRI','CUB','SN',7,6,'#006747','#FFFFFF'),
    T('vcl','Villa Clara','VCL','CUB','SN',6,5,'#F58220','#000000'),
    T('mtz','Matanzas','MTZ','CUB','SN',7,5,'#7A1FA2','#FFFFFF'),
    T('gra','Granma','GRA','CUB','SN',6,4,'#C8102E','#FFD100'),
    T('ltu','Las Tunas','LTU','CUB','SN',6,4,'#00693E','#FFFFFF'),
    T('cmg','Camagüey','CMG','CUB','SN',5,4,'#1D4F91','#FFFFFF'),

    /* ---- Australia ---- */
    T('per','Perth Heat','PER','ABL','ABL',7,6,'#E4002B','#000000'),
    T('bri','Brisbane Bandits','BRI','ABL','ABL',6,6,'#00263A','#F6BE00'),
    T('ade','Adelaide Giants','ADE','ABL','ABL',6,5,'#003087','#FFFFFF'),
    T('mel','Melbourne Aces','MEL','ABL','ABL',6,7,'#0C2340','#41B6E6'),
    T('can','Canberra Cavalry','CAN','ABL','ABL',5,4,'#7A0026','#B9975B'),
    T('syd','Sydney Blue Sox','SYD','ABL','ABL',5,7,'#41B6E6','#0C2340'),

    /* ---- Países Bajos ---- */
    T('nep','Curaçao Neptunus','NEP','HON','HK',8,6,'#00539B','#FFFFFF'),
    T('amp','Amsterdam Pirates','AMS','HON','HK',7,7,'#111111','#F5A800'),
    T('kin','Kinheim Haarlem','KIN','HON','HK',6,5,'#C8102E','#FFFFFF'),
    T('hcw','HCAW Bussum','HCW','HON','HK',5,4,'#006747','#FFFFFF'),

    /* ---- Italia ---- */
    T('sma','San Marino Baseball','SMR','ITA','IBL',7,5,'#0071CE','#FFFFFF'),
    T('bol','Fortitudo Bologna','BOL','ITA','IBL',7,6,'#0C2340','#FFFFFF'),
    T('par','Parma Clima','PAR','ITA','IBL',6,5,'#F5A800','#0C2340'),
    T('nes','UnipolSai Bologna','UNB','ITA','IBL',6,6,'#C8102E','#FFFFFF')
  ];

  const CLUB_BY_ID = {};
  CLUBS.forEach(c => { CLUB_BY_ID[c.id] = c; });
  const byLeague = lg => CLUBS.filter(c => c.lg === lg);

  /* ---------------------------------------------------------------------
     PAÍSES
     pool = calidad del semillero (0-10) · path = ruta de entrada
     flag = bandera simplificada dibujada con CSS
     --------------------------------------------------------------------- */
  const F = {
    h3: (a,b,c) => `linear-gradient(180deg,${a} 0 33.34%,${b} 0 66.67%,${c} 0)`,
    v3: (a,b,c) => `linear-gradient(90deg,${a} 0 33.34%,${b} 0 66.67%,${c} 0)`,
    h2: (a,b)   => `linear-gradient(180deg,${a} 0 50%,${b} 0)`,
    v2: (a,b)   => `linear-gradient(90deg,${a} 0 50%,${b} 0)`
  };

  const C = (code, name, pool, path, flag, gent) => ({ code, name, pool, path, flag, gent });

  const COUNTRIES = [
    C('US','Estados Unidos',10,'draft','repeating-linear-gradient(180deg,#B22234 0 12.5%,#fff 0 25%)','estadounidense'),
    C('DO','República Dominicana',10,'academia', F.h3('#002D62','#ffffff','#CE1126'),'dominicano'),
    C('VE','Venezuela',9,'academia', F.h3('#FFCE00','#00247D','#CF142B'),'venezolano'),
    C('CU','Cuba',9,'cuba', F.h2('#002A8F','#CF142B'),'cubano'),
    C('PR','Puerto Rico',8,'draft', F.h3('#CF142B','#ffffff','#0050F0'),'puertorriqueño'),
    C('MX','México',8,'mexico', F.v3('#006847','#ffffff','#CE1126'),'mexicano'),
    C('JP','Japón',9,'npb','radial-gradient(circle at 50% 50%,#BC002D 0 32%,#ffffff 0)','japonés'),
    C('KR','Corea del Sur',8,'kbo','radial-gradient(circle at 50% 50%,#CD2E3A 0 24%,#ffffff 0)','coreano'),
    C('TW','Taiwán',7,'cpbl', F.v2('#000095','#FE0000'),'taiwanés'),
    C('CW','Curazao',7,'academia', F.h3('#002B7F','#F9E814','#002B7F'),'curazoleño'),
    C('AW','Aruba',6,'academia', F.h3('#418FDE','#F9E814','#418FDE'),'arubeño'),
    C('PA','Panamá',7,'academia', F.v2('#D21034','#005293'),'panameño'),
    C('CO','Colombia',7,'academia', F.h3('#FCD116','#003893','#CE1126'),'colombiano'),
    C('NI','Nicaragua',6,'academia', F.h3('#0067C6','#ffffff','#0067C6'),'nicaragüense'),
    C('CA','Canadá',6,'draft', F.v3('#D80621','#ffffff','#D80621'),'canadiense'),
    C('AU','Australia',5,'abl', F.h2('#00247D','#00247D'),'australiano'),
    C('NL','Países Bajos',5,'hoofd', F.h3('#AE1C28','#ffffff','#21468B'),'neerlandés'),
    C('IT','Italia',4,'europa', F.v3('#008C45','#ffffff','#CD212A'),'italiano'),
    C('IL','Israel',3,'europa', F.h3('#ffffff','#0038B8','#ffffff'),'israelí'),
    C('BR','Brasil',4,'academia', F.h2('#009B3A','#FEDF00'),'brasileño'),
    C('AR','Argentina',3,'europa', F.h3('#75AADB','#ffffff','#75AADB'),'argentino'),
    C('DE','Alemania',3,'europa', F.h3('#111111','#DD0000','#FFCE00'),'alemán'),
    C('GB','Reino Unido',3,'europa', F.h3('#012169','#ffffff','#C8102E'),'británico'),
    C('ES','España',3,'europa', F.h3('#AA151B','#F1BF00','#AA151B'),'español'),
    C('FR','Francia',3,'europa', F.v3('#0055A4','#ffffff','#EF4135'),'francés'),
    C('CN','China',3,'cpbl', F.h2('#DE2910','#DE2910'),'chino'),
    C('PH','Filipinas',3,'academia', F.h2('#0038A8','#CE1126'),'filipino'),
    C('NZ','Nueva Zelanda',3,'abl', F.h2('#00247D','#00247D'),'neozelandés'),
    C('ZA','Sudáfrica',2,'europa', F.h3('#007A4D','#ffffff','#002395'),'sudafricano'),
    C('CR','Costa Rica',3,'academia', F.h3('#002B7F','#ffffff','#CE1126'),'costarricense'),
    C('GT','Guatemala',3,'academia', F.v3('#4997D0','#ffffff','#4997D0'),'guatemalteco'),
    C('HN','Honduras',3,'academia', F.h3('#0073CF','#ffffff','#0073CF'),'hondureño'),
    C('SV','El Salvador',3,'academia', F.h3('#0F47AF','#ffffff','#0F47AF'),'salvadoreño'),
    C('EC','Ecuador',3,'academia', F.h3('#FFDD00','#0033A0','#EF3340'),'ecuatoriano'),
    C('PE','Perú',3,'academia', F.v3('#D91023','#ffffff','#D91023'),'peruano'),
    C('CL','Chile',3,'academia', F.h2('#0039A6','#D52B1E'),'chileno'),
    C('BS','Bahamas',4,'academia', F.h3('#00778B','#FFC72C','#00778B'),'bahameño'),
    C('JM','Jamaica',3,'academia', F.h3('#009B3A','#FED100','#009B3A'),'jamaiquino'),
    C('TT','Trinidad y Tobago',3,'academia', F.h2('#CE1126','#111111'),'trinitense'),
    C('IN','India',2,'europa', F.h3('#FF9933','#ffffff','#138808'),'indio'),
    C('SE','Suecia',2,'europa', F.h2('#006AA7','#FECC00'),'sueco'),
    C('CZ','Chequia',3,'europa', F.h2('#ffffff','#D7141A'),'checo'),
    C('AT','Austria',2,'europa', F.h3('#ED2939','#ffffff','#ED2939'),'austríaco'),
    C('PT','Portugal',2,'europa', F.v2('#046A38','#DA291C'),'portugués'),
    C('BE','Bélgica',2,'europa', F.v3('#111111','#FDDA24','#EF3340'),'belga'),
    C('CH','Suiza',2,'europa', F.h2('#D52B1E','#D52B1E'),'suizo'),
    C('HR','Croacia',2,'europa', F.h3('#FF0000','#ffffff','#171796'),'croata'),
    C('RO','Rumania',2,'europa', F.v3('#002B7F','#FCD116','#CE1126'),'rumano'),
    C('UA','Ucrania',2,'europa', F.h2('#0057B7','#FFDD00'),'ucraniano'),
    C('PL','Polonia',2,'europa', F.h2('#ffffff','#DC143C'),'polaco')
  ];
  const COUNTRY_BY_CODE = {};
  COUNTRIES.forEach(c => { COUNTRY_BY_CODE[c.code] = c; });

  /* ---------------------------------------------------------------------
     POSICIONES
     --------------------------------------------------------------------- */
  const POSITIONS = [
    { id:'SP', name:'Abridor',            role:'sp',  x:50, y:60, desc:'Manda cada cinco días. Gana juegos, poncha y persigue el Cy Young.' },
    { id:'RP', name:'Relevista',          role:'rp',  x:20, y:78, desc:'Entra con el juego en la mano. Salvamentos y adrenalina pura.' },
    { id:'C',  name:'Receptor',           role:'hit', x:50, y:90, desc:'El cerebro del equipo. Poco bateo, mucha defensa y liderazgo.' },
    { id:'1B', name:'Primera base',       role:'hit', x:76, y:62, desc:'Puesto de poder puro: jonrones y remolcadas por encima de todo.' },
    { id:'2B', name:'Segunda base',       role:'hit', x:66, y:44, desc:'Contacto, velocidad y guante fino en el medio del cuadro.' },
    { id:'3B', name:'Tercera base',       role:'hit', x:24, y:62, desc:'La esquina caliente: reflejos, brazo y poder.' },
    { id:'SS', name:'Campocorto',         role:'hit', x:34, y:44, desc:'La posición más exigente del diamante. Si bateás, valés oro.' },
    { id:'LF', name:'Jardín izquierdo',   role:'hit', x:14, y:24, desc:'Bate primero, guante después. Puesto de bateadores.' },
    { id:'CF', name:'Jardín central',     role:'hit', x:50, y:16, desc:'Recorrido, velocidad y espectáculo. El atleta del equipo.' },
    { id:'RF', name:'Jardín derecho',     role:'hit', x:86, y:24, desc:'Brazo de cañón y poder desde la esquina.' },
    { id:'DH', name:'Bateador designado', role:'hit', x:88, y:88, desc:'Solo bateás. O pegás, o no jugás.' }
  ];
  const POS_BY_ID = {};
  POSITIONS.forEach(p => { POS_BY_ID[p.id] = p; });

  /* Pesos de atributos por posición (definen el OVR) */
  const POS_WEIGHTS = {
    SP:  { vel:.26, ctl:.26, mov:.24, res:.14, men:.10 },
    RP:  { vel:.32, ctl:.22, mov:.26, res:.06, men:.14 },
    C:   { con:.22, pod:.18, dis:.12, spd:.04, def:.32, arm:.12 },
    '1B':{ con:.26, pod:.40, dis:.16, spd:.03, def:.11, arm:.04 },
    '2B':{ con:.28, pod:.16, dis:.14, spd:.14, def:.22, arm:.06 },
    '3B':{ con:.24, pod:.28, dis:.13, spd:.05, def:.20, arm:.10 },
    SS:  { con:.24, pod:.14, dis:.12, spd:.14, def:.26, arm:.10 },
    LF:  { con:.28, pod:.32, dis:.16, spd:.10, def:.10, arm:.04 },
    CF:  { con:.26, pod:.20, dis:.14, spd:.20, def:.16, arm:.04 },
    RF:  { con:.26, pod:.32, dis:.14, spd:.09, def:.11, arm:.08 },
    DH:  { con:.30, pod:.44, dis:.20, spd:.02, def:.00, arm:.04 }
  };

  const ATTR_LABELS = {
    con:'Contacto', pod:'Poder', dis:'Disciplina', spd:'Velocidad', def:'Defensa', arm:'Brazo',
    vel:'Recta', ctl:'Control', mov:'Movimiento', res:'Resistencia', men:'Frialdad'
  };

  /* ---------------------------------------------------------------------
     PREMIOS Y TÍTULOS  (weight = puntos para la valoración final)
     --------------------------------------------------------------------- */
  const AWARDS = {
    WS:      { key:'WS',      label:'Serie Mundial',          icon:'🏆', weight:70  },
    WSMVP:   { key:'WSMVP',   label:'MVP de Serie Mundial',   icon:'🥇', weight:55  },
    PENNANT: { key:'PENNANT', label:'Campeonato de Liga',     icon:'🎖️', weight:26  },
    DIV:     { key:'DIV',     label:'Título de división',     icon:'📌', weight:8   },
    MVP:     { key:'MVP',     label:'MVP',                    icon:'👑', weight:80  },
    CY:      { key:'CY',      label:'Cy Young',               icon:'🎯', weight:80  },
    ROY:     { key:'ROY',     label:'Novato del Año',         icon:'🌱', weight:26  },
    GG:      { key:'GG',      label:'Guante de Oro',          icon:'🧤', weight:16  },
    SS:      { key:'SS',      label:'Bate de Plata',          icon:'🏏', weight:18  },
    AS:      { key:'AS',      label:'Juego de Estrellas',     icon:'⭐', weight:9   },
    HRK:     { key:'HRK',     label:'Líder de jonrones',      icon:'💥', weight:22  },
    AVGK:    { key:'AVGK',    label:'Título de bateo',        icon:'📈', weight:22  },
    RBIK:    { key:'RBIK',    label:'Líder de remolcadas',    icon:'🚚', weight:18  },
    ERAK:    { key:'ERAK',    label:'Líder de efectividad',   icon:'🧊', weight:22  },
    SOK:     { key:'SOK',     label:'Líder de ponches',       icon:'🔥', weight:20  },
    SVK:     { key:'SVK',     label:'Líder de salvamentos',   icon:'🔒', weight:18  },
    TC:      { key:'TC',      label:'Triple Corona',          icon:'♛',  weight:120 },
    NPBWS:   { key:'NPBWS',   label:'Serie de Japón',         icon:'🏯', weight:32  },
    KBOWS:   { key:'KBOWS',   label:'Serie Coreana',          icon:'🐯', weight:26  },
    OTHERWS: { key:'OTHERWS', label:'Título de liga',         icon:'🏅', weight:16  },
    WBC:     { key:'WBC',     label:'Clásico Mundial',        icon:'🌎', weight:40  },
    OLY:     { key:'OLY',     label:'Oro olímpico',           icon:'🏵️', weight:34  },
    NOHIT:   { key:'NOHIT',   label:'Juego sin hits',         icon:'🚫', weight:30  },
    PERFECT: { key:'PERFECT', label:'Juego perfecto',         icon:'💎', weight:70  },
    CYCLE:   { key:'CYCLE',   label:'Bateó para el ciclo',    icon:'🔄', weight:22  },
    HR4:     { key:'HR4',     label:'4 jonrones en un juego', icon:'🎆', weight:34  },
    K20:     { key:'K20',     label:'20 ponches en un juego', icon:'⚡', weight:34  },
    COMEBACK:{ key:'COMEBACK',label:'Regreso del Año',        icon:'🩹', weight:14  },
    HOF:     { key:'HOF',     label:'Salón de la Fama',       icon:'🏛️', weight:150 },
    RETIRED: { key:'RETIRED', label:'Número retirado',        icon:'🎽', weight:45  }
  };

  /* ---------------------------------------------------------------------
     NOMBRES DE PILA por región
     --------------------------------------------------------------------- */
  const FIRST_NAMES = {
    latino: ['Ángel','Juan','Luis','Carlos','José','Miguel','Rafael','Pedro','Wilmer','Yordan','Ronald','Julio','Eugenio','Salvador','Framber','Jeimer','Randy','Elvis','Gleyber','Marcell','Adolis','Nelson','Sandy','Emilio','Fermín','Ozzie','Yulieski','Andrés','Teoscar','Jhonny'],
    anglo:  ['Michael','James','Tyler','Brandon','Cody','Aaron','Bryce','Trevor','Austin','Corey','Dylan','Spencer','Bobby','Nolan','Hunter','Kyle','Jared','Blake','Chase','Wyatt','Garrett','Riley','Cole','Grant','Elliot','Bryan'],
    jp:     ['Shohei','Yu','Kenta','Masahiro','Seiya','Yoshinobu','Hideki','Kazuo','Daisuke','Tomoyuki','Munetaka','Roki','Kodai','Haruto','Sota','Takumi'],
    kr:     ['Ji-ho','Min-jun','Seo-jun','Do-yun','Ha-jun','Eun-woo','Sung-min','Hyun-woo','Jung-ho','Ji-hoon','Tae-yang','Woo-jin'],
    tw:     ['Wei-Chung','Chien-Ming','Cheng-Wei','Yu-Cheng','Chih-Hsien','Kuo-Hui','Tzu-Hsuan','Hao-Yu'],
    euro:   ['Lucas','Marco','Thomas','Andreas','Pieter','Nikolas','Matteo','Sven','Erik','Daniel','Ivan','Adrian','Noah','Leon','Tobias']
  };
  const NAME_REGION = {
    DO:'latino', VE:'latino', CU:'latino', PR:'latino', MX:'latino', PA:'latino', CO:'latino',
    NI:'latino', CW:'latino', AW:'latino', BR:'latino', AR:'latino', ES:'latino', CR:'latino',
    GT:'latino', HN:'latino', SV:'latino', EC:'latino', PE:'latino', CL:'latino', PT:'latino',
    US:'anglo', CA:'anglo', AU:'anglo', NZ:'anglo', GB:'anglo', BS:'anglo', JM:'anglo',
    TT:'anglo', ZA:'anglo', IL:'anglo', PH:'anglo', IN:'anglo',
    JP:'jp', KR:'kr', TW:'tw', CN:'tw'
  };

  /* ---------------------------------------------------------------------
     APODOS (se desbloquean según el rendimiento)
     --------------------------------------------------------------------- */
  const NICKNAMES = {
    power:   ['El Cañón','El Martillo','La Bestia','Rompecercas','El Titán','La Grúa'],
    contact: ['El Metrónomo','Mister Hit','La Máquina','El Relojero','Línea Recta'],
    speed:   ['El Rayo','Turbo','El Correcaminos','Pies de Viento'],
    glove:   ['La Aspiradora','El Muro','Guante Negro','El Pulpo'],
    ace:     ['El As','El Verdugo','Doctor K','El Cirujano','Brazo de Hierro'],
    closer:  ['El Candado','Apagafuegos','El Sepulturero','Última Palabra'],
    clutch:  ['Mr. Octubre','El Elegido','Sangre Fría','El Héroe'],
    journey: ['El Viajero','El Mercenario','Sin Fronteras']
  };

  /* ---------------------------------------------------------------------
     ESCALAFÓN FINAL
     --------------------------------------------------------------------- */
  const TIERS = [
    { min:0,    key:'cantera',     label:'Promesa trunca',       desc:'La carrera se apagó antes de encenderse del todo.' },
    { min:90,   key:'profesional', label:'Profesional',          desc:'Viviste del béisbol. No es poco: casi nadie llega.' },
    { min:260,  key:'titular',     label:'Titular consolidado',  desc:'Tu nombre estuvo en la alineación durante años.' },
    { min:620,  key:'allstar',     label:'Todo Estrella',        desc:'Uno de los mejores de tu generación en tu puesto.' },
    { min:1200, key:'estrella',    label:'Superestrella',        desc:'Vendiste entradas y camisetas. Cara de la liga.' },
    { min:2000, key:'icono',       label:'Ícono',                desc:'Una franquicia entera se explica con vos adentro.' },
    { min:3100, key:'leyenda',     label:'Leyenda',              desc:'Los que te vieron jugar se lo cuentan a sus nietos.' },
    { min:4400, key:'inmortal',    label:'Inmortal',             desc:'Discusión seria entre los cinco mejores de la historia.' }
  ];

  const PACES = [
    { id:'intensa', name:'Intensa', every:1, desc:'Una decisión por temporada. La carrera completa, sin atajos.', mins:'6-9 min' },
    { id:'normal',  name:'Normal',  every:2, desc:'Una decisión cada dos temporadas. El equilibrio justo.',       mins:'4-6 min' },
    { id:'expres',  name:'Exprés',  every:3, desc:'Una decisión cada tres temporadas. Carrera entera en un café.', mins:'2-4 min' }
  ];

  global.DATA = {
    LEAGUES, WINTER, CLUBS, CLUB_BY_ID, byLeague,
    COUNTRIES, COUNTRY_BY_CODE, POSITIONS, POS_BY_ID, POS_WEIGHTS, ATTR_LABELS,
    AWARDS, FIRST_NAMES, NAME_REGION, NICKNAMES, TIERS, PACES
  };
})(window);
