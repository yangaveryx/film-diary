import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from '../auth/firebase';
import { api } from '../utils/api';
import Toast from '../components/Toast';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const loadData = async (uid: string) => {
    try {
      const data = await api.getUserReviews(uid);
      setReviews(data.reviews || []);
    } catch (err) { 
      console.error(err);
      setReviews([]); 
    }
    try {
      const wdata = await api.getWatchlist(uid);
      setWatchlist(wdata.watchlist || []);
    } catch (err) { 
      console.error(err);
      setWatchlist([]); 
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(async u => {
      setUser(u);
      if (u) {
        setLoading(true);
        await loadData(u.uid);
      } else {
        setReviews([]);
        setWatchlist([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const openEdit = (review: any) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditText(review.reviewText || '');
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setEditLoading(true);
    try {
      await api.updateReview(editingReview.id, editRating, editText);
      setMessage('Review updated!');
      setEditingReview(null);
      if (user) await loadData(user.uid);
    } catch (err: any) {
      setMessage(err.message || 'Failed to update review');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.deleteReview(reviewId);
      setMessage('Review deleted!');
      if (user) await loadData(user.uid);
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete review');
    }
  };

  const handleRemoveFromWatchlist = async (movieId: string, movieTitle: string) => {
    if (!user) return;
    try {
      await api.removeWatchlist(user.uid, movieId);
      setMessage(`Removed "${movieTitle}" from watchlist`);
      if (user) await loadData(user.uid);
    } catch (err: any) {
      setMessage(err.message || 'Failed to remove from watchlist');
    }
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      {message && <Toast message={message} onClose={() => setMessage(null)} />}
      {!user ? (
        <div>
          <h1 className="section-title">Guest</h1>
          <p>
            <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link> to view your profile
          </p>
        </div>
      ) : (
        <div>
          <h1 className="section-title">{user.email?.split('@')[0] || user.uid}</h1>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <>
              <section style={{ marginBottom: 40 }}>
                <h2 className="section-title">Diary ({reviews.length})</h2>
                <div className="log-list">
                  {reviews.length ? (
                    reviews.map(r => (
                      <div key={r.id} className="log-entry">
                        <div className="log-poster">
                          {r.poster ? <img src={r.poster} alt={r.movieTitle} /> : '🎬'}
                        </div>
                        <div className="log-info">
                          <div className="log-title">{r.movieTitle}</div>
                          <div className="stars" style={{ marginTop: 4 }}>
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <span key={i} className="star filled">★</span>
                            ))}
                          </div>
                          {r.reviewText && <div className="log-review">{r.reviewText}</div>}
                        </div>
                        <div className="log-actions">
                          <button onClick={() => openEdit(r)} className="btn btn-ghost">Edit</button>
                          <button onClick={() => handleDeleteReview(r.id)} className="btn btn-danger">Delete</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No diary entries yet.</p>
                    </div>
                  )}
                </div>
              </section>
              <section>
                <h2 className="section-title">Watchlist ({watchlist.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 16 }}>
                  {watchlist.length ? (
                    watchlist.map(w => (
                      <div key={w.id} style={{ position: 'relative' }}>
                        <Link to={`/movie/${w.movieId}`} className="movie-card">
                          <div className="movie-poster">
                            {w.poster ? (
                              <img src={w.poster} alt={w.movieTitle} />
                            ) : (
                              <div className="movie-poster-placeholder">🎬</div>
                            )}
                          </div>
                          <div className="movie-title">{w.movieTitle}</div>
                        </Link>
                        <button
                          onClick={() => handleRemoveFromWatchlist(w.movieId, w.movieTitle)}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                      <p>No watchlist items yet.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {editingReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius)', maxWidth: 500, width: '90%' }}>
            <h3>Edit "{editingReview.movieTitle}"</h3>
            <form onSubmit={handleUpdateReview} style={{ marginTop: 20 }}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Rating (1-5)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRating(r)}
                      className="star"
                      style={{
                        fontSize: '1.5rem',
                        color: r <= editRating ? 'var(--accent)' : 'var(--border)',
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
                <label>Review</label>
                <textarea value={editText} onChange={e => setEditText(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={editLoading} className="btn btn-primary">
                  {editLoading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditingReview(null)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Profile;
