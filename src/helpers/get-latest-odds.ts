import { getSecret } from 'astro:env/server';
import axios, { type AxiosError } from 'axios';
import type { OddsMarket } from './process-odds';

export async function getLatestOdds(
  commenceTimeFrom: string,
  commenceTimeTo: string,
): Promise<OddsMarket[]> {
  const apiKey = getSecret('ODDS_API_KEY');
  const regions = 'uk';
  const markets = 'h2h,totals';
  const oddsFormat = 'decimal';
  const dateFormat = 'iso';
  const includeLinks = true;
  const includeSids = true;
  const includeBetLimits = true;
  const includeRotationNumbers = true;
  const oddsSport = 'soccer_epl';
  const requestUrl = `https://api.the-odds-api.com/v4/sports/${oddsSport}/odds`;

  try {
    const response = await axios.get(requestUrl, {
      params: {
        apiKey,
        regions,
        markets,
        oddsFormat,
        dateFormat,
        commenceTimeFrom,
        commenceTimeTo,
        includeLinks,
        includeSids,
        includeBetLimits,
        includeRotationNumbers,
      },
    });

    console.log({
      'Remaining requests': response.headers['x-requests-remaining'],
      'Used requests': response.headers['x-requests-used'],
      'Usage cost of request': response.headers['x-requests-last'],
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.log('Error status', axiosError.response?.status);
    console.log(axiosError.response?.data);
    return [];
  }
}
