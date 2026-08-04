import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error') || params.get('error_description');

    if (error) {
      toast.error(error);
      navigate('/login', { replace: true });
      return;
    }

    if (!accessToken) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    window.localStorage.setItem('akaleta_token', accessToken);
    if (refreshToken) {
      window.localStorage.setItem('akaleta_refresh', refreshToken);
    }

    toast.success('Signed in with Google successfully');
    navigate('/app/dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Completing Google sign-in...</h1>
            <p className="auth-subtitle">Please wait while we redirect you to your dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
