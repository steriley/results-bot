import { getSecret } from 'astro:env/server';
import axios, { type AxiosError } from 'axios';

export async function getLatestOdds(): Promise<any[]> {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const apiKey = getSecret('ODDS_API_KEY');
  const regions = 'uk';
  const markets = 'h2h,totals';
  const oddsFormat = 'decimal';
  const dateFormat = 'iso';
  const commenceTimeFrom = now.toISOString().split('.')[0] + 'Z';
  const commenceTimeTo =
    new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('.')[0] + 'Z';
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
  }
}
