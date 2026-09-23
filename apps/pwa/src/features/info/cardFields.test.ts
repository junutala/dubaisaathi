import { describe, expect, it } from 'vitest';
import { cardFields, type CardLine } from './cardFields.js';

/**
 * Every fixture here is what the phone's reader actually returned for a card — the misreads,
 * the Arabic turned into confetti, two columns merged into one line — not what the card says.
 * A parser tested on clean text is tested on a card nobody photographs.
 *
 * The heights are the reader's own line heights in pixels, rounded; the name is set largest.
 */
function read(text: string, heights: Record<number, number> = {}): CardLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line, index) => ({ text: line, height: heights[index] ?? 20 }));
}

describe('reading a hotel card into its fields', () => {
  it('takes the name the hotel gave its own website, not the manager standing under it', () => {
    const lines = read(
      `@)
      AL WASMI RESIDENCE
      UAL crawl] G29
      Priya Nair
      Front Office Manager
      T +971 4 335 7210 | M+971 50 612 4481 | F +971 4 335 7211
      frontoffice@alwasmiresidence.ae www.alwasmiresidence.ae
      Street 14A, Al Karama - P.O. Box 12345, Dubai, UAE`,
      { 1: 44, 3: 26 },
    );
    expect(cardFields(lines)).toEqual({
      name: 'Al Wasmi Residence',
      phone: '+971 4 335 7210',
      address: 'Street 14A, Al Karama, Dubai',
    });
  });

  it('survives a photographed card: the web address split across two lines, the fax unspaced', () => {
    const lines = read(
      `AL WASMI RESIDENCE
      Ay away] (9x9
      Priya Nair
      Front Office Manager
      T +971 4 335 7210 | M+971 50 612 4481 | F +971 43357211
      frontoffice@alwasmiresidence.ae www.
      alwasmiresidence.ae
      Street 14A, Al Karama -
      P.O. Box 12345, Dubai, UAE`,
      { 0: 44 },
    );
    const fields = cardFields(lines);
    expect(fields.name).toBe('Al Wasmi Residence');
    expect(fields.phone).toBe('+971 4 335 7210');
    expect(fields.address).toBe('Street 14A, Al Karama, Dubai');
  });

  it('splits two columns read as one line, and finishes the name from the domain', () => {
    // The name sat in the left column and the street in the right; the reader joined them.
    const lines = read(
      `Arvind Kulkarni
      Front Office Manager
      T +971 (4) 355 1200
      M +971 55 903 2716
      F +971 (4) 355 1299
      E fom@saffroncresthotel.com
      W www-saffroncresthotel.com
      Saffron Crest Khalid Bin Al Waleed Road, Bur Dubai
      HOTEL P.O. Box 116082, Dubai, United Arab Emirates`,
    );
    expect(cardFields(lines)).toEqual({
      name: 'Saffron Crest Hotel',
      phone: '+971 4 355 1200',
      address: 'Khalid Bin Al Waleed Road, Bur Dubai',
    });
  });

  it('joins a name to the line under it when that line is only the kind of hotel', () => {
    const lines = read(
      `Marjan Pearl
      HOTEL APARTMENTS
      adaiall Joe ulese gam
      Fatima Al Hashimi
      Front Office Manager
      T +971 4 440 8800
      M +971 52 118 6034
      F +971 4 440 8801
      reception@marjanpearl.ae
      www.marjanpearl.ae
      Building 18, Discovery Gardens
      P.O. Box 50871, Dubai, UAE`,
      { 0: 40, 1: 22 },
    );
    expect(cardFields(lines)).toEqual({
      name: 'Marjan Pearl Hotel Apartments',
      phone: '+971 4 440 8800',
      address: 'Building 18, Discovery Gardens, Dubai',
    });
  });

  it('reads a Tel:/Mob:/Fax: card and a domain that says what kind of hotel it is', () => {
    const lines = read(
      `RIGGA PALM
      Tel: +971 4 268 0455
      Mob: +971 56 774 1290
      Fax: +971 4 268 0456
      Mohammed Irfan
      Front Office Manager
      frontdesk@riggapalminn.com
      www.riggapalminn.com
      Al Rigga Road, Deira
      P.O. Box 23761, Dubai, UAE`,
      { 0: 48 },
    );
    expect(cardFields(lines)).toEqual({
      name: 'Rigga Palm Inn',
      phone: '+971 4 268 0455',
      address: 'Al Rigga Road, Deira, Dubai',
    });
  });

  it("reads the owner's own card from Al Rigga, sideways photograph and all", () => {
    // घर.1 on the owner's phone, 23 September: the back of a real card, read as the reader
    // reads it — Arabic above, the legal form after the name, the P.O. Box first on its line.
    const lines = read(
      `شقق الصبطبير الفندقية ذ.م.م
      SABTBIR HOTEL APARTMENTS L.L.C
      Tel: 04 258 6682
      Fax: 04 215 6900
      reservations@sabtbirhotelapts.com
      P.O. Box 184184, 23D St, Al Rigga, Dubai, UAE`,
      { 1: 30 },
    );
    expect(cardFields(lines)).toEqual({
      name: 'Sabtbir Hotel Apartments',
      phone: '+971 4 258 6682',
      address: '23D St, Al Rigga, Dubai',
    });
  });

  it('leaves the name empty rather than guess the manager when nothing says which line it is', () => {
    const lines = read(
      `Priya Nair
      On nager
      714335 720
      MASINY OSKIONCE Be
      345. Dubai, UAE`,
    );
    expect(cardFields(lines).name).toBeUndefined();
  });

  it('does not guess the name from the size of the print alone', () => {
    // On 23 September the largest line on a photographed dark card was wood grain read as
    // "f eee oe aay Ps ae es ee". Without the domain or a hotel word, the box stays empty.
    const lines = read(
      `GOLDEN DUNES
      Ravi Menon
      Guest Relations
      +971 4 222 3333`,
      { 0: 50 },
    );
    expect(cardFields(lines).name).toBeUndefined();
  });

  it('never takes the confetti of a misread photograph for a name', () => {
    const lines = read(
      `f eee oe aay Ps ae es ee
      Motel APARtmMeNnr
      seception@marianpeari ae`,
      { 0: 60 },
    );
    expect(cardFields(lines).name).toBeUndefined();
  });

  it('says the kind of hotel once, when both the domain and the next line say it', () => {
    const lines = read(
      `Saffron Crest
      HOTEL
      www.saffroncresthotel.com`,
    );
    expect(cardFields(lines).name).toBe('Saffron Crest Hotel');
  });

  it('leaves the name empty when two lines could each be it', () => {
    const lines = read(
      `Palm Heights Hotel
      Sister property of Golden Sands Residence`,
    );
    expect(cardFields(lines).name).toBeUndefined();
  });

  it('fills the desk with a Dubai landline and nothing else — not a fax, a mobile or a P.O. Box', () => {
    // A mobile is the manager, off duty at midnight; a fax answers nobody. An empty box the
    // traveller types into is better than a number that rings the wrong phone.
    const lines = read(
      `Fax: +971 4 268 0456
      P.O. Box 23761
      Licence 654321
      Mobile +971 50 111 2222`,
    );
    expect(cardFields(lines).phone).toBeUndefined();
  });

  it('prefers the number labelled as the telephone over another Dubai landline', () => {
    const lines = read(`Reservations 04 111 2222 | Tel 04 335 7210`);
    expect(cardFields(lines).phone).toBe('+971 4 335 7210');
  });

  it('dials a number printed the local way, with a leading 0 or no code at all', () => {
    expect(cardFields(read('Tel 04 335 7210')).phone).toBe('+971 4 335 7210');
    expect(cardFields(read('Phone: 00971 4 335 7210')).phone).toBe('+971 4 335 7210');
    expect(cardFields(read('T 335 7210')).phone).toBe('+971 4 335 7210');
    // Another emirate's code on a Dubai card is a misread 4, and a toll-free line is not the desk.
    expect(cardFields(read('T +971 6 335 7210')).phone).toBeUndefined();
    expect(cardFields(read('T 800 4663')).phone).toBeUndefined();
  });

  it('keeps the labels of numbers out of the address when two columns are read as one', () => {
    const lines = read(
      `Mob: +971 56 774 1290   Al Rigga Road, Deira
      Fax: +971 4 268 0456 - Dubai
      F   Building 18, Discovery Gardens`,
    );
    expect(cardFields(lines).address).toBe(
      'Al Rigga Road, Deira, Building 18, Discovery Gardens, Dubai',
    );
  });

  it('knows a fax by its label however long the label is', () => {
    expect(cardFields(read('Fax No.: 04 111 2222 | Telephone: 04 335 7210')).phone).toBe(
      '+971 4 335 7210',
    );
    expect(cardFields(read('Facsimile: 04 111 2222')).phone).toBeUndefined();
    expect(cardFields(read('Tel.: 04 335 7210')).phone).toBe('+971 4 335 7210');
  });

  it('never makes a Dubai number out of seven bare digits nobody labelled a telephone', () => {
    expect(cardFields(read('Plot 3456789, Al Quoz')).phone).toBeUndefined();
    expect(cardFields(read('Licence 7654321')).phone).toBeUndefined();
  });

  it('keeps the street when the hotel is named after it', () => {
    const lines = read(
      `AL RIGGA HOTEL
      www.alriggahotel.com
      Al Rigga Road, Deira`,
    );
    expect(cardFields(lines)).toMatchObject({
      name: 'Al Rigga Hotel',
      address: 'Al Rigga Road, Deira, Dubai',
    });
  });

  it('keeps street names with hyphens, apostrophes and ordinals', () => {
    expect(cardFields(read('Al-Rigga Road, Deira')).address).toBe('Al-Rigga Road, Deira, Dubai');
    expect(cardFields(read("2nd Street, Za'abeel Road")).address).toBe(
      "2nd Street, Za'abeel Road, Dubai",
    );
  });

  it('never takes a landmark in the address for the hotel', () => {
    const lines = read(
      `Near Clock Tower
      Opp. BurJuman Tower, Bur Dubai`,
    );
    expect(cardFields(lines).name).toBeUndefined();
    expect(cardFields(lines).address).toContain('Clock Tower');
  });

  it("takes the card's own name over a chain's brand", () => {
    const lines = read(
      `ROTANA
      Al Bandar Rotana - Dubai Creek
      www.rotana.com`,
    );
    expect(cardFields(lines).name).toBe('Al Bandar Rotana');
  });

  it('finds nothing on a card it could not read, and says nothing rather than guessing', () => {
    expect(cardFields(read('RE CH Se ene:\n#\n#\ni\nSER\nribealoneic'))).toEqual({});
    expect(cardFields([])).toEqual({});
  });
});
