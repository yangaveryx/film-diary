import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../constants/api';

const Home: React.FC = () => {
  const [movies, setMovies] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPopular = async () => {
      try {
        const res = await fetch(`${API_BASE}/movies/popular`);
        const data = await res.json();
        setMovies(data.results || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadPopular();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/movies/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowResults(true);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="hero">
        <div className="container hero-content fade-up">
          <p className="hero-eyebrow">Your personal cinema</p>
          <h1 className="hero-title">Track every film<br />you've <em>ever watched</em></h1>
          <p className="hero-sub">Log movies, write reviews, and build your watchlist — all in one place.</p>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Search for a film…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      <div className="container">
        {showResults && (
          <section className="section fade-up">
            <h2 className="section-title">Results <span>for "{searchQuery}"</span></h2>
            <div className="status-bar">
              <span className="status-dot"></span>
              <span>{searchResults.length} results found</span>
            </div>
            <div className="movie-grid">
              {searchResults.length ? (
                searchResults.map(m => (
                  <Link key={m.id} to={`/movie/${m.id}`} className="movie-card">
                    <div className="movie-poster">
                      {m.posterUrl ? (
                        <img src={m.posterUrl} alt={m.title} />
                      ) : (
                        <div className="movie-poster-placeholder">🎬</div>
                      )}
                    </div>
                    <div className="movie-title">{m.title}</div>
                    <div className="movie-year">{m.year || m.releaseDate?.slice(0, 4) || '—'}</div>
                  </Link>
                ))
              ) : (
                <p style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  No results found for "{searchQuery}".
                </p>
              )}
            </div>
          </section>
        )}

        <section className="section fade-up">
          <h2 className="section-title">Popular Right Now <span>Trending</span></h2>
          <div className="status-bar">
            <span className="status-dot"></span>
            <span>{movies.length ? 'Loaded from server' : 'Loading…'}</span>
          </div>
          <div className="movie-grid">
            {movies.length ? (
              movies.map(m => (
                <Link key={m.id} to={`/movie/${m.id}`} className="movie-card">
                  <div className="movie-poster">
                    {m.posterUrl ? (
                      <img src={m.posterUrl} alt={m.title} />
                    ) : (
                      <div className="movie-poster-placeholder">🎬</div>
                    )}
                  </div>
                  <div className="movie-title">{m.title}</div>
                  <div className="movie-year">{m.year || m.releaseDate?.slice(0, 4) || '—'}</div>
                </Link>
              ))
            ) : (
              <p style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Loading popular movies…
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Home;
