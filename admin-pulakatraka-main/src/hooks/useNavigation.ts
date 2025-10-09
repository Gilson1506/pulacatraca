import { useState, useEffect } from 'react';

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = (page: string) => {
    // Add smooth transition effect
    document.body.style.opacity = '0.95';
    setTimeout(() => {
      document.body.style.opacity = '1';
    }, 150);
    
    setCurrentPage(page);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return {
    currentPage,
    sidebarOpen,
    setSidebarOpen,
    navigateTo
  };
}