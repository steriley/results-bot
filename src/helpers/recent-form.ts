import { Match } from '@/db/model/Match.model';

type Result = 'W' | 'L' | 'D';

interface LastResult {
  opponent: string;
  homeScore: number;
  awayScore: number;
  wasHome: boolean;
  commenceTime: Date;
  result: Result;
}

interface TeamForm {
  team: string;
  lastFive: LastResult[];
}

function getResult(wasHome: boolean, homeScore: number, awayScore: number): Result {
  if (homeScore === awayScore) return 'D';
  if (wasHome) return homeScore > awayScore ? 'W' : 'L';
  return awayScore > homeScore ? 'W' : 'L';
}

export async function getRecentForm(team: string): Promise<TeamForm> {
  const matches = await Match.find({
    $or: [{ homeTeam: team }, { awayTeam: team }],
    isComplete: true,
  })
    .sort({ commenceTime: -1 })
    .limit(5)
    .lean();

  const lastFive: LastResult[] = matches.map((match) => {
    const wasHome = match.homeTeam === team;

    return {
      opponent: wasHome ? match.awayTeam : match.homeTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      wasHome,
      commenceTime: match.commenceTime,
      result: getResult(wasHome, match.homeScore, match.awayScore),
    };
  });

  return { team, lastFive };
}
