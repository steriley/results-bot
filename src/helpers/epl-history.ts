/**
 * FPL Historical Fixture Fetcher
 *
 * Sources:
 *   - Historical seasons (2021-22 to 2023-24):
 *       vaastav/Fantasy-Premier-League GitHub archive
 *       https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League
 *         /master/data/{season}/gws/merged_gw.csv
 *
 *   - Current season (2025-26):
 *       FPL API — bootstrap-static (teams + finished gameweeks)
 *                — fixtures (scores for completed fixtures)
 *       https://fantasy.premierleague.com/api/bootstrap-static/
 *       https://fantasy.premierleague.com/api/fixtures/
 *
 * Team names in the vaastav CSV use display labels (e.g. "Man Utd", "Spurs").
 * Both sources normalise to canonical FPL names via bootstrap-static.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FplTeam {
  id: number;
  name: string;
  short_name: string;
}

interface FplEvent {
  id: number;
  finished: boolean;
}

interface FplBootstrapResponse {
  teams: FplTeam[];
  events: FplEvent[];
}

interface FplFixture {
  kickoff_time: string | null;
  finished: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  event: number | null; // gameweek — null for unscheduled fixtures
}

/** Only the columns we need from vaastav's merged_gw.csv */
interface MergedGwRow {
  team: string;
  opponent_team: string;
  was_home: string;
  team_h_score: string;
  team_a_score: string;
  kickoff_time: string;
}

export interface Fixture {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

const VAASTAV_BASE = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data';

const ARCHIVE_SEASONS = ['2021-22', '2022-23', '2023-24', '2024-25'] as const;
const CURRENT_SEASON = '2025-26' as const;

export type ArchiveSeason = (typeof ARCHIVE_SEASONS)[number];
export type Season = ArchiveSeason | typeof CURRENT_SEASON;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching: ${url}`);
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching: ${url}`);
  return response.text();
}

// ---------------------------------------------------------------------------
// Team name normalisation
// ---------------------------------------------------------------------------

/**
 * Known display labels used in the vaastav CSV that don't match the FPL
 * name or short_name fields. Extend if new mismatches appear.
 */
const CSV_ALIASES: Record<string, string> = {
  'Man Utd': 'Manchester United',
  'Man City': 'Manchester City',
  Spurs: 'Tottenham Hotspur',
  "Nott'm Forest": 'Nottingham Forest',
  Newcastle: 'Newcastle United',
  Brighton: 'Brighton and Hove Albion',
  'Brighton & Hove Albion': 'Brighton and Hove Albion',
  Wolves: 'Wolverhampton Wanderers',
  'Sheffield Utd': 'Sheffield United',
  'West Brom': 'West Bromwich Albion',
  Luton: 'Luton Town',
};

function buildNormalisationMap(fplTeams: FplTeam[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const team of fplTeams) {
    map.set(team.name, team.name);
    map.set(team.short_name, team.name);
  }

  for (const [alias, canonical] of Object.entries(CSV_ALIASES)) {
    if (!map.has(alias)) map.set(alias, canonical);
  }

  return map;
}

function resolveTeamName(raw: string, normMap: Map<string, string>): string {
  return normMap.get(raw) ?? raw;
}

// ---------------------------------------------------------------------------
// Archive season fetching (vaastav CSV)
// ---------------------------------------------------------------------------

function getColumnIndex(headers: string[], column: string): number {
  const idx = headers.indexOf(column);
  if (idx === -1) throw new Error(`Column "${column}" not found in CSV`);
  return idx;
}

function parseMergedGwCsv(csvText: string): MergedGwRow[] {
  const [headerLine, ...dataLines] = csvText.trim().split('\n');
  const headers = headerLine.split(',');

  const cols = {
    team: getColumnIndex(headers, 'team'),
    opponent_team: getColumnIndex(headers, 'opponent_team'),
    was_home: getColumnIndex(headers, 'was_home'),
    team_h_score: getColumnIndex(headers, 'team_h_score'),
    team_a_score: getColumnIndex(headers, 'team_a_score'),
    kickoff_time: getColumnIndex(headers, 'kickoff_time'),
  };

  return dataLines.map((line) => {
    const c = line.split(',');
    return {
      team: c[cols.team].trim(),
      opponent_team: c[cols.opponent_team].trim(),
      was_home: c[cols.was_home].trim(),
      team_h_score: c[cols.team_h_score].trim(),
      team_a_score: c[cols.team_a_score].trim(),
      kickoff_time: c[cols.kickoff_time].trim(),
    };
  });
}

function buildFixturesFromCsv(rows: MergedGwRow[], normMap: Map<string, string>): Fixture[] {
  const seen = new Set<string>();
  const fixtures: Fixture[] = [];

  for (const row of rows) {
    if (row.was_home !== 'True') continue;

    const homeGoals = parseInt(row.team_h_score, 10);
    const awayGoals = parseInt(row.team_a_score, 10);
    if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) continue;

    const key = `${row.kickoff_time}|${row.team}`;
    if (seen.has(key)) continue;
    seen.add(key);

    fixtures.push({
      date: new Date(row.kickoff_time),
      homeTeam: resolveTeamName(row.team, normMap),
      awayTeam: resolveTeamName(row.opponent_team, normMap),
      homeGoals,
      awayGoals,
    });
  }

  return fixtures;
}

async function fetchArchiveSeasonFixtures(
  season: ArchiveSeason,
  normMap: Map<string, string>,
): Promise<Fixture[]> {
  const url = `${VAASTAV_BASE}/${season}/gws/merged_gw.csv`;
  const csv = await fetchText(url);
  const rows = parseMergedGwCsv(csv);
  return buildFixturesFromCsv(rows, normMap);
}

// ---------------------------------------------------------------------------
// Current season fetching (FPL API)
// ---------------------------------------------------------------------------

function buildFixturesFromFplApi(
  fplFixtures: FplFixture[],
  teamIdToName: Map<number, string>,
): Fixture[] {
  return fplFixtures
    .filter(
      (f): f is FplFixture & { kickoff_time: string; team_h_score: number; team_a_score: number } =>
        f.finished && f.kickoff_time !== null && f.team_h_score !== null && f.team_a_score !== null,
    )
    .map((f) => ({
      date: new Date(f.kickoff_time),
      homeTeam: teamIdToName.get(f.team_h) ?? `Team ${f.team_h}`,
      awayTeam: teamIdToName.get(f.team_a) ?? `Team ${f.team_a}`,
      homeGoals: f.team_h_score,
      awayGoals: f.team_a_score,
    }));
}

async function fetchCurrentSeasonFixtures(bootstrap: FplBootstrapResponse): Promise<Fixture[]> {
  const teamIdToName = new Map(bootstrap.teams.map((t) => [t.id, t.name]));

  const fplFixtures = await fetchJson<FplFixture[]>(`${FPL_BASE_URL}/fixtures/`);

  return buildFixturesFromFplApi(fplFixtures, teamIdToName);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ALL_SEASONS: Season[] = [...ARCHIVE_SEASONS, CURRENT_SEASON];

/**
 * Fetches completed fixtures for the given seasons with team names normalised
 * to canonical FPL names. Defaults to all supported seasons including the
 * current 2025-26 season.
 *
 * @param seasons Seasons to fetch. Defaults to all supported seasons.
 * @returns Fixtures sorted chronologically.
 */
export async function fetchFplFixtures(seasons: Season[] = ALL_SEASONS): Promise<Fixture[]> {
  const bootstrap = await fetchJson<FplBootstrapResponse>(`${FPL_BASE_URL}/bootstrap-static/`);
  const normMap = buildNormalisationMap(bootstrap.teams);

  const archiveSeasons = seasons.filter((s): s is ArchiveSeason =>
    (ARCHIVE_SEASONS as readonly string[]).includes(s),
  );
  const includeCurrentSeason = seasons.includes(CURRENT_SEASON);

  const [archiveFixtures, currentFixtures] = await Promise.all([
    Promise.all(archiveSeasons.map((s) => fetchArchiveSeasonFixtures(s, normMap))),
    includeCurrentSeason ? fetchCurrentSeasonFixtures(bootstrap) : Promise.resolve([]),
  ]);

  return [...archiveFixtures.flat(), ...currentFixtures].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}
