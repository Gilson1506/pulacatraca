import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Share2, Heart, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const EventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Mock event data
  const event = {
    id: id || '1',
    title: 'O Embaixador Classic',
    description: 'Uma noite inesquecível com o melhor da música brasileira. O Embaixador Classic traz um show único com sucessos que marcaram gerações.',
    date: '2025-08-15',
    time: '20:00',
    location: 'Arena Goiânia',
    address: 'Av. Deputado Jamel Cecílio, 2690 - Jardim Goiás, Goiânia - GO',
    city: 'Goiânia',
    state: 'GO',
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    category: 'Show',
    rating: 4.8,
    reviews: 245,
    organizer: 'Produtora Eventos',
    tickets: [
      { id: 'pista', name: 'Pista', price: 80.00, available: 150 },
      { id: 'camarote', name: 'Camarote', price: 150.00, available: 50 },
      { id: 'vip', name: 'VIP', price: 250.00, available: 20 }
    ]
  };

  const handleAddToCart = () => {
    if (!selectedTicket) {
      alert('Por favor, selecione um tipo de ingresso');
      return;
    }

    const ticket = event.tickets.find(t => t.id === selectedTicket);
    if (!ticket) return;

    addToCart({
      eventId: event.id,
      eventName: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      ticketType: ticket.name,
      price: ticket.price,
      quantity: quantity,
      eventImage: event.image
    });

    navigate('/checkout');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-black to-transparent">
        <img
          src={event.image}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative container mx-auto px-4 h-full flex items-end pb-8">
          <div className="text-white">
            <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
              {event.category}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{event.title}</h1>
            <div className="flex items-center space-x-4 text-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>{event.city}/{event.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">Sobre o evento</h2>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">Localização</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold">{event.location}</span>
                </div>
                <p className="text-gray-600 ml-7">{event.address}</p>
              </div>
            </div>

            {/* Organizer */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">Organizador</h2>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{event.organizer}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{event.rating}</span>
                    <span>({event.reviews} avaliações)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Purchase */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Ingressos</h2>
              
              {/* Ticket Types */}
              <div className="space-y-4 mb-6">
                {event.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTicket === ticket.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{ticket.name}</h3>
                        <p className="text-sm text-gray-500">{ticket.available} disponíveis</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {ticket.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              {selectedTicket && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-xl text-pink-600">
                      R$ {(event.tickets.find(t => t.id === selectedTicket)?.price || 0) * quantity}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedTicket}
                  className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Comprar ingressos
                </button>
                
                <div className="flex space-x-2">
                  <button className="flex-1 py-2 border border-gray-300 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors">
                    <Heart className="h-4 w-4" />
                    <span>Favoritar</span>
                  </button>
                  <button className="flex-1 py-2 border border-gray-300 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span>Compartilhar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;