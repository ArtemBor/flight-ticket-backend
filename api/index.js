const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Дополнительные настройки для CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/tickets/:id', (req, res) => {
  const { id } = req.params;
  const ticket = tickets.find(ticket => ticket.id === parseInt(id, 10));

  if (ticket) {
    res.json({ data: ticket });
  } else {
    res.json({ data: null })
  }
});

// Генерация списка билетов
const generateTickets = (count) => {
  const cities = ['Moscow', 'Berlin', 'Paris', 'Warsaw', 'London', 'Rome'];
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const stops = Math.floor(Math.random() * 4);  // 0, 1, 2, или 3 остановки
    const price = Math.floor(50 + Math.random() * 500);
    const departureTime = new Date(Date.now() + Math.random() * 86400000);
    const startCity = cities[Math.floor(Math.random() * cities.length)];
    const endCity = cities.filter(city => city !== startCity)[Math.floor(Math.random() * (cities.length - 1))];
    const classType = Math.random() > 0.5 ? 'economy' : 'business';
    const baggageLimit = classType === 'economy' ? Math.floor(15 + Math.random() * 9) : Math.floor(25 + Math.random() * 16);
    const routes = [];
    let currentTime = new Date(departureTime);
    for (let j = 0; j <= stops; j++) {
      const departure = new Date(currentTime);
      const arrival = new Date(currentTime.setMinutes(currentTime.getMinutes() + Math.floor(60 + Math.random() * 180)));
      const transferCount = Math.min(Math.floor(Math.random() * 4), 3);  // До 3 пересадок
      const transfers = [];
      if (transferCount > 0) {
        const potentialTransfers = cities.filter(city => city !== startCity && city !== endCity);
        for (let k = 0; k < transferCount; k++) {
          const transferCity = potentialTransfers[Math.floor(Math.random() * potentialTransfers.length)];
          if (!transfers.includes(transferCity)) {
            transfers.push(transferCity);
          }
        }
      }
      routes.push({
        from: startCity,
        to: endCity,
        departure: departure.toISOString(),
        arrival: arrival.toISOString(),
        transfers,
      });
      currentTime = arrival;
    }
    tickets.push({
      id: i + 1,
      price,
      class: classType,
      baggage: { maxWeightKg: baggageLimit },
      routes,
    });
  }
  return tickets;
};

const tickets = generateTickets(100);

app.get('/tickets', (req, res) => {
  let result = [...tickets];
  const { stops_0, stops_1, stops_2, stops_3, stops_all, sortBy, page, limit } = req.query;

  // Если передан флаг stops_all, то возвращаем все билеты, не фильтруя по количеству остановок
  if (stops_all === 'true') {
    // Не применяем фильтрацию по остановкам
  } else {
    // Фильтрация по количеству остановок
    result = result.filter(ticket => {
      const stopsCount = ticket.routes.reduce((count, route) => count + route.transfers.length, 0);

      const hasZeroStops = stops_0 === 'true' && stopsCount === 0;
      const hasOneStop = stops_1 === 'true' && stopsCount === 1;
      const hasTwoStops = stops_2 === 'true' && stopsCount === 2;
      const hasThreeStops = stops_3 === 'true' && stopsCount === 3;

      return hasZeroStops || hasOneStop || hasTwoStops || hasThreeStops;
    });
  }

  // Сортировка по цене
  if (sortBy === 'price') {
    result.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'duration') {
    result.sort((a, b) => {
      const totalDurationA = a.routes.reduce((sum, route) => sum + (new Date(route.arrival) - new Date(route.departure)), 0);
      const totalDurationB = b.routes.reduce((sum, route) => sum + (new Date(route.arrival) - new Date(route.departure)), 0);
      return totalDurationA - totalDurationB;
    });
  }

  // Пагинация
  if (page !== undefined && limit !== undefined) {
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const startIndex = (pageInt - 1) * limitInt;
    const endIndex = startIndex + limitInt;
    result = result.slice(startIndex, endIndex);
    res.json({
      page: pageInt,
      limit: limitInt,
      totalItems: tickets.length,
      totalPages: Math.ceil(tickets.length / limitInt),
      data: result,
    });
    return;
  }

  res.json({
    totalItems: result.length,
    data: result,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
