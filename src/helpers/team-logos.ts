export const teamLogos: Record<string, string> = {
  Arsenal: '/logos/arsenal-footballlogos-org.svg',
  'Aston Villa': '/logos/aston-villa-footballlogos-org.svg',
  Bournemouth: '/logos/bournemouth-footballlogos-org.svg',
  Brentford: '/logos/brentford-footballlogos-org.svg',
  Brighton: '/logos/brighton-hove-footballlogos-org.svg',
  Burnley: '/logos/burnley-footballlogos-org.svg',
  Chelsea: '/logos/chelsea-footballlogos-org.svg',
  'Crystal Palace': '/logos/crystal-palace-footballlogos-org.svg',
  Everton: '/logos/everton-footballlogos-org.svg',
  Fulham: '/logos/fulham-footballlogos-org.svg',
  Leeds: '/logos/leeds-united-footballlogos-org.svg',
  Liverpool: '/logos/liverpool-fc-footballlogos-org.svg',
  'Man City': '/logos/manchester-city-footballlogos-org.svg',
  'Man Utd': '/logos/manchester-united-footballlogos-org.svg',
  Newcastle: '/logos/newcastle-united-footballlogos-org.svg',
  "Nott'm Forest": '/logos/nottingham-forest-footballlogos-org.svg',
  Sunderland: '/logos/sunderland-footballlogos-org.svg',
  Spurs: '/logos/tottenham-hotspur-footballlogos-org.svg',
  'West Ham': '/logos/west-ham-united-footballlogos-org.svg',
  Wolves: '/logos/wolverhampton-wanderers-footballlogos-org.svg',
};

export function getTeamLogo(teamName: string): string | undefined {
  return teamLogos[teamName];
}
