import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventPage from './pages/EventPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import CheckInPage from './pages/CheckInPage';
import Footer from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import OrganizerRegisterPage from './pages/OrganizerRegisterPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/event/:id" element={<EventPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/checkin" element={<CheckInPage />} />
              <Route path="/organizer-register" element={<OrganizerRegisterPage />} />
              <Route path="/organizer-dashboard/*" element={<OrganizerDashboardPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;