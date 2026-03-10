import type { Types } from 'mongoose';
import { Match } from '@/db/model/Match.model';
import { User } from '@/db/model/User.model';
import { UserPrediction } from '@/db/model/UserPrediction.model';

// ─── Constants ────────────────────────────────────────────────────────────────

const POINTS = {
  CORRECT_SCORE: 10,
  CORRECT_RESULT: 3,
} as const;

const RESULTS_BOT = {
  USER_ID: '666',
  NAME: 'Results Bot',
} as const;

// ─── Public Types ─────────────────────────────────────────────────────────────

export type TimeFilter = 'weekly' | 'monthly' | 'all-time';
export type SortField = 'totalPoints' | 'performance' | 'correctScores';

export interface LeagueTableEntry {
  userId: string;
  userName: string;
  played: number;
  correctResults: number;
  correctScores: number;
  performance: number;
  totalPoints: number;
}

export interface GetLeagueTableOptions {
  timeFilter: TimeFilter;
  sortBy: SortField;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface UserPredictionAggregation {
  _id: Types.ObjectId;
  played: number;
  correctScores: number;
  correctResults: number;
  totalPoints: number;
}

interface LeanUser {
  _id: Types.ObjectId;
  name?: string;
}

interface LeanMatch {
  _id: Types.ObjectId;
  score: number;
}

// ─── Date Filters ─────────────────────────────────────────────────────────────

function getFromDate(timeFilter: TimeFilter): Date | null {
  if (timeFilter === 'all-time') return null;

  const now = new Date();

  if (timeFilter === 'weekly') {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return date;
  }

  const date = new Date(now);
  date.setMonth(now.getMonth() - 1);
  return date;
}

function buildDateMatch(timeFilter: TimeFilter): Record<string, unknown> {
  const fromDate = getFromDate(timeFilter);
  if (!fromDate) return {};
  return { createdAt: { $gte: fromDate } };
}

function buildMatchDateFilter(timeFilter: TimeFilter): Record<string, unknown> {
  const fromDate = getFromDate(timeFilter);
  if (!fromDate) return {};
  return { commenceTime: { $gte: fromDate } };
}

// ─── User Predictions Aggregation ────────────────────────────────────────────

async function getPredictionStatsByUser(
  timeFilter: TimeFilter,
): Promise<UserPredictionAggregation[]> {
  return UserPrediction.aggregate<UserPredictionAggregation>([
    { $match: buildDateMatch(timeFilter) },
    {
      $lookup: {
        from: 'matches',
        localField: 'matchId',
        foreignField: '_id',
        as: 'matchDetails',
      },
    },
    { $unwind: '$matchDetails' },
    {
      $match: { 'matchDetails.isComplete': true },
    },
    {
      $group: {
        _id: '$userId',
        played: { $sum: 1 },
        correctScores: {
          $sum: { $cond: [{ $eq: ['$score', POINTS.CORRECT_SCORE] }, 1, 0] },
        },
        correctResults: {
          $sum: { $cond: [{ $eq: ['$score', POINTS.CORRECT_RESULT] }, 1, 0] },
        },
        totalPoints: { $sum: '$score' },
      },
    },
  ]);
}

// ─── Results Bot Stats ────────────────────────────────────────────────────────

async function getResultsBotEntry(timeFilter: TimeFilter): Promise<LeagueTableEntry | null> {
  const completedMatches = await Match.find({
    isComplete: true,
    score: { $ne: null },
    ...buildMatchDateFilter(timeFilter),
  })
    .select('_id score')
    .lean<LeanMatch[]>();

  if (completedMatches.length === 0) return null;

  const played = completedMatches.length;
  const correctScores = completedMatches.filter((m) => m.score === POINTS.CORRECT_SCORE).length;
  const correctResults = completedMatches.filter((m) => m.score === POINTS.CORRECT_RESULT).length;
  const totalPoints = completedMatches.reduce((sum, m) => sum + m.score, 0);

  return {
    userId: RESULTS_BOT.USER_ID,
    userName: RESULTS_BOT.NAME,
    played,
    correctScores,
    correctResults,
    performance: calculatePerformance(played, totalPoints),
    totalPoints,
  };
}

// ─── User Name Lookup ─────────────────────────────────────────────────────────

async function getUserNameMap(userIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id name')
    .lean<LeanUser[]>();

  return new Map(users.map((u) => [u._id.toString(), u.name ?? 'Unknown']));
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

function calculatePerformance(played: number, totalPoints: number): number {
  if (played === 0) return 0;
  const maxPoints = played * POINTS.CORRECT_SCORE;
  return Math.round((totalPoints / maxPoints) * 1000) / 10;
}

function buildLeagueEntry(
  aggregation: UserPredictionAggregation,
  userName: string,
): LeagueTableEntry {
  const { _id, played, correctScores, correctResults, totalPoints } = aggregation;

  return {
    userId: _id.toString(),
    userName,
    played,
    correctResults,
    correctScores,
    performance: calculatePerformance(played, totalPoints),
    totalPoints,
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

const SORT_COMPARATORS: Record<SortField, (a: LeagueTableEntry, b: LeagueTableEntry) => number> = {
  totalPoints: (a, b) => b.totalPoints - a.totalPoints,
  performance: (a, b) => b.performance - a.performance,
  correctScores: (a, b) => b.correctScores - a.correctScores,
};

// ─── Main Function ────────────────────────────────────────────────────────────

export async function getLeagueTable(options: GetLeagueTableOptions): Promise<LeagueTableEntry[]> {
  const { timeFilter, sortBy } = options;

  const [aggregations, botEntry] = await Promise.all([
    getPredictionStatsByUser(timeFilter),
    getResultsBotEntry(timeFilter),
  ]);

  const userIds = aggregations.map((a) => a._id);
  const userNameMap = await getUserNameMap(userIds);

  const userEntries = aggregations.map((aggregation) => {
    const userName = userNameMap.get(aggregation._id.toString()) ?? 'Unknown';
    return buildLeagueEntry(aggregation, userName);
  });

  const allEntries = botEntry ? [...userEntries, botEntry] : userEntries;

  return allEntries.sort(SORT_COMPARATORS[sortBy]);
}
