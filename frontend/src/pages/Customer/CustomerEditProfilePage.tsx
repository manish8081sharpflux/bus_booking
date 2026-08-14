import { FormEvent, useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { arrowBackOutline, checkmarkCircleOutline, personOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './CustomerEditProfilePage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type Profile = {
  displayName?: string;
  fullName?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

export default function CustomerEditProfilePage() {
  const history = useHistory();
  const token = localStorage.getItem('customer_access_token');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) {
      history.replace('/login?returnTo=/profile/edit');
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();

        if (!response.ok || body.success === false) {
          throw new Error(body.message || 'Unable to load profile.');
        }

        const user: Profile = body.user || body.data?.user || body.data || {};
        setName(user.displayName || user.fullName || user.name || '');
        setEmail(user.email || '');
        setMobile(user.phone || user.mobile || '');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [history, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: name,
          email,
        }),
      });

      const body = await response.json();

      if (!response.ok || body.success === false) {
        throw new Error(body.message || 'Unable to update profile.');
      }

      localStorage.setItem('customer_profile', JSON.stringify(body.user));
      localStorage.setItem('customer', JSON.stringify(body.user));
      setSaved(true);

      window.setTimeout(() => {
        history.replace('/profile');
      }, 700);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="customer-edit-shell">
          <main className="customer-edit-card">
            <button
              type="button"
              className="customer-edit-back"
              onClick={() => history.replace('/profile')}
            >
              <IonIcon icon={arrowBackOutline} />
              Back to profile
            </button>

            <div className="customer-edit-heading">
              <span className="customer-edit-icon">
                <IonIcon icon={personOutline} />
              </span>

              <div>
                <span className="customer-edit-eyebrow">MY ACCOUNT</span>
                <h1>Edit profile</h1>
                <p>Keep your booking contact information accurate.</p>
              </div>
            </div>

            {loading ? (
              <div className="customer-edit-state">Loading your profile…</div>
            ) : (
              <form onSubmit={submit} className="customer-edit-form">
                <label>
                  Full name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                  <small>
                    Changing your email resets its verified status until it is verified again.
                  </small>
                </label>

                <label>
                  Mobile number
                  <input value={mobile} readOnly />
                  <small>
                    Mobile number changes continue through the verified phone/OTP flow.
                  </small>
                </label>

                {error && <div className="customer-edit-error">{error}</div>}

                {saved && (
                  <div className="customer-edit-success">
                    <IonIcon icon={checkmarkCircleOutline} />
                    Profile updated successfully.
                  </div>
                )}

                <div className="customer-edit-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => history.replace('/profile')}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
}