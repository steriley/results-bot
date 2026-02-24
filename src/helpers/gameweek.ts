/**
 * FPL Gameweek Fixtures
 *
 * Fetches fixtures for a given gameweek, enriched with team names from
 * the bootstrap-static endpoint.
 *
 * NOTE ON CACHING:
 * - bootstrap-static data (teams, players, settings) changes infrequently.
 *   Consider caching it in a database or in-memory store and refreshing
 *   once per day at most.
 * - Fixtures for *past* gameweeks are immutable once finished.
 *   They are ideal candidates to persist to a database so you never
 *   need to hit the FPL API for them again.
 * - Fixtures for *future/live* gameweeks should always be fetched fresh.
 */

import type { GameweekFixture } from '@/types/gameweek';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FplTeam {
  id: number;
  name: string;
  short_name: string;
}

interface FplBootstrapStatic {
  teams: FplTeam[];
}

interface FplFixture {
  event: number; // gameweek number
  kickoff_time: string | null;
  team_h: number; // home team id
  team_a: number; // away team id
  finished: boolean;
  finished_provisional: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

/**
 * Fetches team data from the bootstrap-static endpoint.
 *
 * CACHE RECOMMENDATION: Store the returned team map in a database or
 * long-lived cache (e.g. Redis with a 24-hour TTL). It only changes
 * when FPL updates team information, which is rare mid-season.
 */
async function fetchTeamMap(): Promise<Map<number, string>> {
  const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch bootstrap-static: ${response.status}`);
  }

  const data: FplBootstrapStatic = await response.json();

  return new Map(data.teams.map((team) => [team.id, team.name]));
}

/**
 * Fetches fixtures for a specific gameweek.
 *
 * CACHE RECOMMENDATION: If `finished` is true for all returned fixtures,
 * the data is immutable — persist it to a database keyed by gameweek number
 * so future calls skip this fetch entirely.
 */
async function fetchGameweekFixtures(gameWeek: number): Promise<FplFixture[]> {
  const response = await fetch(`${FPL_BASE_URL}/fixtures/?event=${gameWeek}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures for gameweek ${gameWeek}: ${response.status}`);
  }

  return response.json();
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Returns enriched fixture data for a given gameweek number.
 *
 * @param gameWeek - The FPL gameweek number (1–38)
 * @returns An array of GameweekFixture objects with team names and scores
 */
export async function getGameweekFixtures(gameWeek: number): Promise<GameweekFixture[]> {
  const [teamMap, fixtures] = await Promise.all([fetchTeamMap(), fetchGameweekFixtures(gameWeek)]);

  return fixtures.map((fixture) => {
    const homeTeam = teamMap.get(fixture.team_h) ?? `Team ${fixture.team_h}`;
    const awayTeam = teamMap.get(fixture.team_a) ?? `Team ${fixture.team_a}`;

    // Only include a finalScore when the match is finished and scores exist
    const finalScore =
      fixture.finished ||
      (fixture.finished_provisional &&
        fixture.team_h_score !== null &&
        fixture.team_a_score !== null)
        ? { homeTeam: fixture.team_h_score, awayTeam: fixture.team_a_score }
        : null;

    return {
      gameWeek: fixture.event,
      commenceTime: fixture.kickoff_time,
      homeTeam,
      awayTeam,
      finished: fixture.finished || fixture.finished_provisional,
      finalScore,
    };
  });
}
