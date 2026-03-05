import type {
  BookmakerSnapshot,
  EngineConfig,
  RawBookmaker,
  RawFixture,
  RawMarket,
  RawOutcome,
  ThreeWayOdds,
  TotalsOdds,
} from './types';

function findOutcome(outcomes: RawOutcome[], name: string): RawOutcome | undefined {
  return outcomes.find((o) => o.name === name);
}

function parseH2H(market: RawMarket, homeTeam: string, awayTeam: string): ThreeWayOdds | null {
  const home = findOutcome(market.outcomes, homeTeam);
  const away = findOutcome(market.outcomes, awayTeam);
  const draw = findOutcome(market.outcomes, 'Draw');

  if (!home || !away || !draw) return null;

  return { home: home.price, draw: draw.price, away: away.price };
}

function parseTotals(market: RawMarket): TotalsOdds | null {
  const over = findOutcome(market.outcomes, 'Over');
  const under = findOutcome(market.outcomes, 'Under');

  if (!over || !under || over.point === undefined) return null;

  return { line: over.point, over: over.price, under: under.price };
}

function parseBookmaker(
  bookmaker: RawBookmaker,
  homeTeam: string,
  awayTeam: string,
  config: EngineConfig,
): BookmakerSnapshot {
  let h2h: ThreeWayOdds | null = null;
  let h2hLay: ThreeWayOdds | null = null;
  let totals: TotalsOdds | null = null;

  for (const market of bookmaker.markets) {
    if (market.key === 'h2h') {
      h2h = parseH2H(market, homeTeam, awayTeam);
    } else if (market.key === 'h2h_lay') {
      h2hLay = parseH2H(market, homeTeam, awayTeam);
    } else if (market.key === 'totals') {
      totals = parseTotals(market);
    }
  }

  return {
    bookmakerKey: bookmaker.key,
    bookmakerTitle: bookmaker.title,
    lastUpdate: new Date(bookmaker.last_update),
    isExchange: config.exchangeBookmakerKeys.includes(bookmaker.key),
    isSharp: config.sharpBookmakerKeys.includes(bookmaker.key),
    h2h,
    h2hLay,
    totals,
  };
}

export function parseFixtureSnapshots(
  fixtures: RawFixture[],
  config: EngineConfig,
): Map<string, BookmakerSnapshot[]> {
  const result = new Map<string, BookmakerSnapshot[]>();

  for (const fixture of fixtures) {
    const existing = result.get(fixture.id) ?? [];

    for (const bookmaker of fixture.bookmakers) {
      existing.push(parseBookmaker(bookmaker, fixture.home_team, fixture.away_team, config));
    }

    result.set(fixture.id, existing);
  }

  return result;
}

/**
 * Merge bookmakers across multiple time-stamped JSON files.
 * Deduplicates by bookmaker key + last_update so the full
 * timeline is preserved for odds movement analysis.
 */
export function mergeRawFixtures(fileContents: RawFixture[][]): RawFixture[] {
  const fixtureMap = new Map<string, RawFixture>();

  for (const fileFixtures of fileContents) {
    for (const fixture of fileFixtures) {
      const existing = fixtureMap.get(fixture.id);

      if (!existing) {
        fixtureMap.set(fixture.id, structuredClone(fixture));
        continue;
      }

      for (const incoming of fixture.bookmakers) {
        const alreadyPresent = existing.bookmakers.some(
          (b) => b.key === incoming.key && b.last_update === incoming.last_update,
        );
        if (!alreadyPresent) {
          existing.bookmakers.push(incoming);
        }
      }
    }
  }

  return Array.from(fixtureMap.values());
}
