import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import { api } from '../utils/api';
import { onAuthStateChanged } from '../auth/firebase';
import Toast from '../components/Toast';

const Movie: React.FC = () => {
  const { id: movieId } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!movieId) return;
    fetch(`${API_BASE}/movies/${movieId}`)
      .then(res => res.json())
      .then(data => setMovie(data))
      .catch(() => setMovie(null));
  }, [movieId]);

  useEffect(() => {
    if (!movieId) return;
    (async () => {
      try {
        const data = await api.getReviews(movieId);
        setReviews(data.reviews || []);
      } catch {
        setReviews([]);
      }
    })();
  }, [movieId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !movieId || !movie) return;
    setLoading(true);
    try {
      await api.postReview(movieId, movie.title, rating, reviewText, movie.poster || '');
      setMessage('Review logged!');
      setReviewText('');
      setRating(5);
      setShowModal(false);
      // remove from watchlist after logging
      try {
        await api.removeWatchlist(user.uid, movieId);
      } catch (err) {
        // Silently ignore if not in watchlist
      }
      const data = await api.getReviews(movieId);
      setReviews(data.reviews || []);
    } catch (err: any) {
      setMessage(err.message || 'Failed to log review');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWatchlist = async () => {
    if (!user || !movieId || !movie) return;
    try {
      await api.addToWatchlist(movieId, movie.title, movie.poster || '');
      setMessage('Added to watchlist!');
    } catch (err: any) {
      setMessage(err.message || 'Failed to add to watchlist');
    }
  };

  if (!movieId) return <div className="container" style={{ padding: '40px 24px' }}>No movie selected</div>;
  if (!movie) return <div className="container" style={{ padding: '40px 24px' }}>Loading…</div>;

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      {message && <Toast message={message} onClose={() => setMessage(null)} />}
      <Link to="/" style={{ marginBottom: 12, display: 'inline-block', color: 'var(--accent)' }}>← Back</Link>
      <h1 style={{ marginTop: 12 }}>{movie.title}</h1>
      <div style={{ display: 'flex', gap: 32, marginBottom: 40, marginTop: 24 }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="movie-poster" style={{ aspectRatio: '2/3' }}>
            {movie.poster ? (
              <img src={movie.poster} alt={movie.title} />
            ) : (
              <div className="movie-poster-placeholder">🎬</div>
            )}
          </div>
        </div>
        <div>
          <p style={{ fontStyle: 'italic', color: 'var(--muted)', marginBottom: 12 }}>{movie.tagline}</p>
          <div style={{ marginBottom: 20 }}>{movie.overview}</div>
          <p style={{ marginBottom: 8 }}><strong>Director:</strong> {movie.director}</p>
          <p style={{ marginBottom: 24 }}><strong>Cast:</strong> {(movie.cast || []).join(', ')}</p>
          
          {user ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">Log this film</button>
              <button onClick={handleAddWatchlist} className="btn btn-secondary">Add to watchlist</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>Sign in to log this film</Link>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius)', maxWidth: 500, width: '90%' }}>
            <h3>Log "{movie.title}"</h3>
            <form onSubmit={handleReviewSubmit} style={{ marginTop: 20 }}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Rating (1-5)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRating(r)}
                      className="star"
                      style={{
                        fontSize: '1.5rem',
                        color: r <= rating ? 'var(--accent)' : 'var(--border)',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        padding: 0,
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Review (optional)</label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 className="section-title">Reviews ({reviews.length})</h2>
        {reviews.length ? reviews.map(r => (
          <div key={r.id} style={{ padding: 12, border: '1px solid var(--border)', marginBottom: 12, borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: 600 }}>{r.user}</div>
            <div className="stars" style={{ marginTop: 4 }}>
              {Array.from({ length: r.rating }).map((_, i) => (
                <span key={i} className="star filled">★</span>
              ))}
            </div>
            {r.reviewText && <div style={{ marginTop: 8 }}>{r.reviewText}</div>}
          </div>
        )) : <p style={{ color: 'var(--muted)' }}>No reviews yet.</p>}
      </section>
    </main>
  );
};

export default Movie;
