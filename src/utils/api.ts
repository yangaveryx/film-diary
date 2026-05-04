import { getIdToken } from '../auth/firebase';
import { API_BASE } from '../constants/api';

async function request(method: string, path: string, body: any = null) {
  const token = await getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data;
}

export const api = {
  searchMovies: (q: string) => request('GET', `/movies/search?q=${encodeURIComponent(q)}`),
  getPopular: () => request('GET', '/movies/popular'),
  getMovie: (id: string) => request('GET', `/movies/${id}`),

  getUserReviews: (userId: string) => request('GET', `/users/${userId}/reviews`),
  getReviews: (movieId: string) => request('GET', `/reviews/${movieId}`),
  postReview: (movieId: string, movieTitle: string, rating: number, reviewText: string, poster: string) =>
    request('POST', '/reviews', { movieId, movieTitle, rating, reviewText, poster }),
  updateReview: (reviewId: string, rating: number, reviewText: string) =>
    request('PUT', `/reviews/${reviewId}`, { rating, reviewText }),
  deleteReview: (reviewId: string) => request('DELETE', `/reviews/${reviewId}`),

  getWatchlist: (userId: string) => request('GET', `/watchlist/${userId}`),
  addToWatchlist: (movieId: string, movieTitle: string, poster: string) =>
    request('POST', '/watchlist', { movieId, movieTitle, poster }),
  removeWatchlist: (userId: string, movieId: string) =>
    request('DELETE', `/watchlist/${userId}/${movieId}`),
};
