require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { db, auth } = require("./firebase");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// TMDB configuration
const TMDB_TOKEN = process.env.TMDB_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

async function tmdb(endpoint) {
  if (!TMDB_TOKEN) {
    throw new Error("TMDB token is missing. Set TMDB_TOKEN in .env");
  }
  const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }
  try {
    req.user = await auth.verifyIdToken(header.split(" ")[1]);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid auth token" });
  }
}

// GET: search movies by title
app.get("/api/movies/search", async (req, res) => {
  const { q } = req.query;
  try {
    const data = await tmdb(`/search/movie?language=en-US&query=${encodeURIComponent(q)}&page=1`);
    const movies = data.results.map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      releaseDate: m.release_date,
      posterUrl: m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null,
    }));
    res.json({ results: movies });
  } catch (e) {
    res.status(500).json({ error: "Failed to search movies" });
  }
});

// GET: fetch a list of popular/trending movies
app.get("/api/movies/popular", async (req, res) => {
  try {
    const data = await tmdb("/movie/popular?language=en-US&page=1");
    const movies = data.results.map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      releaseDate: m.release_date,
      posterUrl: m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null,
    }));
    res.json({ results: movies });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

// GET: get details for a single movie
app.get("/api/movies/:id", async (req, res) => {
  try {
    const m = await tmdb(`/movie/${req.params.id}?language=en-US&append_to_response=credits`);
    res.json({
      id:       m.id,
      title:    m.title,
      tagline:  m.tagline,
      overview: m.overview,
      year:     m.release_date?.slice(0, 4),
      runtime:  m.runtime ? `${m.runtime} min` : null,
      genres:   m.genres?.map(g => g.name) ?? [],
      poster:   m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`   : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      director: m.credits?.crew?.find(c => c.job === "Director")?.name ?? "—",
      cast:     m.credits?.cast?.slice(0, 5).map(c => c.name) ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

// GET: get all reviews for a specific movie
app.get("/api/reviews/:movieId", async (req, res) => {
  try {
    const snapshot = await db.collection("reviews")
      .where("movieId", "==", req.params.movieId)
      .get();
    const reviews = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bMs - aMs;
      });
    res.json({ reviews });
  } catch (e) {
    console.error("Failed to fetch reviews:", e.message);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET: get all reviews for a specific user (diary entries)
app.get("/api/users/:userId/reviews", async (req, res) => {
  try {
    const snapshot = await db.collection("reviews")
      .where("userId", "==", req.params.userId)
      .get();
    const reviews = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bMs - aMs;
      });
    res.json({ reviews });
  } catch (e) {
    console.error("Failed to fetch user reviews:", e.message);
    res.status(500).json({ error: "Failed to fetch user reviews" });
  }
});

// POST: submit a new review for a movie
app.post("/api/reviews", requireAuth, async (req, res) => {
  const { movieId, movieTitle, rating, reviewText, poster } = req.body;
  if (!movieId || !rating) {
    return res.status(400).json({ error: "Missing movieId and rating" });
  }
  try {
    const existing = await db.collection("reviews")
      .where("movieId", "==", movieId)
      .where("userId", "==", req.user.uid)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: "You already reviewed this film, edit your existing review instead." });
    }
    const newReview = await db.collection("reviews").add({
      movieId,
      movieTitle: movieTitle ?? "",
      poster: poster ?? null,
      userId:     req.user.uid,
      username:   req.user.email?.split("@")[0] ?? "anonymous",
      rating:     Number(rating),
      reviewText: reviewText ?? "",
      createdAt:  new Date(),
    });
    res.status(201).json({ id: newReview.id, message: "Review saved" });
  } catch (e) {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// PUT: edit an existing review (only the owner can edit)
app.put("/api/reviews/:reviewId", requireAuth, async (req, res) => {
  const { rating, reviewText } = req.body;
  if (!rating) {
    return res.status(400).json({ error: "Missing rating" });
  }
  try {
    const reviewRef = db.collection("reviews").doc(req.params.reviewId);
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (reviewDoc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "You can only edit your own reviews" });
    }
    await reviewRef.update({
      rating:     Number(rating),
      reviewText: reviewText ?? "",
      updatedAt:  new Date(),
    });
    res.json({ message: "Review updated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update review" });
  }
});

// DELETE: delete a review (only the owner can delete)
app.delete("/api/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    const reviewRef = db.collection("reviews").doc(req.params.reviewId);
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (reviewDoc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }
    await reviewRef.delete();
    res.json({ message: "Review deleted" });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// GET: get all watchlist entries for a user
app.get("/api/watchlist/:userId", async (req, res) => {
  try {
    const snapshot = await db.collection("watchlist")
      .where("userId", "==", req.params.userId)
      .get();
    const watchlist = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aMs = a.addedAt?.toDate ? a.addedAt.toDate().getTime() : 0;
        const bMs = b.addedAt?.toDate ? b.addedAt.toDate().getTime() : 0;
        return bMs - aMs;
      });
    res.json({ watchlist });
  } catch (e) {
    console.error("Failed to fetch watchlist:", e.message);
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// POST: add a movie to the user's watchlist
app.post("/api/watchlist", requireAuth, async (req, res) => {
  const { movieId, movieTitle, poster } = req.body;
  if (!movieId) {
    return res.status(400).json({ error: "Missing movieId" });
  }
  try {
    const existing = await db.collection("watchlist")
      .where("movieId", "==", movieId)
      .where("userId", "==", req.user.uid)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: "This movie is already in your watchlist." });
    }
    const newEntry = await db.collection("watchlist").add({
      userId: req.user.uid,
      movieId,
      movieTitle: movieTitle ?? "",
      poster: poster ?? null,
      addedAt: new Date(),
    });
    res.status(201).json({ id: newEntry.id, message: "Added to watchlist" });
  } catch (e) {
    res.status(500).json({ error: "Failed to add to watchlist" });
  }
});

// DELETE: remove a movie from the user's watchlist
app.delete("/api/watchlist/:userId/:movieId", requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection("watchlist")
      .where("userId", "==", req.user.uid)
      .where("movieId", "==", req.params.movieId)
      .get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "Movie not found in watchlist" });
    }
    await Promise.all(snapshot.docs.map(d => d.ref.delete()));
    res.json({ message: "Removed from watchlist" });
  } catch (e) {
    res.status(500).json({ error: "Failed to remove from watchlist" });
  }
});

// catch-all route to serve React for non-API requests
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}\n`);
});
