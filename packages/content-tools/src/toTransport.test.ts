import { describe, expect, it } from 'vitest';
import { csvRows } from './gtfs/csv.ts';
import { toTransportNetwork, type CuratedStation, type GtfsFiles } from './toTransport.ts';

/**
 * A feed small enough to read, shaped like the RTA's: a metro line with a platform per
 * direction at every station, a bus loop that runs one way round, a marine route we do not
 * carry, and a calendar where only some services run on a Monday.
 */
const FEED: GtfsFiles = {
  'routes.txt': [
    'route_id,agency_id,route_short_name,route_long_name,route_type',
    '"r-red","1","MRed","","1"',
    '"r-8","1","8","","3"',
    '"r-boat","1","FR1","Al Ghubaiba MTS - Marina","4"',
  ].join('\n'),
  'stops.txt': [
    'stop_id,stop_name,stop_lat,stop_lon',
    '"13601","BurJuman Metro Station 1","25.2550","55.3040"',
    '"13602","BurJuman Metro Station 2","25.2552","55.3042"',
    '"13701","ADCB Metro Station 1","25.2450","55.2980"',
    '"13702","ADCB Metro Station 2","25.2452","55.2982"',
    '"13801","max Metro Station 1","25.2350","55.2920"',
    '"13802","max Metro Station 2","25.2352","55.2922"',
    '"100001","Gold Souq Bus Station 1","25.2759","55.3024"',
    '"200001","Deira,  Fish Roundabout 1","25.2704","55.3189"',
    '"300001","Union Square 1","25.2660","55.3116"',
    '"900001","Al Ghubaiba Marine Transport Station 1","25.2640","55.2890"',
  ].join('\n'),
  'calendar.txt': [
    'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
    '"WK","1","1","1","1","0","0","1","20210909","20211231"',
    '"FR","0","0","0","0","1","0","0","20210909","20211231"',
  ].join('\n'),
  'trips.txt': [
    'route_id,service_id,trip_id,direction_id,trip_headsign',
    '"r-red","WK","red-1","0","EXPO Metro Station"',
    '"r-red","WK","red-2","0","EXPO Metro Station"',
    '"r-red","WK","red-3","0","EXPO Metro Station"',
    '"r-red","WK","red-back","1","centrepoint Metro Station"',
    '"r-red","FR","red-friday","0","EXPO Metro Station"',
    '"r-8","WK","bus-1","0","Gold Souq Bus Stn"',
    '"r-8","WK","bus-2","0","Gold Souq Bus Stn"',
    '"r-boat","WK","boat-1","0","Marina"',
  ].join('\n'),
  'stop_times.txt': [
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
    '"red-1","05:00:00","05:00:00","13601","1"',
    '"red-1","05:02:00","05:02:00","13701","2"',
    '"red-1","05:04:00","05:04:00","13801","3"',
    '"red-2","08:00:00","08:00:00","13601","1"',
    '"red-2","08:02:00","08:02:00","13701","2"',
    '"red-2","08:04:00","08:04:00","13801","3"',
    '"red-3","08:04:00","08:04:00","13601","1"',
    '"red-3","08:06:00","08:06:00","13701","2"',
    '"red-3","08:09:00","08:09:00","13801","3"',
    '"red-back","25:10:00","25:10:00","13802","1"',
    '"red-back","25:12:00","25:12:00","13702","2"',
    '"red-back","25:14:00","25:14:00","13602","3"',
    '"red-friday","09:00:00","09:00:00","13601","1"',
    '"red-friday","09:02:00","09:02:00","13701","2"',
    '"red-friday","09:04:00","09:04:00","13801","3"',
    '"bus-1","06:00:00","06:00:00","100001","1"',
    '"bus-1","06:05:00","06:05:00","200001","2"',
    '"bus-1","06:12:00","06:12:00","300001","3"',
    '"bus-1","06:20:00","06:20:00","100001","4"',
    '"bus-2","22:00:00","22:00:00","100001","1"',
    '"bus-2","22:05:00","22:05:00","200001","2"',
    '"bus-2","22:12:00","22:12:00","300001","3"',
    '"bus-2","22:20:00","22:20:00","100001","4"',
    '"boat-1","07:00:00","07:00:00","900001","1"',
    '"boat-1","07:20:00","07:20:00","300001","2"',
  ].join('\n'),
};

const STATIONS: readonly CuratedStation[] = [
  {
    id: 'burjuman',
    mode: 'metro',
    name: { en: 'BurJuman', hi: 'बुरजुमान', aliases: ['बुर्जुमान'] },
    location: { lat: 25.2551, lng: 55.3041 },
  },
  {
    id: 'al-jafiliya',
    mode: 'metro',
    name: { en: 'Al Jafiliya', hi: 'अल जाफ़िलिया', aliases: ['max'] },
    location: { lat: 25.2351, lng: 55.2921 },
  },
  {
    id: 'bus-gold-souq',
    mode: 'bus',
    name: { en: 'Gold Souq Bus Station', hi: 'गोल्ड सूक बस स्टेशन', aliases: [] },
    location: { lat: 25.2, lng: 55.2 },
    stopId: '100001',
  },
];

const OPTIONS = {
  contentVersion: 2,
  publishedAt: '2026-09-16T00:00:00Z',
  stations: STATIONS,
  walkingMetresPerMinute: 75,
  waitSeconds: { metro: 240, bus: 600 },
};

const pack = toTransportNetwork(FEED, OPTIONS);

describe('the RTA feed becomes the pack रास्ता reads', () => {
  it("collapses a station's platforms into one node, named as the sign says", () => {
    const ids = pack.nodes.map((node) => node.id);
    expect(ids).toContain('burjuman');
    expect(ids).toContain('al-jafiliya');
    expect(ids).toContain('metro-adcb');
    expect(ids.filter((id) => id.includes('adcb'))).toHaveLength(1);
    const jafiliya = pack.nodes.find((node) => node.id === 'al-jafiliya');
    expect(jafiliya?.name.hi).toBe('अल जाफ़िलिया');
    expect(jafiliya?.location.lat).toBeCloseTo(25.2351, 3);
  });

  it('keeps a bus stop as the RTA signs it, English on both sides, by its own id', () => {
    const fish = pack.nodes.find((node) => node.id === 's200001');
    expect(fish?.name).toEqual({
      en: 'Deira, Fish Roundabout 1',
      hi: 'Deira, Fish Roundabout 1',
      aliases: [],
    });
    expect(pack.nodes.find((node) => node.id === 'bus-gold-souq')?.name.hi).toBe(
      'गोल्ड सूक बस स्टेशन',
    );
    expect(pack.nodes.some((node) => node.id === 's100001')).toBe(false);
  });

  it('carries every hop in the direction it runs, and never mirrors a one-way loop', () => {
    const bus = pack.edges.filter((edge) => edge.line === '8').map((edge) => edge.id);
    expect(bus).toEqual([
      '8:bus-gold-souq:s200001',
      '8:s200001:s300001',
      '8:s300001:bus-gold-souq',
    ]);
    const red = pack.edges.filter((edge) => edge.line === 'red');
    expect(
      red.map((edge) => `${edge.fromNodeId}>${edge.toNodeId}/${String(edge.direction)}`),
    ).toEqual([
      'al-jafiliya>metro-adcb/1',
      'burjuman>metro-adcb/0',
      'metro-adcb>al-jafiliya/0',
      'metro-adcb>burjuman/1',
    ]);
  });

  it('times a hop by the median run, and quotes first and last departure at the stop, weekdays', () => {
    const hop = pack.edges.find((edge) => edge.id === 'red:metro-adcb:al-jafiliya');
    expect(hop?.durationSeconds).toBe(120);
    expect(hop?.firstDeparture).toBe('05:02');
    // The Friday-only 09:00 trip does not move the weekday window.
    expect(hop?.lastDeparture).toBe('08:06');
    const loop = pack.edges.find((edge) => edge.id === '8:s300001:bus-gold-souq');
    expect(loop?.firstDeparture).toBe('06:12');
    expect(loop?.lastDeparture).toBe('22:12');
  });

  it('wraps a departure after midnight onto the clock', () => {
    const back = pack.edges.find((edge) => edge.id === 'red:al-jafiliya:metro-adcb');
    expect(back?.firstDeparture).toBe('01:10');
    expect(back?.lastDeparture).toBe('01:10');
  });

  it('measures the daytime headway per line and names where each direction goes', () => {
    const red = pack.lines.find((line) => line.id === 'red');
    expect(red?.mode).toBe('metro');
    expect(red?.name.hi).toBe('रेड लाइन');
    expect(red?.headwaySeconds).toBe(240);
    expect(red?.towards).toEqual([
      { en: 'EXPO', hi: 'EXPO' },
      { en: 'centrepoint', hi: 'centrepoint' },
    ]);
    const bus = pack.lines.find((line) => line.id === '8');
    expect(bus?.name).toEqual({ en: 'Bus 8', hi: 'बस 8', aliases: ['8'] });
    expect(bus?.towards?.[0]).toEqual({ en: 'Gold Souq', hi: 'Gold Souq' });
  });

  it('leaves out what the app has no mode for, and stops nothing calls at', () => {
    expect(pack.lines.some((line) => line.id === 'FR1')).toBe(false);
    expect(pack.nodes.some((node) => node.id === 's900001')).toBe(false);
    for (const edge of pack.edges) {
      expect(
        pack.nodes.some((node) => node.id === edge.fromNodeId),
        edge.id,
      ).toBe(true);
      expect(
        pack.nodes.some((node) => node.id === edge.toNodeId),
        edge.id,
      ).toBe(true);
    }
  });

  it('says where it came from and whose data it is', () => {
    expect(pack.contentVersion).toBe(2);
    expect(pack.attribution).toContain('Roads and Transport Authority');
    expect(pack.source).toContain('rta_gtfs-open');
  });
});

describe('the shapes a newer feed may take', () => {
  it('finds the weekday services from calendar_dates.txt when there is no calendar.txt', () => {
    const feed: GtfsFiles = {
      ...FEED,
      'calendar.txt': '',
      'calendar_dates.txt': [
        'service_id,date,exception_type',
        // 2026-01-26 is a Monday, 2026-01-27 a Tuesday, 2026-01-31 a Saturday.
        '"WK","20260126","1"',
        '"WK","20260127","1"',
        '"FR","20260131","1"',
      ].join('\n'),
    };
    const hop = toTransportNetwork(feed, OPTIONS).edges.find(
      (edge) => edge.id === 'red:metro-adcb:al-jafiliya',
    );
    expect(hop?.lastDeparture).toBe('08:06');
  });

  it('expands a frequency window into the departures it stands for', () => {
    const feed: GtfsFiles = {
      ...FEED,
      'frequencies.txt': [
        'trip_id,start_time,end_time,headway_secs',
        '"red-1","05:00:00","06:00:00","600"',
        '"red-1","20:00:00","23:00:00","900"',
      ].join('\n'),
    };
    const hop = toTransportNetwork(feed, OPTIONS).edges.find(
      (edge) => edge.id === 'red:metro-adcb:al-jafiliya',
    );
    // ADCB is two minutes into the trip: the last window departure 22:45 boards ADCB at 22:47.
    expect(hop?.firstDeparture).toBe('05:02');
    expect(hop?.lastDeparture).toBe('22:47');
  });
});

describe("reading the feed's CSV", () => {
  it('keeps commas and quotes inside a quoted field, and drops a byte-order mark', () => {
    const rows = csvRows(
      '﻿stop_id,stop_name\r\n"1","Deira, ""Fish"" Roundabout"\r\n"2","Plain"\r\n\r\n',
    );
    expect(rows).toEqual([
      { stop_id: '1', stop_name: 'Deira, "Fish" Roundabout' },
      { stop_id: '2', stop_name: 'Plain' },
    ]);
  });
});
