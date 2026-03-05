const TEAM_NAME_ALIASES: Record<string, string> = {
  'Brighton and Hove Albion': 'Brighton',
  'Leeds United': 'Leeds',
  'Manchester City': 'Man City',
  'Manchester United': 'Man Utd',
  'Newcastle United': 'Newcastle',
  'Nottingham Forest': "Nott'm Forest",
  'Tottenham Hotspur': 'Spurs',
  'West Ham United': 'West Ham',
  'Wolverhampton Wanderers': 'Wolves',
};

export const normaliseTeamName = (name: string): string => TEAM_NAME_ALIASES[name] ?? name;
