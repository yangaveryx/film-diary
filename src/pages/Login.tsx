import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, createUser, onAuthStateChanged } from '../auth/firebase';
import Toast from '../components/Toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        setTimeout(() => navigate('/profile'), 500);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (isRegister) {
        await createUser(email, password);
        setMessage('Account created — signed in');
      } else {
        await signIn(email, password);
        setMessage('Signed in');
      }
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setMessage(err?.message || 'Authentication error');
    }
  };

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 className="section-title">{isRegister ? 'Register' : 'Sign In'}</h1>
        {message && <Toast message={message} onClose={() => setMessage(null)} />}
        {user ? (
          <div>
            <p>Signed in as {user.email || user.uid}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>
        )}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setIsRegister(v => !v)}
            className="btn btn-ghost"
          >
            {isRegister ? 'Have an account? Sign in' : 'No account? Register'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Login;
