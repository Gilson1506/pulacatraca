import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventPage from './pages/EventPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import CheckInPage from './pages/CheckInPage';
import OrganizerRegisterPage from './pages/OrganizerRegisterPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import TicketPage from './pages/TicketPage';

const AppRoutes = () => {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/profile') || location.pathname.startsWith('/organizer-dashboard') || location.pathname.startsWith('/ingresso');
  const hideHeader = location.pathname.startsWith('/event/') || location.pathname.startsWith('/ingresso');

  return (
    <div className="flex flex-col min-h-screen">
      {!hideHeader && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/event/:id" element={<EventPage />} />
          <Route path="/ingresso/:ticketId" element={<TicketPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/profile/*" element={<ProfilePage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/organizer-register" element={<OrganizerRegisterPage />} />
          <Route path="/organizer-dashboard/*" element={<OrganizerDashboardPage />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default AppRoutes; 