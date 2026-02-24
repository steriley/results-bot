import { atom } from 'nanostores';

export const $gameweek = atom<number>(27);
export const $lastGameweek = atom<number>(38);

export function $setGameweek(gameweek: number) {
  const nextGameweek = $gameweek.value + gameweek;
  if (nextGameweek >= 1 && nextGameweek <= $lastGameweek.value) {
    $gameweek.set(nextGameweek);
  }
}
